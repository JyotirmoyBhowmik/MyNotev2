import { create } from 'zustand';
import { db, type Block, type Page } from '../lib/db';
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
    const allPages = await db.pages.toArray();
    const allBlocks = await db.blocks.toArray();

    const pagesRecord = allPages.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
    const blocksRecord = allBlocks.reduce((acc, b) => ({ ...acc, [b.uuid]: b }), {});

    set({ pages: pagesRecord, blocks: blocksRecord, loading: false });
  },

  createPage: async (title, type = 'normal') => {
    const newPage: Page = {
      id: uuidv4(),
      title,
      type,
      root_blocks: [],
      created_at: Date.now(),
      updated_at: Date.now()
    };
    await db.pages.add(newPage);
    set(state => ({
      pages: { ...state.pages, [newPage.id]: newPage }
    }));
    return newPage;
  },

  setActivePage: (id) => {
    set({ activePageId: id });
  },

  addBlock: async (pageId, parentId, index, content = '') => {
    const newBlock: Block = {
      uuid: uuidv4(),
      content,
      parent_id: parentId,
      children: [],
      page_id: pageId,
      properties: {},
      created_at: Date.now(),
      updated_at: Date.now()
    };

    const { pages, blocks } = get();

    await db.transaction('rw', db.pages, db.blocks, async () => {
      await db.blocks.add(newBlock);
      
      if (parentId) {
        const parent = await db.blocks.get(parentId);
        if (parent) {
          parent.children.splice(index, 0, newBlock.uuid);
          parent.updated_at = Date.now();
          await db.blocks.put(parent);
        }
      } else {
        const page = await db.pages.get(pageId);
        if (page) {
          page.root_blocks.splice(index, 0, newBlock.uuid);
          page.updated_at = Date.now();
          await db.pages.put(page);
        }
      }
    });

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
    
    set(state => ({
      blocks: { ...state.blocks, [uuid]: updated }
    }));
  },

  deleteBlock: async (uuid) => {
    const { blocks, pages, activePageId } = get();
    const block = blocks[uuid];
    if (!block) return;

    await db.transaction('rw', db.pages, db.blocks, async () => {
      // 1. recursively delete children
      const deleteRecursive = async (id: string) => {
        const b = blocks[id];
        if (!b) return;
        for (const childId of b.children) {
          await deleteRecursive(childId);
        }
        await db.blocks.delete(id);
      };
      
      await deleteRecursive(uuid);

      // 2. remove from parent or page
      if (block.parent_id) {
        const parent = blocks[block.parent_id];
        if (parent) {
          parent.children = parent.children.filter(c => c !== uuid);
          await db.blocks.put(parent);
        }
      } else if (activePageId) {
        const page = pages[activePageId];
        if (page) {
          page.root_blocks = page.root_blocks.filter(c => c !== uuid);
          await db.pages.put(page);
        }
      }
    });

    // Update state
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
      // Stub for future
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
      
      // Update DB
      await db.transaction('rw', db.pages, db.blocks, async () => {
          // Remove from old parent array
          if (block.parent_id) {
              const oldParent = await db.blocks.get(block.parent_id);
              if (oldParent) {
                  oldParent.children = oldParent.children.filter(id => id !== uuid);
                  await db.blocks.put(oldParent);
              }
          } else {
              const oldPage = await db.pages.get(block.page_id);
              if (oldPage) {
                  oldPage.root_blocks = oldPage.root_blocks.filter(id => id !== uuid);
                  await db.pages.put(oldPage);
              }
          }
          
          // Add to new parent array
          previousSibling.children.push(uuid);
          await db.blocks.put(previousSibling);
          
          // Update block's parent_id
          block.parent_id = previousSiblingId;
          await db.blocks.put(block);
      });
      
      // We can just call loadGraph here for simplicity in this prototype, or carefully update local state
      get().loadGraph();
  },
  
  outdentBlock: async (uuid) => {
      const { blocks } = get();
      const block = blocks[uuid];
      if (!block || !block.parent_id) return; // Cannot outdent if no parent
      
      const currentParent = blocks[block.parent_id];
      const grandParentId = currentParent.parent_id;
      
      const indexInParent = currentParent.children.indexOf(uuid);
      const followingSiblings = currentParent.children.slice(indexInParent + 1);
      
      await db.transaction('rw', db.pages, db.blocks, async () => {
          // Remove from current parent
          currentParent.children = currentParent.children.slice(0, indexInParent);
          await db.blocks.put(currentParent);
          
          // Children that were below this block now become its children (Logseq style)
          block.children = [...block.children, ...followingSiblings];
          
          // Update parent references of following siblings
          for (const sibId of followingSiblings) {
              const sib = await db.blocks.get(sibId);
              if (sib) {
                  sib.parent_id = uuid;
                  await db.blocks.put(sib);
              }
          }
          
          // Add to grandparent
          block.parent_id = grandParentId;
          await db.blocks.put(block);
          
          if (grandParentId) {
              const grandParent = await db.blocks.get(grandParentId);
              if (grandParent) {
                  const parentIndexInGrandparent = grandParent.children.indexOf(currentParent.uuid);
                  grandParent.children.splice(parentIndexInGrandparent + 1, 0, uuid);
                  await db.blocks.put(grandParent);
              }
          } else {
              const page = await db.pages.get(block.page_id);
              if (page) {
                  const parentIndexInPage = page.root_blocks.indexOf(currentParent.uuid);
                  page.root_blocks.splice(parentIndexInPage + 1, 0, uuid);
                  await db.pages.put(page);
              }
          }
      });
      
      get().loadGraph();
  }
}));
