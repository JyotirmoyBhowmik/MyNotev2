import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Block {
  uuid: string;
  user_id: string;
  page_id: string;
  parent_id: string | null;
  content: string;
  children: string[];
  properties: Record<string, any>;
  created_at: number;
  updated_at: number;
}

export interface Page {
  id: string;
  user_id: string;
  title: string;
  type: 'normal' | 'journal';
  root_blocks: string[];
  created_at: number;
  updated_at: number;
}

interface GraphState {
  pages: Record<string, Page>;
  blocks: Record<string, Block>;
  activePageId: string | null;
  loading: boolean;
  loadGraph: () => Promise<void>;
  createPage: (title: string, type?: 'normal' | 'journal') => Promise<Page>;
  setActivePage: (id: string) => void;
  addBlock: (pageId: string, parentId: string | null, index: number, content?: string) => Promise<Block>;
  updateBlock: (uuid: string, content: string) => Promise<void>;
  deleteBlock: (uuid: string) => Promise<void>;
  moveBlock: (uuid: string, newParentId: string | null, newIndex: number) => Promise<void>;
  indentBlock: (uuid: string) => Promise<void>;
  outdentBlock: (uuid: string) => Promise<void>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGraphStore = create<GraphState>((set, get) => ({
  pages: {},
  blocks: {},
  activePageId: null,
  loading: true,

  // ── Load all data directly from Supabase (primary DB) ─────────────────────
  loadGraph: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const [{ data: cloudPages, error: pagesErr }, { data: cloudBlocks, error: blocksErr }] = await Promise.all([
      supabase.from('pages').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('blocks').select('*').eq('user_id', user.id),
    ]);

    if (pagesErr) console.error('loadGraph pages error', pagesErr);
    if (blocksErr) console.error('loadGraph blocks error', blocksErr);

    const pagesRecord = (cloudPages ?? []).reduce<Record<string, Page>>((acc, p) => ({ ...acc, [p.id]: p }), {});
    const blocksRecord = (cloudBlocks ?? []).reduce<Record<string, Block>>((acc, b) => ({ ...acc, [b.uuid]: b }), {});

    set({ pages: pagesRecord, blocks: blocksRecord, loading: false });
  },

  // ── Create a page ──────────────────────────────────────────────────────────
  createPage: async (title, type = 'normal') => {
    const user = useAuthStore.getState().user;
    const newPage: Page = {
      id: uuidv4(),
      user_id: user!.id,
      title,
      type,
      root_blocks: [],
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    const { error } = await supabase.from('pages').insert(newPage);
    if (error) throw new Error(`createPage: ${error.message}`);

    set(state => ({ pages: { ...state.pages, [newPage.id]: newPage } }));
    return newPage;
  },

  setActivePage: (id) => set({ activePageId: id }),

  // ── Add a block ────────────────────────────────────────────────────────────
  addBlock: async (pageId, parentId, index, content = '') => {
    const user = useAuthStore.getState().user;
    const newBlock: Block = {
      uuid: uuidv4(),
      user_id: user!.id,
      page_id: pageId,
      parent_id: parentId,
      content,
      children: [],
      properties: {},
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    // 1. Insert new block
    const { error: insertErr } = await supabase.from('blocks').insert(newBlock);
    if (insertErr) throw new Error(`addBlock insert: ${insertErr.message}`);

    // 2. Update parent or page root_blocks
    if (parentId) {
      const parent = get().blocks[parentId];
      if (parent) {
        const updatedChildren = [...parent.children.slice(0, index), newBlock.uuid, ...parent.children.slice(index)];
        await supabase.from('blocks').update({ children: updatedChildren, updated_at: Date.now() }).eq('uuid', parentId);
        set(state => ({
          blocks: { ...state.blocks, [parentId]: { ...parent, children: updatedChildren } }
        }));
      }
    } else {
      const page = get().pages[pageId];
      if (page) {
        const updatedRootBlocks = [...page.root_blocks.slice(0, index), newBlock.uuid, ...page.root_blocks.slice(index)];
        await supabase.from('pages').update({ root_blocks: updatedRootBlocks, updated_at: Date.now() }).eq('id', pageId);
        set(state => ({
          pages: { ...state.pages, [pageId]: { ...page, root_blocks: updatedRootBlocks } }
        }));
      }
    }

    set(state => ({ blocks: { ...state.blocks, [newBlock.uuid]: newBlock } }));
    return newBlock;
  },

  // ── Update block content ───────────────────────────────────────────────────
  updateBlock: async (uuid, content) => {
    const block = get().blocks[uuid];
    if (!block) return;
    const updated_at = Date.now();
    await supabase.from('blocks').update({ content, updated_at }).eq('uuid', uuid);
    set(state => ({ blocks: { ...state.blocks, [uuid]: { ...block, content, updated_at } } }));
  },

  // ── Delete a block (recursive) ─────────────────────────────────────────────
  deleteBlock: async (uuid) => {
    const { blocks, activePageId } = get();
    const block = blocks[uuid];
    if (!block) return;

    // Collect all descendant UUIDs
    const idsToDelete: string[] = [];
    const collect = (id: string) => {
      const b = blocks[id];
      if (!b) return;
      b.children.forEach(collect);
      idsToDelete.push(id);
    };
    collect(uuid);

    await supabase.from('blocks').delete().in('uuid', idsToDelete);

    // Remove from parent children list or page root_blocks
    if (block.parent_id && blocks[block.parent_id]) {
      const parent = blocks[block.parent_id];
      const updatedChildren = parent.children.filter(c => c !== uuid);
      await supabase.from('blocks').update({ children: updatedChildren }).eq('uuid', block.parent_id);
      set(state => ({
        blocks: { ...state.blocks, [block.parent_id!]: { ...parent, children: updatedChildren } }
      }));
    } else if (activePageId) {
      const page = get().pages[activePageId];
      if (page) {
        const updatedRootBlocks = page.root_blocks.filter(c => c !== uuid);
        await supabase.from('pages').update({ root_blocks: updatedRootBlocks }).eq('id', activePageId);
        set(state => ({
          pages: { ...state.pages, [activePageId]: { ...page, root_blocks: updatedRootBlocks } }
        }));
      }
    }

    // Remove from local state
    set(state => {
      const nextBlocks = { ...state.blocks };
      idsToDelete.forEach(id => delete nextBlocks[id]);
      return { blocks: nextBlocks };
    });
  },

  moveBlock: async (_uuid, _newParentId, _newIndex) => { /* stub */ },

  // ── Indent block (Tab) ─────────────────────────────────────────────────────
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

    // Remove from current parent
    const newParentArray = parentArray.filter(id => id !== uuid);
    if (block.parent_id) {
      await supabase.from('blocks').update({ children: newParentArray }).eq('uuid', block.parent_id);
      set(state => ({ blocks: { ...state.blocks, [block.parent_id!]: { ...blocks[block.parent_id!], children: newParentArray } } }));
    } else {
      await supabase.from('pages').update({ root_blocks: newParentArray }).eq('id', block.page_id);
      set(state => ({ pages: { ...state.pages, [block.page_id]: { ...pages[block.page_id], root_blocks: newParentArray } } }));
    }

    // Add as last child of previous sibling
    const updatedSiblingChildren = [...prevSibling.children, uuid];
    await supabase.from('blocks').update({ children: updatedSiblingChildren }).eq('uuid', prevSiblingId);
    await supabase.from('blocks').update({ parent_id: prevSiblingId }).eq('uuid', uuid);

    set(state => ({
      blocks: {
        ...state.blocks,
        [prevSiblingId]: { ...prevSibling, children: updatedSiblingChildren },
        [uuid]: { ...block, parent_id: prevSiblingId },
      }
    }));
  },

  // ── Outdent block (Shift+Tab) ──────────────────────────────────────────────
  outdentBlock: async (uuid) => {
    const { blocks, pages } = get();
    const block = blocks[uuid];
    if (!block || !block.parent_id) return;

    const currentParent = blocks[block.parent_id];
    const grandParentId = currentParent.parent_id;
    const indexInParent = currentParent.children.indexOf(uuid);
    const followingSiblings = currentParent.children.slice(indexInParent + 1);

    // 1. Remove block and following siblings from current parent
    const updatedParentChildren = currentParent.children.slice(0, indexInParent);
    await supabase.from('blocks').update({ children: updatedParentChildren }).eq('uuid', currentParent.uuid);

    // 2. Following siblings become children of block
    const updatedBlockChildren = [...block.children, ...followingSiblings];
    await supabase.from('blocks').update({ children: updatedBlockChildren, parent_id: grandParentId }).eq('uuid', uuid);

    // 3. Update parent_id of following siblings
    if (followingSiblings.length > 0) {
      await supabase.from('blocks').update({ parent_id: uuid }).in('uuid', followingSiblings);
    }

    // 4. Add block after its current parent in the grandparent
    if (grandParentId) {
      const grandParent = blocks[grandParentId];
      const parentIndexInGP = grandParent.children.indexOf(currentParent.uuid);
      const updatedGPChildren = [
        ...grandParent.children.slice(0, parentIndexInGP + 1),
        uuid,
        ...grandParent.children.slice(parentIndexInGP + 1),
      ];
      await supabase.from('blocks').update({ children: updatedGPChildren }).eq('uuid', grandParentId);
      set(state => ({
        blocks: { ...state.blocks, [grandParentId]: { ...grandParent, children: updatedGPChildren } }
      }));
    } else {
      const page = pages[block.page_id];
      const parentIndexInPage = page.root_blocks.indexOf(currentParent.uuid);
      const updatedRootBlocks = [
        ...page.root_blocks.slice(0, parentIndexInPage + 1),
        uuid,
        ...page.root_blocks.slice(parentIndexInPage + 1),
      ];
      await supabase.from('pages').update({ root_blocks: updatedRootBlocks }).eq('id', block.page_id);
      set(state => ({
        pages: { ...state.pages, [block.page_id]: { ...page, root_blocks: updatedRootBlocks } }
      }));
    }

    // 5. Local state update
    set(state => ({
      blocks: {
        ...state.blocks,
        [currentParent.uuid]: { ...currentParent, children: updatedParentChildren },
        [uuid]: { ...block, parent_id: grandParentId, children: updatedBlockChildren },
        ...Object.fromEntries(followingSiblings.map(id => [id, { ...blocks[id], parent_id: uuid }])),
      }
    }));
  },
}));
