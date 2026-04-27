import type { StateCreator } from 'zustand';

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
      const prevState = { ...get() };
      set(args);
      
      if (typeof args === 'function' || (args && typeof args === 'object')) {
        set((s: T) => ({
          undoStack: [...(s.undoStack || []), prevState].slice(-50),
          redoStack: [],
        } as unknown as Partial<T>));
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
