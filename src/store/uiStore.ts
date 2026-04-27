import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarWidth: number;
  isSidebarOpen: boolean;
  isInspectorOpen: boolean;
  isFocusMode: boolean;
  
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  toggleInspector: () => void;
  setFocusMode: (active: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarWidth: 260,
      isSidebarOpen: true,
      isInspectorOpen: false,
      isFocusMode: false,

      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      toggleInspector: () => set((state) => ({ isInspectorOpen: !state.isInspectorOpen })),
      setFocusMode: (isFocusMode) => set({ isFocusMode }),
    }),
    {
      name: 'nexus-ui-storage',
    }
  )
);
