import Fuse from 'fuse.js';
import { create } from 'zustand';

export interface SearchResult {
  type: 'page' | 'block';
  id: string;
  title: string;
  preview: string;
  pageId?: string;
  pageTitle?: string;
  score?: number;
}

interface SearchState {
  results: SearchResult[];
  query: string;
  search: (q: string, pages: Record<string, any>, blocks: Record<string, any>) => void;
  clear: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  results: [],
  query: '',

  search: (q, pages, blocks) => {
    if (!q.trim()) {
      set({ results: [], query: '' });
      return;
    }

    const pageItems: SearchResult[] = Object.values(pages).map((p: any) => ({
      type: 'page',
      id: p.id,
      title: p.title,
      preview: p.title,
    }));

    const blockItems: SearchResult[] = Object.values(blocks)
      .filter((b: any) => b.content?.trim())
      .map((b: any) => ({
        type: 'block',
        id: b.uuid,
        title: b.content.substring(0, 60),
        preview: b.content,
        pageId: b.page_id,
        pageTitle: pages[b.page_id]?.title || 'Unknown Page',
      }));

    const allItems = [...pageItems, ...blockItems];

    const fuse = new Fuse(allItems, {
      keys: ['title', 'preview'],
      threshold: 0.4,
      includeScore: true,
    });

    const raw = fuse.search(q);
    const results = raw.slice(0, 20).map((r) => ({
      ...r.item,
      score: r.score,
    }));

    set({ results, query: q });
  },

  clear: () => set({ results: [], query: '' }),
}));
