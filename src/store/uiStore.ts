import { create } from 'zustand';

export type BlockType =
  | 'text' | 'heading1' | 'heading2' | 'heading3'
  | 'bullet' | 'numbered' | 'toggle' | 'code'
  | 'quote' | 'callout' | 'divider';

interface UIState {
  // Command Palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Slash Command Menu
  slashMenuOpen: boolean;
  slashMenuBlockId: string | null;
  slashQuery: string;
  openSlashMenu: (blockId: string) => void;
  closeSlashMenu: () => void;
  setSlashQuery: (q: string) => void;

  // Collapsed blocks
  collapsedBlocks: Set<string>;
  toggleCollapsed: (uuid: string) => void;

  // Focused block
  focusedBlockId: string | null;
  setFocusedBlock: (id: string | null) => void;

  // Right sidebar
  rightSidebarOpen: boolean;
  toggleRightSidebar: () => void;

  // View mode: 'edit' | 'preview'
  viewMode: 'edit' | 'preview';
  toggleViewMode: () => void;

  // Search modal
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;

  // Journal view
  journalOpen: boolean;
  setJournalOpen: (open: boolean) => void;

  // Strategy dashboard
  strategyOpen: boolean;
  setStrategyOpen: (open: boolean) => void;

  // Context menu
  contextMenu: { x: number; y: number; blockId: string } | null;
  setContextMenu: (cm: { x: number; y: number; blockId: string } | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  slashMenuOpen: false,
  slashMenuBlockId: null,
  slashQuery: '',
  openSlashMenu: (blockId) => set({ slashMenuOpen: true, slashMenuBlockId: blockId, slashQuery: '' }),
  closeSlashMenu: () => set({ slashMenuOpen: false, slashMenuBlockId: null, slashQuery: '' }),
  setSlashQuery: (q) => set({ slashQuery: q }),

  collapsedBlocks: new Set(),
  toggleCollapsed: (uuid) =>
    set((state) => {
      const next = new Set(state.collapsedBlocks);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return { collapsedBlocks: next };
    }),

  focusedBlockId: null,
  setFocusedBlock: (id) => set({ focusedBlockId: id }),

  rightSidebarOpen: false,
  toggleRightSidebar: () => set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),

  viewMode: 'edit',
  toggleViewMode: () => set((s) => ({ viewMode: s.viewMode === 'edit' ? 'preview' : 'edit' })),

  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),

  journalOpen: false,
  setJournalOpen: (open) => set({ journalOpen: open }),

  strategyOpen: false,
  setStrategyOpen: (open) => set({ strategyOpen: open }),

  contextMenu: null,
  setContextMenu: (cm) => set({ contextMenu: cm }),
}));
