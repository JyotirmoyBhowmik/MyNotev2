import { create } from 'zustand';
import { db, type Block, type Page } from '../lib/db';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { v4 as uuidv4 } from 'uuid';

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

export const useGraphStore = create<GraphState>((set, get) => ({
  pages: {},
  blocks: {},
  activePageId: null,
  loading: true,

  loadGraph: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    try {
      const { data: cloudPages } = await supabase.from('pages').select('*').eq('user_id', user.id);
      const { data: cloudBlocks } = await supabase.from('blocks').select('*').eq('user_id', user.id);

      if (cloudPages && cloudBlocks) {
        await db.transaction('rw', db.pages, db.blocks, async () => {
          await db.pages.clear();
          await db.blocks.clear();
          await db.pages.bulkAdd(cloudPages);
          await db.blocks.bulkAdd(cloudBlocks);
        });
      }
    } catch (e) {
      console.error("Cloud sync failed, loading from local cache", e);
    }

    const allPages = await db.pages.toArray();
    const allBlocks = await db.blocks.toArray();

    const pagesRecord = allPages.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
    const blocksRecord = allBlocks.reduce((acc, b) => ({ ...acc, [b.uuid]: b }), {});

    set({ pages: pagesRecord, blocks: blocksRecord, loading: false });
  },

  createPage: async (title, type = 'normal') => {
    const user = useAuthStore.getState().user;
    const newPage: Page = {
      id: uuidv4(),
      user_id: user?.id || '',
      title,
      type,
      root_blocks: [],
      created_at: Date.now(),
      updated_at: Date.now()
    };
    await db.pages.add(newPage);
    await supabase.from('pages').insert(newPage);

    set(state => ({
      pages: { ...state.pages, [newPage.id]: newPage }
    }));
    return newPage;
  },

  setActivePage: (id) => {
    set({ activePageId: id });
  },

  addBlock: async (pageId, parentId, index, content = '') => {
    const user = useAuthStore.getState().user;
    const newBlock: Block = {
      uuid: uuidv4(),
      user_id: user?.id || '',
      content,
      parent_id: parentId,
      children: [],
      page_id: pageId,
      properties: {},
      created_at: Date.now(),
      updated_at: Date.now()
    };

    let parentUpdatePromise;
    let pageUpdatePromise;

    await db.transaction('rw', db.pages, db.blocks, async () => {
      await db.blocks.add(newBlock);
      
      if (parentId) {
        const parent = await db.blocks.get(parentId);
        if (parent) {
          parent.children.splice(index, 0, newBlock.uuid);
          parent.updated_at = Date.now();
          await db.blocks.put(parent);
          parentUpdatePromise = supabase.from('blocks').update({ children: parent.children, updated_at: parent.updated_at }).eq('uuid', parent.uuid);
        }
      } else {
        const page = await db.pages.get(pageId);
        if (page) {
          page.root_blocks.splice(index, 0, newBlock.uuid);
          page.updated_at = Date.now();
          await db.pages.put(page);
          pageUpdatePromise = supabase.from('pages').update({ root_blocks: page.root_blocks, updated_at: page.updated_at }).eq('id', page.id);
        }
      }
    });

    // Cloud sync
    await supabase.from('blocks').insert(newBlock);
    if (parentUpdatePromise) await parentUpdatePromise;
    if (pageUpdatePromise) await pageUpdatePromise;

    set(state => {
      const nextBlocks = { ...state.blocks, [newBlock.uuid]: newBlock };
      const nextPages = { ...state.pages };

      if (parentId) {
        const parent = nextBlocks[parentId];
        nextBlocks[parentId] = {
          ...parent,
          children: [...parent.children.slice(0, index), newBlock.uuid, ...parent.children.slice(index)]
        };
      } else {
        const page = nextPages[pageId];
        nextPages[pageId] = {
          ...page,
          root_blocks: [...page.root_blocks.slice(0, index), newBlock.uuid, ...page.root_blocks.slice(index)]
        };
      }
      return { blocks: nextBlocks, pages: nextPages };
    });

    return newBlock;
  },

  updateBlock: async (uuid, content) => {
    const block = get().blocks[uuid];
    if (!block) return;
    
    const updated = { ...block, content, updated_at: Date.now() };
    await db.blocks.put(updated);
    await supabase.from('blocks').update({ content, updated_at: updated.updated_at }).eq('uuid', uuid);
    
    set(state => ({
      blocks: { ...state.blocks, [uuid]: updated }
    }));
  },

  deleteBlock: async (uuid) => {
    const { blocks, activePageId } = get();
    const block = blocks[uuid];
    if (!block) return;

    const idsToDelete: string[] = [];
    let parentUpdatePromise;
    let pageUpdatePromise;

    await db.transaction('rw', db.pages, db.blocks, async () => {
      const deleteRecursive = async (id: string) => {
        const b = blocks[id];
        if (!b) return;
        for (const childId of b.children) {
          await deleteRecursive(childId);
        }
        idsToDelete.push(id);
        await db.blocks.delete(id);
      };
      
      await deleteRecursive(uuid);

      if (block.parent_id) {
        const parent = await db.blocks.get(block.parent_id);
        if (parent) {
          parent.children = parent.children.filter(c => c !== uuid);
          await db.blocks.put(parent);
          parentUpdatePromise = supabase.from('blocks').update({ children: parent.children }).eq('uuid', parent.uuid);
        }
      } else if (activePageId) {
        const page = await db.pages.get(activePageId);
        if (page) {
          page.root_blocks = page.root_blocks.filter(c => c !== uuid);
          await db.pages.put(page);
          pageUpdatePromise = supabase.from('pages').update({ root_blocks: page.root_blocks }).eq('id', page.id);
        }
      }
    });

    // Cloud sync
    if (idsToDelete.length > 0) {
      await supabase.from('blocks').delete().in('uuid', idsToDelete);
    }
    if (parentUpdatePromise) await parentUpdatePromise;
    if (pageUpdatePromise) await pageUpdatePromise;

    set(state => {
      const nextBlocks = { ...state.blocks };
      const nextPages = { ...state.pages };

      const removeRecursiveState = (id: string) => {
        const b = nextBlocks[id];
        if (b) {
          b.children.forEach(removeRecursiveState);
          delete nextBlocks[id];
        }
      };

      if (block.parent_id && nextBlocks[block.parent_id]) {
         nextBlocks[block.parent_id] = {
           ...nextBlocks[block.parent_id],
           children: nextBlocks[block.parent_id].children.filter(c => c !== uuid)
         };
      } else if (activePageId && nextPages[activePageId]) {
         nextPages[activePageId] = {
           ...nextPages[activePageId],
           root_blocks: nextPages[activePageId].root_blocks.filter(c => c !== uuid)
         };
      }
      
      removeRecursiveState(uuid);

      return { blocks: nextBlocks, pages: nextPages };
    });
  },

  moveBlock: async (_uuid, _newParentId, _newIndex) => {
      // Stub
  },
  
  indentBlock: async (uuid) => {
      const { blocks, pages } = get();
      const block = blocks[uuid];
      if (!block) return;
      
      const parentArray = block.parent_id ? blocks[block.parent_id].children : pages[block.page_id].root_blocks;
      const index = parentArray.indexOf(uuid);
      if (index === 0) return; // Cannot indent first child
      
      const previousSiblingId = parentArray[index - 1];
      const previousSibling = blocks[previousSiblingId];
      if (!previousSibling) return;
      
      const syncPromises: any[] = [];

      await db.transaction('rw', db.pages, db.blocks, async () => {
          if (block.parent_id) {
              const oldParent = await db.blocks.get(block.parent_id);
              if (oldParent) {
                  oldParent.children = oldParent.children.filter(id => id !== uuid);
                  await db.blocks.put(oldParent);
                  syncPromises.push(supabase.from('blocks').update({ children: oldParent.children }).eq('uuid', oldParent.uuid));
              }
          } else {
              const oldPage = await db.pages.get(block.page_id);
              if (oldPage) {
                  oldPage.root_blocks = oldPage.root_blocks.filter(id => id !== uuid);
                  await db.pages.put(oldPage);
                  syncPromises.push(supabase.from('pages').update({ root_blocks: oldPage.root_blocks }).eq('id', oldPage.id));
              }
          }
          
          previousSibling.children.push(uuid);
          await db.blocks.put(previousSibling);
          syncPromises.push(supabase.from('blocks').update({ children: previousSibling.children }).eq('uuid', previousSibling.uuid));
          
          block.parent_id = previousSiblingId;
          await db.blocks.put(block);
          syncPromises.push(supabase.from('blocks').update({ parent_id: previousSiblingId }).eq('uuid', block.uuid));
      });
      
      await Promise.all(syncPromises);
      get().loadGraph();
  },
  
  outdentBlock: async (uuid) => {
      const { blocks } = get();
      const block = blocks[uuid];
      if (!block || !block.parent_id) return;
      
      const currentParent = blocks[block.parent_id];
      const grandParentId = currentParent.parent_id;
      
      const indexInParent = currentParent.children.indexOf(uuid);
      const followingSiblings = currentParent.children.slice(indexInParent + 1);
      
      const syncPromises: any[] = [];

      await db.transaction('rw', db.pages, db.blocks, async () => {
          currentParent.children = currentParent.children.slice(0, indexInParent);
          await db.blocks.put(currentParent);
          syncPromises.push(supabase.from('blocks').update({ children: currentParent.children }).eq('uuid', currentParent.uuid));
          
          block.children = [...block.children, ...followingSiblings];
          
          for (const sibId of followingSiblings) {
              const sib = await db.blocks.get(sibId);
              if (sib) {
                  sib.parent_id = uuid;
                  await db.blocks.put(sib);
                  syncPromises.push(supabase.from('blocks').update({ parent_id: uuid }).eq('uuid', sib.uuid));
              }
          }
          
          block.parent_id = grandParentId;
          await db.blocks.put(block);
          syncPromises.push(supabase.from('blocks').update({ parent_id: grandParentId, children: block.children }).eq('uuid', block.uuid));
          
          if (grandParentId) {
              const grandParent = await db.blocks.get(grandParentId);
              if (grandParent) {
                  const parentIndexInGrandparent = grandParent.children.indexOf(currentParent.uuid);
                  grandParent.children.splice(parentIndexInGrandparent + 1, 0, uuid);
                  await db.blocks.put(grandParent);
                  syncPromises.push(supabase.from('blocks').update({ children: grandParent.children }).eq('uuid', grandParent.uuid));
              }
          } else {
              const page = await db.pages.get(block.page_id);
              if (page) {
                  const parentIndexInPage = page.root_blocks.indexOf(currentParent.uuid);
                  page.root_blocks.splice(parentIndexInPage + 1, 0, uuid);
                  await db.pages.put(page);
                  syncPromises.push(supabase.from('pages').update({ root_blocks: page.root_blocks }).eq('id', page.id));
              }
          }
      });
      
      await Promise.all(syncPromises);
      get().loadGraph();
  }
}));
