import { StateCreator } from 'zustand';

export interface TransactionState {
  undoStack: any[];
  redoStack: any[];
  isSyncing: boolean;
  syncError: string | null;
}

export type TransactionMiddleware = <T extends TransactionState>(
  config: StateCreator<T, [], []>
) => StateCreator<T, [], []>;

export const transactionMiddleware: TransactionMiddleware = (config) => (set, get, api) => {
  const initialState = config(
    (args) => {
      // Capture state before change for undo
      const prevState = { ...get() };
      
      // Update state
      set(args);
      
      // Post-process for undo stack (simplified)
      const nextState = get();
      if (typeof args === 'function' || (args && typeof args === 'object')) {
        // Avoid infinite loops and large stacks in real production
        // Only push if it's a meaningful change
        set((s: any) => ({
          undoStack: [...(s.undoStack || []), prevState].slice(-50),
          redoStack: [], // Clear redo on new action
        }));
      }
    },
    get,
    api
  );

  return {
    ...initialState,
    undoStack: [],
    redoStack: [],
    isSyncing: false,
    syncError: null,
  };
};
