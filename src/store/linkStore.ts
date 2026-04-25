import { create } from 'zustand';

// ─── Link index types ─────────────────────────────────────────────────────────
export interface BacklinkEntry {
  pageId: string;
  pageTitle: string;
  blockUuid: string;
  blockContent: string;
}

interface LinkState {
  // Map from pageId → list of blocks that link TO it
  backlinks: Record<string, BacklinkEntry[]>;
  // Map from pageId → list of pages it links to
  outlinks: Record<string, string[]>;
  buildIndex: (blocks: Record<string, any>, pages: Record<string, any>) => void;
}

export const useLinkStore = create<LinkState>((set) => ({
  backlinks: {},
  outlinks: {},

  buildIndex: (blocks, pages) => {
    const backlinks: Record<string, BacklinkEntry[]> = {};
    const outlinks: Record<string, string[]> = {};

    // Build page title → id map
    const titleToId: Record<string, string> = {};
    Object.values(pages).forEach((p: any) => {
      titleToId[p.title.toLowerCase()] = p.id;
    });

    Object.values(blocks).forEach((block: any) => {
      const content = block.content || '';
      const pageId = block.page_id;
      const pageTitle = pages[pageId]?.title || '';

      // Parse [[Page Name]] links
      const linkRegex = /\[\[([^\]]+)\]\]/g;
      let match;
      while ((match = linkRegex.exec(content)) !== null) {
        const linkedTitle = match[1].trim();
        const linkedId = titleToId[linkedTitle.toLowerCase()];
        if (linkedId) {
          if (!backlinks[linkedId]) backlinks[linkedId] = [];
          backlinks[linkedId].push({
            pageId,
            pageTitle,
            blockUuid: block.uuid,
            blockContent: content,
          });
          if (!outlinks[pageId]) outlinks[pageId] = [];
          if (!outlinks[pageId].includes(linkedId)) outlinks[pageId].push(linkedId);
        }
      }
    });

    set({ backlinks, outlinks });
  },
}));
