import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Layout Shell (Obsidian Glass)
  sidebarWidth: number;
  isSidebarOpen: boolean;
  isInspectorOpen: boolean;
  isFocusMode: boolean;
  
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
  viewMode: 'canvas' | 'list';

  // Actions
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
  toggleViewMode: () => void;
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
      viewMode: 'canvas',
      collapsedBlocks: {},

      // Actions
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
      toggleInspector: () => set((s) => ({ isInspectorOpen: !s.isInspectorOpen })),
      setFocusMode: (active) => set({ isFocusMode: active }),
      
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      openSlashMenu: (blockId) => set({ slashMenuOpen: true, slashMenuBlockId: blockId, slashQuery: '' }),
      closeSlashMenu: () => set({ slashMenuOpen: false, slashMenuBlockId: null, slashQuery: '' }),
      setSlashQuery: (query) => set({ slashQuery: query }),
      setContextMenu: (menu) => set({ contextMenu: menu }),
      
      setJournalOpen: (open) => set({ journalOpen: open, tasksOpen: false }),
      setTasksOpen: (open) => set({ tasksOpen: open, journalOpen: false }),
      toggleViewMode: () => set((s) => ({ viewMode: s.viewMode === 'canvas' ? 'list' : 'canvas' })),
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
        journalOpen: state.journalOpen,
        collapsedBlocks: state.collapsedBlocks
      }),
      version: 1, 
    }
  )
);
