import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { useLinkStore } from './linkStore';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BlockType =
  | 'text' | 'heading1' | 'heading2' | 'heading3'
  | 'bullet' | 'numbered' | 'toggle' | 'code'
  | 'quote' | 'callout' | 'divider' | 'image' | 'file' | 'nexus_html' | 'database';

export interface Block {
  uuid: string;
  user_id: string;
  page_id: string;
  parent_id: string | null;
  content: string;
  children: string[];
  properties: Record<string, any>;
  block_type: BlockType;
  is_collapsed: boolean;
  created_at: number;
  updated_at: number;
  _local_ts?: number; 
  deleted_at: number | null;
}

export interface Page {
  id: string;
  user_id: string;
  title: string;
  type: 'normal' | 'journal' | 'folder' | 'kanban';
  root_blocks: string[];
  is_favorite: boolean;
  parent_page_id: string | null;
  tags: string[];
  icon: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;

}

interface GraphState {
  pages: Record<string, Page>;
  blocks: Record<string, Block>;
  activePageId: string | null;
  loading: boolean;
  nexusBlockCache: Record<string, string>; 
  saveLocks: Record<string, boolean>; 
  pendingSaves: Record<string, string | null>; 
  trash: { pages: Record<string, Page>; blocks: Record<string, Block> };
  setLoading: (loading: boolean) => void;

  // Core
  loadGraph: () => Promise<void>;
  setActivePage: (id: string) => void;

  // Pages
  createPage: (title: string, type?: 'normal' | 'journal' | 'folder' | 'kanban', parentId?: string | null) => Promise<Page>;
  createFolder: (title: string, parentId?: string | null) => Promise<Page>;
  deletePage: (id: string) => Promise<void>;
  renamePage: (id: string, title: string) => Promise<void>;
  favoritePage: (id: string, val: boolean) => Promise<void>;
  updatePageIcon: (id: string, icon: string) => Promise<void>;
  createDailyPage: () => Promise<Page>;
  movePage: (id: string, newParentId: string | null) => Promise<void>;
  reorderPage: (id: string, newOrder: number) => Promise<void>;
  restorePage: (id: string) => Promise<void>;
  permanentlyDeletePage: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;

