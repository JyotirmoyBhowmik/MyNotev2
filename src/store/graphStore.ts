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
}

export interface Page {
  id: string;
  user_id: string;
  title: string;
  type: 'normal' | 'journal';
  root_blocks: string[];
  is_favorite: boolean;
  parent_page_id: string | null;
  tags: string[];
  icon: string | null;
  created_at: number;
  updated_at: number;
}

interface GraphState {
  pages: Record<string, Page>;
  blocks: Record<string, Block>;
  activePageId: string | null;
  loading: boolean;

  // Core
  loadGraph: () => Promise<void>;
  setActivePage: (id: string) => void;

  // Pages
  createPage: (title: string, type?: 'normal' | 'journal', parentId?: string | null) => Promise<Page>;
  deletePage: (id: string) => Promise<void>;
  renamePage: (id: string, title: string) => Promise<void>;
  favoritePage: (id: string, val: boolean) => Promise<void>;
  updatePageIcon: (id: string, icon: string) => Promise<void>;
  createDailyPage: () => Promise<Page>;

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
  // Nexus Editor — saves TipTap HTML as page rich content
  savePageContent: (pageId: string, html: string) => Promise<void>;
  updatePageContent: (pageId: string, content: string) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGraphStore = create<GraphState>((set, get) => ({
  pages: {},
  blocks: {},
  activePageId: null,
  loading: true,

  // ── Load all data from Supabase ────────────────────────────────────────────
  loadGraph: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    set({ loading: true });

    const [{ data: cloudPages, error: pErr }, { data: cloudBlocks, error: bErr }] = await Promise.all([
      supabase.from('pages').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('blocks').select('*').eq('user_id', user.id),
    ]);

    if (pErr) console.error('loadGraph pages', pErr);
    if (bErr) console.error('loadGraph blocks', bErr);

    const pages = (cloudPages ?? []).reduce<Record<string, Page>>((acc, p) => ({
      ...acc,
      [p.id]: {
        ...p,
        root_blocks: p.root_blocks ?? [],
        tags: p.tags ?? [],
        is_favorite: p.is_favorite ?? false,
        parent_page_id: p.parent_page_id ?? null,
        icon: p.icon ?? null,
      }
    }), {});

    const blocks = (cloudBlocks ?? []).reduce<Record<string, Block>>((acc, b) => ({
      ...acc,
      [b.uuid]: {
        ...b,
        children: b.children ?? [],
        properties: b.properties ?? {},
        block_type: b.block_type ?? 'text',
        is_collapsed: b.is_collapsed ?? false,
      }
    }), {});

    set({ pages, blocks, loading: false });

    // Build link index
    useLinkStore.getState().buildIndex(blocks, pages);
  },

  setActivePage: (id) => set({ activePageId: id }),

  // ── Pages ──────────────────────────────────────────────────────────────────

  createPage: async (title, type = 'normal', parentId = null) => {
    const user = useAuthStore.getState().user;
    const newPage: Page = {
      id: uuidv4(), user_id: user!.id, title, type,
      root_blocks: [], is_favorite: false,
      parent_page_id: parentId, tags: [], icon: null,
      created_at: Date.now(), updated_at: Date.now(),
    };
    const { error } = await supabase.from('pages').insert(newPage);
    if (error) throw new Error(error.message);
    set(s => ({ pages: { ...s.pages, [newPage.id]: newPage } }));
    return newPage;
  },

  deletePage: async (id) => {
    await supabase.from('pages').delete().eq('id', id);
    set(s => {
      const pages = { ...s.pages };
      delete pages[id];
      const blocks = { ...s.blocks };
      Object.keys(blocks).forEach(k => { if (blocks[k].page_id === id) delete blocks[k]; });
      return { pages, blocks, activePageId: s.activePageId === id ? null : s.activePageId };
    });
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

  // ── Blocks ─────────────────────────────────────────────────────────────────

  addBlock: async (pageId, parentId, index, content = '', type = 'text') => {
    const user = useAuthStore.getState().user;
    const newBlock: Block = {
      uuid: uuidv4(), user_id: user!.id, page_id: pageId,
      parent_id: parentId, content, children: [],
      properties: {}, block_type: type, is_collapsed: false,
      created_at: Date.now(), updated_at: Date.now(),
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
    await supabase.from('blocks').update({ content, updated_at }).eq('uuid', uuid);
    set(s => ({ blocks: { ...s.blocks, [uuid]: { ...block, content, updated_at } } }));
    // Rebuild link index
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
    const { blocks, activePageId } = get();
    const block = blocks[uuid];
    if (!block) return;

    const idsToDelete: string[] = [];
    const collect = (id: string) => {
      const b = blocks[id];
      if (!b) return;
      b.children.forEach(collect);
      idsToDelete.push(id);
    };
    collect(uuid);

    await supabase.from('blocks').delete().in('uuid', idsToDelete);

    if (block.parent_id && blocks[block.parent_id]) {
      const parent = blocks[block.parent_id];
      const updatedChildren = parent.children.filter(c => c !== uuid);
      await supabase.from('blocks').update({ children: updatedChildren }).eq('uuid', block.parent_id);
      set(s => ({ blocks: { ...s.blocks, [block.parent_id!]: { ...parent, children: updatedChildren } } }));
    } else if (activePageId) {
      const page = get().pages[activePageId];
      if (page) {
        const updatedRootBlocks = page.root_blocks.filter(c => c !== uuid);
        await supabase.from('pages').update({ root_blocks: updatedRootBlocks }).eq('id', activePageId);
        set(s => ({ pages: { ...s.pages, [activePageId]: { ...page, root_blocks: updatedRootBlocks } } }));
      }
    }

    set(s => {
      const nextBlocks = { ...s.blocks };
      idsToDelete.forEach(id => delete nextBlocks[id]);
      return { blocks: nextBlocks };
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

    // Remove from old location
    const newOldParentArray = (oldParentArray ?? []).filter(id => id !== uuid);
    if (block.parent_id) {
      await supabase.from('blocks').update({ children: newOldParentArray }).eq('uuid', block.parent_id);
      set(s => ({ blocks: { ...s.blocks, [block.parent_id!]: { ...blocks[block.parent_id!], children: newOldParentArray } } }));
    } else {
      const page = pages[block.page_id];
      await supabase.from('pages').update({ root_blocks: newOldParentArray }).eq('id', block.page_id);
      set(s => ({ pages: { ...s.pages, [block.page_id]: { ...page, root_blocks: newOldParentArray } } }));
    }

    // Adjust index if same parent and moving down
    let adjustedIndex = newIndex;
    if (block.parent_id === newParentId && oldIndex < newIndex) adjustedIndex--;

    // Add to new location
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

  // ── Nexus Editor: save TipTap HTML ─────────────────────────────────────────
  savePageContent: async (pageId, html) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    // 1. Find existing nexus_html block in local state first
    const { blocks } = get();
    const existingLocal = Object.values(blocks).find(
      b => b.page_id === pageId && b.block_type === 'nexus_html'
    );

    if (existingLocal) {
      const updated_at = Date.now();
      // Optimistic update
      set(s => ({
        blocks: { ...s.blocks, [existingLocal.uuid]: { ...existingLocal, content: html, updated_at } }
      }));
      await supabase.from('blocks').update({ content: html, updated_at }).eq('uuid', existingLocal.uuid);
      return;
    }

    // 2. Fallback: check DB if not found locally (unlikely but safe)
    const { data: existingDB } = await supabase
      .from('blocks')
      .select('uuid')
      .eq('page_id', pageId)
      .eq('block_type', 'nexus_html' as any)
      .maybeSingle();

    if (existingDB) {
      const updated_at = Date.now();
      await supabase.from('blocks').update({ content: html, updated_at }).eq('uuid', existingDB.uuid);
      set(s => ({
        blocks: { ...s.blocks, [existingDB.uuid]: { ...s.blocks[existingDB.uuid], content: html, updated_at } }
      }));
    } else {
      // 3. Create new block
      const uuid = uuidv4();
      const now = Date.now();
      const newBlock: Block = {
        uuid, page_id: pageId, user_id: userId, parent_id: null,
        content: html, block_type: 'nexus_html', is_collapsed: false,
        children: [], properties: {}, created_at: now, updated_at: now,
      };
      
      // Update local state immediately
      set(s => ({
        blocks: { ...s.blocks, [uuid]: newBlock },
        pages: {
          ...s.pages,
          [pageId]: { ...s.pages[pageId], root_blocks: [...(s.pages[pageId]?.root_blocks ?? []), uuid] }
        }
      }));
      
      await supabase.from('blocks').insert(newBlock);
    }
  },

  updatePageContent: (pageId, content) => {
    set(s => {
      const nexusBlock = Object.values(s.blocks).find(
        b => b.page_id === pageId && b.block_type === ('nexus_html' as any)
      );
      if (!nexusBlock) return s;
      return { blocks: { ...s.blocks, [nexusBlock.uuid]: { ...nexusBlock, content } } };
    });
  },
}));
