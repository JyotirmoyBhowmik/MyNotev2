import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Layout Shell (Obsidian Glass)
  sidebarWidth: number;
  isSidebarOpen: boolean;
  isInspectorOpen: boolean;
  isFocusMode: boolean;
  isWideView: boolean;
  
  // Menus & Overlays
  commandPaletteOpen: boolean;
  slashMenuOpen: boolean;
  slashMenuBlockId: string | null;
  slashQuery: string;
  contextMenu: { x: number; y: number; blockId: string } | null;
  
  // State
  collapsedBlocks: Record<string, boolean>;
  tasksOpen: boolean;
  journalOpen: boolean;
  graphOpen: boolean;
  trashOpen: boolean;
  viewMode: 'canvas' | 'list';
  theme: 'dark' | 'light' | 'cyberpunk';
  pageContextMenu: { x: number; y: number; pageId: string } | null;

  // Actions
  setTheme: (theme: 'dark' | 'light' | 'cyberpunk') => void;
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  toggleInspector: () => void;
  setFocusMode: (active: boolean) => void;
  
  setCommandPaletteOpen: (open: boolean) => void;
  openSlashMenu: (blockId: string) => void;
  closeSlashMenu: () => void;
  setSlashQuery: (query: string) => void;
  setContextMenu: (menu: { x: number; y: number; blockId: string } | null) => void;
  
  setJournalOpen: (open: boolean) => void;
  setTasksOpen: (open: boolean) => void;
  setGraphOpen: (open: boolean) => void;
  setTrashOpen: (open: boolean) => void;
  setPageContextMenu: (menu: { x: number; y: number; pageId: string } | null) => void;
  toggleViewMode: () => void;
  toggleWideView: () => void;
  toggleCollapsed: (blockId: string) => void;

  // Legacy Aliases for compatibility
  rightSidebarOpen?: boolean;
  toggleRightSidebar?: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Defaults
      sidebarWidth: 260,
      isSidebarOpen: true,
      isInspectorOpen: false,
      isFocusMode: false,
      
      commandPaletteOpen: false,
      slashMenuOpen: false,
      slashMenuBlockId: null,
      slashQuery: '',
      contextMenu: null,
      
      journalOpen: false,
      tasksOpen: false,
      graphOpen: false,
      trashOpen: false,
      viewMode: 'canvas',
      theme: 'dark',
      isWideView: false,
      collapsedBlocks: {},
      pageContextMenu: null,

      // Actions
      setTheme: (theme) => set({ theme }),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
      toggleInspector: () => set((s) => ({ isInspectorOpen: !s.isInspectorOpen })),
      setFocusMode: (active) => set({ isFocusMode: active }),
      
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      openSlashMenu: (blockId) => set({ slashMenuOpen: true, slashMenuBlockId: blockId, slashQuery: '' }),
      closeSlashMenu: () => set({ slashMenuOpen: false, slashMenuBlockId: null, slashQuery: '' }),
      setSlashQuery: (query) => set({ slashQuery: query }),
      setContextMenu: (menu) => set({ contextMenu: menu }),
      
      setJournalOpen: (open) => set({ journalOpen: open, tasksOpen: false, graphOpen: false, trashOpen: false }),
      setTasksOpen: (open) => set({ tasksOpen: open, journalOpen: false, graphOpen: false, trashOpen: false }),
      setGraphOpen: (open) => set({ graphOpen: open, tasksOpen: false, journalOpen: false, trashOpen: false }),
      setTrashOpen: (open) => set({ trashOpen: open, graphOpen: false, tasksOpen: false, journalOpen: false }),
      setPageContextMenu: (menu) => set({ pageContextMenu: menu }),
      toggleViewMode: () => set((s) => ({ viewMode: s.viewMode === 'canvas' ? 'list' : 'canvas' })),
      toggleWideView: () => set((s) => ({ isWideView: !s.isWideView })),
      toggleCollapsed: (blockId) => set((s) => ({
        collapsedBlocks: { ...s.collapsedBlocks, [blockId]: !s.collapsedBlocks[blockId] }
      })),

      // Aliases
      get rightSidebarOpen() { return (this as any).isInspectorOpen; },
      toggleRightSidebar: () => set((s) => ({ isInspectorOpen: !s.isInspectorOpen })),
    }),
    {
      name: 'nexus-ui-storage',
      partialize: (state) => ({ 
        sidebarWidth: state.sidebarWidth, 
        isSidebarOpen: state.isSidebarOpen,
        isInspectorOpen: state.isInspectorOpen,
        viewMode: state.viewMode,
        theme: state.theme,
        isWideView: state.isWideView,
        journalOpen: state.journalOpen,
        collapsedBlocks: state.collapsedBlocks
      }),
      version: 1, 
    }
  )
);