  // Blocks
  addBlock: (pageId: string, parentId: string | null, index: number, content?: string, type?: BlockType) => Promise<Block>;
  updateBlock: (uuid: string, content: string) => Promise<void>;
  updateBlockType: (uuid: string, type: BlockType) => Promise<void>;
  updateBlockProperties: (uuid: string, properties: Record<string, any>) => Promise<void>;
  deleteBlock: (uuid: string) => Promise<void>;
  moveBlock: (uuid: string, newParentId: string | null, newIndex: number) => Promise<void>;
  indentBlock: (uuid: string) => Promise<void>;
  outdentBlock: (uuid: string) => Promise<void>;
  toggleCollapse: (uuid: string) => Promise<void>;
  duplicateBlock: (uuid: string) => Promise<Block | null>;
  // Nexus Editor
  savePageContent: (pageId: string, html: string) => Promise<void>;
  updatePageContent: (pageId: string, content: string) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGraphStore = create<GraphState>((set, get) => ({
  pages: {},
  blocks: {},
  activePageId: null,
  loading: true,
  nexusBlockCache: {},
  saveLocks: {},
  pendingSaves: {},
  trash: { pages: {}, blocks: {} },
  setLoading: (loading) => set({ loading }),

  loadGraph: async () => {
    if (get().loading && Object.keys(get().pages).length > 0) return; // Already loading
    
    console.log('[GraphStore] loadGraph v2.6 init (BUILD SUCCESS)');
    const user = useAuthStore.getState().user;
    if (!user) return;
    set({ loading: true });

    const [{ data: cloudPages, error: pErr }, { data: cloudBlocks, error: bErr }] = await Promise.all([
      supabase.from('pages').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('blocks').select('*').eq('user_id', user.id).limit(5000),
    ]);

    if (pErr) console.error('loadGraph pages', pErr);
    if (bErr) console.error('loadGraph blocks', bErr);
    
    if (cloudBlocks) console.log(`Loaded ${cloudBlocks.length} blocks`);

    const pages: Record<string, Page> = {};
    const trashPages: Record<string, Page> = {};
    (cloudPages ?? []).forEach(p => {
      const pageData = {
        ...p,
        root_blocks: p.root_blocks ?? [],
        tags: p.tags ?? [],
        is_favorite: p.is_favorite ?? false,
        parent_page_id: p.parent_page_id ?? null,
        icon: p.icon ?? null,
        deleted_at: p.deleted_at ?? null,

      };
      if (pageData.deleted_at) {
        trashPages[p.id] = pageData;
      } else {
        pages[p.id] = pageData;
      }
    });

    const blocks: Record<string, Block> = {};
    const trashBlocks: Record<string, Block> = {};
    (cloudBlocks ?? []).forEach(b => {
      const blockData = {
        ...b,
        children: b.children ?? [],
        properties: b.properties ?? {},
        block_type: b.block_type ?? 'text',
        is_collapsed: b.is_collapsed ?? false,
        deleted_at: b.deleted_at ?? null,
      };
      if (blockData.deleted_at) {
        trashBlocks[b.uuid] = blockData;
      } else {
        blocks[b.uuid] = blockData;
      }
    });

    const nexusBlockCache: Record<string, string> = {};
    Object.values(blocks).forEach(b => {
      if (b.block_type === 'nexus_html') {
        nexusBlockCache[b.page_id] = b.uuid;
      }
    });

    set({ pages, blocks, trash: { pages: trashPages, blocks: trashBlocks }, nexusBlockCache, loading: false });
    useLinkStore.getState().buildIndex(blocks, pages);

    // Realtime: Clean up existing subscription first to avoid "already subscribed" errors
    const oldChannel = supabase.getChannels().find(c => c.topic === 'realtime:graph-sync');
    if (oldChannel) {
      await supabase.removeChannel(oldChannel);
    }

    supabase
      .channel('graph-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocks', filter: `user_id=eq.${user.id}` }, (payload) => {
        const newData = payload.new as Block;
        const oldData = payload.old as { uuid: string };
        
        if (payload.eventType === 'DELETE') {
          set(s => {
            const next = { ...s.blocks };
            delete next[oldData.uuid];
            return { blocks: next };
          });
          return;
        }

        const localBlock = get().blocks[newData.uuid];
        if (localBlock && localBlock._local_ts && localBlock._local_ts >= (newData.updated_at || 0)) {
          console.log('[RealtimeSync] Skipping stale update (Local Wins) for', newData.uuid);
          return;
        }

        set(s => ({
          blocks: {
            ...s.blocks,
            [newData.uuid]: {
              ...newData,
              children: newData.children ?? [],
              properties: newData.properties ?? {},
              block_type: newData.block_type ?? 'text',
              is_collapsed: newData.is_collapsed ?? false,
            }
          }
        }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pages', filter: `user_id=eq.${user.id}` }, (payload) => {
        const newData = payload.new as Page;
        if (payload.eventType === 'DELETE') {
          set(s => {
            const next = { ...s.pages };
            delete next[(payload.old as any).id];
            return { pages: next };
          });
          return;
        }
        set(s => ({
          pages: {
            ...s.pages,
            [newData.id]: {
              ...newData,
              root_blocks: newData.root_blocks ?? [],
              tags: newData.tags ?? [],
              is_favorite: newData.is_favorite ?? false,
              parent_page_id: newData.parent_page_id ?? null,
              icon: newData.icon ?? null,
            }
          }
        }));
      })
      .subscribe();
  },

  setActivePage: (id) => set({ activePageId: id }),

  // Pages
  createPage: async (title, type = 'normal', parentId = null) => {
    const user = useAuthStore.getState().user;
    const newPage: Page = {
      id: uuidv4(), user_id: user!.id, title, type,
      root_blocks: [], is_favorite: false,
      parent_page_id: parentId, tags: [], icon: type === 'folder' ? '📁' : null,
      created_at: Date.now(), updated_at: Date.now(), deleted_at: null,
    };
    const { error } = await supabase.from('pages').insert(newPage);
    if (error) throw new Error(error.message);
    set(s => ({ pages: { ...s.pages, [newPage.id]: newPage } }));
    return newPage;
  },

  createFolder: async (title, parentId = null) => {
    return get().createPage(title, 'folder', parentId);
  },

  reorderPage: async (_id, _newOrder) => {
    // Column missing in DB, skipping
    console.warn('[GraphStore] reorderPage skipped: sort_order column missing in DB');
  },

  deletePage: async (id) => {
    const page = get().pages[id];
    if (!page) return;
    const now = Date.now();
    await supabase.from('pages').update({ deleted_at: now }).eq('id', id);
    
    // Soft delete its blocks as well? Actually, just marking the page as deleted is enough to hide it.
    // But for consistency and "empty trash", it's better to mark them.
    // However, it's slow. Let's just mark the page.
    
    set(s => {
      const pages = { ...s.pages };
      const trashPages = { ...s.trash.pages };
      const deletedPage = { ...pages[id], deleted_at: now };
      delete pages[id];
      trashPages[id] = deletedPage;
      
      return { 
        pages, 
        trash: { ...s.trash, pages: trashPages },
        activePageId: s.activePageId === id ? null : s.activePageId 
      };
    });
  },

  restorePage: async (id) => {
    const page = get().trash.pages[id];
    if (!page) return;
    await supabase.from('pages').update({ deleted_at: null }).eq('id', id);
    set(s => {
      const trashPages = { ...s.trash.pages };
      const pages = { ...s.pages };
      const restoredPage = { ...trashPages[id], deleted_at: null };
      delete trashPages[id];
      pages[id] = restoredPage;
      return { 
        pages, 
        trash: { ...s.trash, pages: trashPages } 
      };
    });
  },

  permanentlyDeletePage: async (id) => {
    // True deletion of page AND its blocks
    await supabase.from('blocks').delete().eq('page_id', id);
    await supabase.from('pages').delete().eq('id', id);
    
    set(s => {
      const pages = { ...s.pages };
      const trashPages = { ...s.trash.pages };
      delete pages[id];
      delete trashPages[id];
      const blocks = { ...s.blocks };
      const trashBlocks = { ...s.trash.blocks };
      Object.keys(blocks).forEach(k => { if (blocks[k].page_id === id) delete blocks[k]; });
      Object.keys(trashBlocks).forEach(k => { if (trashBlocks[k].page_id === id) delete trashBlocks[k]; });
      return { 
        pages, 
        trash: { pages: trashPages, blocks: trashBlocks },
        blocks,
        activePageId: s.activePageId === id ? null : s.activePageId 
      };
    });
  },

  emptyTrash: async () => {
    const { trash } = get();
    const pageIds = Object.keys(trash.pages);
    const blockIds = Object.keys(trash.blocks);
    
    // Also delete blocks belonging to the pages being deleted
    if (pageIds.length > 0) {
      await supabase.from('blocks').delete().in('page_id', pageIds);
      await supabase.from('pages').delete().in('id', pageIds);
    }
    if (blockIds.length > 0) {
      await supabase.from('blocks').delete().in('uuid', blockIds);
    }
    
    set({ trash: { pages: {}, blocks: {} } });
  },

  renamePage: async (id, title) => {
    await supabase.from('pages').update({ title, updated_at: Date.now() }).eq('id', id);
    set(s => ({ pages: { ...s.pages, [id]: { ...s.pages[id], title } } }));
  },

  favoritePage: async (id, val) => {
    await supabase.from('pages').update({ is_favorite: val }).eq('id', id);
    set(s => ({ pages: { ...s.pages, [id]: { ...s.pages[id], is_favorite: val } } }));
  },

  updatePageIcon: async (id, icon) => {
    await supabase.from('pages').update({ icon }).eq('id', id);
    set(s => ({ pages: { ...s.pages, [id]: { ...s.pages[id], icon } } }));
  },

  createDailyPage: async () => {
    const today = format(new Date(), 'MMMM d, yyyy');
    const existing = Object.values(get().pages).find(p => p.title === today && p.type === 'journal');
    if (existing) { get().setActivePage(existing.id); return existing; }
    const page = await get().createPage(today, 'journal');
    get().setActivePage(page.id);
    return page;
  },

  movePage: async (id, newParentId) => {
    if (id === newParentId) return;
    // Basic check to prevent infinite loops (could be deeper but this is a start)
    const page = get().pages[id];
    if (!page) return;

    await supabase.from('pages').update({ parent_page_id: newParentId, updated_at: Date.now() }).eq('id', id);
    set(s => ({ 
      pages: { 
        ...s.pages, 
        [id]: { ...s.pages[id], parent_page_id: newParentId } 
      } 
    }));
  },

  // Blocks
  addBlock: async (pageId, parentId, index, content = '', type = 'text') => {
    const user = useAuthStore.getState().user;
    const newBlock: Block = {
      uuid: uuidv4(), user_id: user!.id, page_id: pageId,
      parent_id: parentId, content, children: [],
      properties: {}, block_type: type, is_collapsed: false,
      created_at: Date.now(), updated_at: Date.now(), deleted_at: null,
    };

    const { error } = await supabase.from('blocks').insert(newBlock);
    if (error) throw new Error(error.message);

    if (parentId) {
      const parent = get().blocks[parentId];
      if (parent) {
        const updatedChildren = [...parent.children.slice(0, index), newBlock.uuid, ...parent.children.slice(index)];
        await supabase.from('blocks').update({ children: updatedChildren, updated_at: Date.now() }).eq('uuid', parentId);
        set(s => ({ blocks: { ...s.blocks, [parentId]: { ...parent, children: updatedChildren } } }));
      }
    } else {
      const page = get().pages[pageId];
      if (page) {
        const updatedRootBlocks = [...page.root_blocks.slice(0, index), newBlock.uuid, ...page.root_blocks.slice(index)];
        await supabase.from('pages').update({ root_blocks: updatedRootBlocks, updated_at: Date.now() }).eq('id', pageId);
        set(s => ({ pages: { ...s.pages, [pageId]: { ...page, root_blocks: updatedRootBlocks } } }));
      }
    }

    set(s => ({ blocks: { ...s.blocks, [newBlock.uuid]: newBlock } }));
    return newBlock;
  },

  updateBlock: async (uuid, content) => {
    const block = get().blocks[uuid];
    if (!block) return;
    const updated_at = Date.now();
    set(s => ({ blocks: { ...s.blocks, [uuid]: { ...block, content, updated_at, _local_ts: updated_at } } }));
    await supabase.from('blocks').update({ content, updated_at }).eq('uuid', uuid);
    const { pages, blocks } = get();
    useLinkStore.getState().buildIndex({ ...blocks, [uuid]: { ...block, content } }, pages);
  },

  updateBlockType: async (uuid, type) => {
    await supabase.from('blocks').update({ block_type: type }).eq('uuid', uuid);
    set(s => ({ blocks: { ...s.blocks, [uuid]: { ...s.blocks[uuid], block_type: type } } }));
  },

  updateBlockProperties: async (uuid, properties) => {
    const block = get().blocks[uuid];
    if (!block) return;
    const newProps = { ...block.properties, ...properties };
    await supabase.from('blocks').update({ properties: newProps, updated_at: Date.now() }).eq('uuid', uuid);
    set(s => ({ blocks: { ...s.blocks, [uuid]: { ...block, properties: newProps } } }));
  },

  deleteBlock: async (uuid) => {
    const { blocks } = get();
    const block = blocks[uuid];
    if (!block) return;

    const idsToSoftDelete: string[] = [];
    const collect = (id: string) => {
      const b = blocks[id];
      if (!b) return;
      b.children.forEach(collect);
      idsToSoftDelete.push(id);
    };
    collect(uuid);

    const now = Date.now();
    await supabase.from('blocks').update({ deleted_at: now }).in('uuid', idsToSoftDelete);

    set(s => {
      const nextBlocks = { ...s.blocks };
      const nextTrashBlocks = { ...s.trash.blocks };
      
      idsToSoftDelete.forEach(id => {
        nextTrashBlocks[id] = { ...nextBlocks[id], deleted_at: now };
        delete nextBlocks[id];
      });

      // Update parent's children array if it's not the page root
      if (block.parent_id && nextBlocks[block.parent_id]) {
        nextBlocks[block.parent_id].children = nextBlocks[block.parent_id].children.filter(c => c !== uuid);
      } else if (s.activePageId && s.pages[s.activePageId]) {
        // It's a root block
        const page = { ...s.pages[s.activePageId] };
        page.root_blocks = page.root_blocks.filter(c => c !== uuid);
        return { 
          blocks: nextBlocks, 
          trash: { ...s.trash, blocks: nextTrashBlocks },
          pages: { ...s.pages, [s.activePageId]: page }
        };
      }

      return { blocks: nextBlocks, trash: { ...s.trash, blocks: nextTrashBlocks } };
    });
  },

  toggleCollapse: async (uuid) => {
    const block = get().blocks[uuid];
    if (!block) return;
    const is_collapsed = !block.is_collapsed;
    await supabase.from('blocks').update({ is_collapsed }).eq('uuid', uuid);
    set(s => ({ blocks: { ...s.blocks, [uuid]: { ...block, is_collapsed } } }));
  },

  duplicateBlock: async (uuid) => {
    const block = get().blocks[uuid];
    if (!block) return null;
    const parentArray = block.parent_id
      ? get().blocks[block.parent_id]?.children
      : get().pages[block.page_id]?.root_blocks;
    const index = (parentArray ?? []).indexOf(uuid);
    return await get().addBlock(block.page_id, block.parent_id, index + 1, block.content, block.block_type);
  },

  moveBlock: async (uuid, newParentId, newIndex) => {
    const { blocks, pages } = get();
    const block = blocks[uuid];
    if (!block) return;

    const oldParentArray = block.parent_id ? blocks[block.parent_id]?.children : pages[block.page_id]?.root_blocks;
    const oldIndex = (oldParentArray ?? []).indexOf(uuid);

    const newOldParentArray = (oldParentArray ?? []).filter(id => id !== uuid);
    if (block.parent_id) {
      await supabase.from('blocks').update({ children: newOldParentArray }).eq('uuid', block.parent_id);
      set(s => ({ blocks: { ...s.blocks, [block.parent_id!]: { ...blocks[block.parent_id!], children: newOldParentArray } } }));
    } else {
      const page = pages[block.page_id];
      await supabase.from('pages').update({ root_blocks: newOldParentArray }).eq('id', block.page_id);
      set(s => ({ pages: { ...s.pages, [block.page_id]: { ...page, root_blocks: newOldParentArray } } }));
    }

    let adjustedIndex = newIndex;
    if (block.parent_id === newParentId && oldIndex < newIndex) adjustedIndex--;

    const newParentArray = newParentId
      ? [...(get().blocks[newParentId]?.children ?? [])]
      : [...(get().pages[block.page_id]?.root_blocks ?? [])];
    newParentArray.splice(adjustedIndex, 0, uuid);

    if (newParentId) {
      await supabase.from('blocks').update({ children: newParentArray, updated_at: Date.now() }).eq('uuid', newParentId);
      await supabase.from('blocks').update({ parent_id: newParentId }).eq('uuid', uuid);
      set(s => ({
        blocks: {
          ...s.blocks,
          [newParentId]: { ...get().blocks[newParentId], children: newParentArray },
          [uuid]: { ...block, parent_id: newParentId },
        }
      }));
    } else {
      const page = get().pages[block.page_id];
      await supabase.from('pages').update({ root_blocks: newParentArray }).eq('id', block.page_id);
      await supabase.from('blocks').update({ parent_id: null }).eq('uuid', uuid);
      set(s => ({
        pages: { ...s.pages, [block.page_id]: { ...page, root_blocks: newParentArray } },
        blocks: { ...s.blocks, [uuid]: { ...block, parent_id: null } },
      }));
    }
  },

  indentBlock: async (uuid) => {
    const { blocks, pages } = get();
    const block = blocks[uuid];
    if (!block) return;

    const parentArray = block.parent_id ? blocks[block.parent_id]?.children : pages[block.page_id]?.root_blocks;
    if (!parentArray) return;
    const index = parentArray.indexOf(uuid);
    if (index === 0) return;

    const prevSiblingId = parentArray[index - 1];
    const prevSibling = blocks[prevSiblingId];
    if (!prevSibling) return;

    const newParentArray = parentArray.filter(id => id !== uuid);
    if (block.parent_id) {
      await supabase.from('blocks').update({ children: newParentArray }).eq('uuid', block.parent_id);
      set(s => ({ blocks: { ...s.blocks, [block.parent_id!]: { ...blocks[block.parent_id!], children: newParentArray } } }));
    } else {
      await supabase.from('pages').update({ root_blocks: newParentArray }).eq('id', block.page_id);
      set(s => ({ pages: { ...s.pages, [block.page_id]: { ...pages[block.page_id], root_blocks: newParentArray } } }));
    }

    const updatedSiblingChildren = [...prevSibling.children, uuid];
    await supabase.from('blocks').update({ children: updatedSiblingChildren }).eq('uuid', prevSiblingId);
    await supabase.from('blocks').update({ parent_id: prevSiblingId }).eq('uuid', uuid);

    set(s => ({
      blocks: {
        ...s.blocks,
        [prevSiblingId]: { ...prevSibling, children: updatedSiblingChildren },
        [uuid]: { ...block, parent_id: prevSiblingId },
      }
    }));
  },

  outdentBlock: async (uuid) => {
    const { blocks, pages } = get();
    const block = blocks[uuid];
    if (!block || !block.parent_id) return;

    const currentParent = blocks[block.parent_id];
    const grandParentId = currentParent.parent_id;
    const indexInParent = currentParent.children.indexOf(uuid);
    const followingSiblings = currentParent.children.slice(indexInParent + 1);

    const updatedParentChildren = currentParent.children.slice(0, indexInParent);
    await supabase.from('blocks').update({ children: updatedParentChildren }).eq('uuid', currentParent.uuid);

    const updatedBlockChildren = [...block.children, ...followingSiblings];
    await supabase.from('blocks').update({ children: updatedBlockChildren, parent_id: grandParentId }).eq('uuid', uuid);

    if (followingSiblings.length > 0) {
      await supabase.from('blocks').update({ parent_id: uuid }).in('uuid', followingSiblings);
    }

    if (grandParentId) {
      const grandParent = blocks[grandParentId];
      const parentIndexInGP = grandParent.children.indexOf(currentParent.uuid);
      const updatedGPChildren = [
        ...grandParent.children.slice(0, parentIndexInGP + 1),
        uuid,
        ...grandParent.children.slice(parentIndexInGP + 1),
      ];
      await supabase.from('blocks').update({ children: updatedGPChildren }).eq('uuid', grandParentId);
      set(s => ({ blocks: { ...s.blocks, [grandParentId]: { ...grandParent, children: updatedGPChildren } } }));
    } else {
      const page = pages[block.page_id];
      const parentIndexInPage = page.root_blocks.indexOf(currentParent.uuid);
      const updatedRootBlocks = [
        ...page.root_blocks.slice(0, parentIndexInPage + 1),
        uuid,
        ...page.root_blocks.slice(parentIndexInPage + 1),
      ];
      await supabase.from('pages').update({ root_blocks: updatedRootBlocks }).eq('id', block.page_id);
      set(s => ({ pages: { ...s.pages, [block.page_id]: { ...page, root_blocks: updatedRootBlocks } } }));
    }

    set(s => ({
      blocks: {
        ...s.blocks,
        [currentParent.uuid]: { ...currentParent, children: updatedParentChildren },
        [uuid]: { ...block, parent_id: grandParentId, children: updatedBlockChildren },
        ...Object.fromEntries(followingSiblings.map(id => [id, { ...blocks[id], parent_id: uuid }])),
      }
    }));
  },

  // ── Nexus Editor: Queued Saving System v2.1 ────────────────────────────────
  savePageContent: async (pageId, html) => {
    if (get().loading) return; // Prevent saving while loading/syncing
    
    const { nexusBlockCache, saveLocks } = get();
    
    if (saveLocks[pageId]) {
      console.log('[NexusSave] Queueing latest content (busy) for', pageId);
      set(s => ({ pendingSaves: { ...s.pendingSaves, [pageId]: html } }));
      return;
    }

    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    set(s => ({ 
      saveLocks: { ...s.saveLocks, [pageId]: true },
      pendingSaves: { ...s.pendingSaves, [pageId]: null }
    }));

    try {
      let blockUuid = nexusBlockCache[pageId];
      if (!blockUuid) {
        const { data: existingDB } = await supabase
          .from('blocks')
          .select('uuid')
          .eq('page_id', pageId)
          .eq('block_type', 'nexus_html' as any)
          .maybeSingle();
        if (existingDB) blockUuid = existingDB.uuid;
      }

      if (blockUuid) {
        const block = get().blocks[blockUuid];
        if (block && block.content === html) {
          console.log('[NexusSave] Content unchanged (v2.1)');
        } else {
          console.log('[NexusSave] Updating block', blockUuid);
          const updated_at = Date.now();
          set(s => ({
            blocks: { ...s.blocks, [blockUuid]: { ...(s.blocks[blockUuid] || block), content: html, updated_at, _local_ts: updated_at } },
            nexusBlockCache: { ...s.nexusBlockCache, [pageId]: blockUuid }
          }));
          await supabase.from('blocks').update({ content: html, updated_at }).eq('uuid', blockUuid);
        }
      } else {
        console.log('[NexusSave] Creating new block');
        const uuid = uuidv4();
        const now = Date.now();
        const newBlock: Block = {
          uuid, page_id: pageId, user_id: userId, parent_id: null,
          content: html, block_type: 'nexus_html', is_collapsed: false,
          children: [], properties: {}, created_at: now, updated_at: now,
          deleted_at: null, _local_ts: now,
        };
        
        // Strip _local_ts before sending to Supabase
        const { _local_ts, ...dbBlock } = newBlock;
        
        set(s => ({
          blocks: { ...s.blocks, [uuid]: newBlock },
          nexusBlockCache: { ...s.nexusBlockCache, [pageId]: uuid },
          pages: {
            ...s.pages,
            [pageId]: { ...s.pages[pageId], root_blocks: [...(s.pages[pageId]?.root_blocks ?? []), uuid] }
          }
        }));
        await supabase.from('blocks').insert(dbBlock);
      }
    } catch (err) {
      console.error('[NexusSave] Failed:', err);
    } finally {
      set(s => ({ saveLocks: { ...s.saveLocks, [pageId]: false } }));
      
      const latestPending = get().pendingSaves[pageId];
      if (latestPending !== null && latestPending !== undefined) {
        console.log('[NexusSave] Running queued save (v2.1)');
        get().savePageContent(pageId, latestPending);
      }
    }
  },

  updatePageContent: (pageId, content) => {
    set(s => {
      const nexusBlock = Object.values(s.blocks).find(
        b => b.page_id === pageId && b.block_type === ('nexus_html' as any)
      );
      if (!nexusBlock) return s;
      return { blocks: { ...s.blocks, [nexusBlock.uuid]: { ...nexusBlock, content, _local_ts: Date.now() } } };
    });
  },
}));
