import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: any | null;
  loading: boolean;
  checkSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: { id: 'local-user', email: 'test@local.dev' },
  loading: false,
  checkSession: async () => {
    const isMock = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co';
    if (isMock) {
        set({ user: { id: 'local-user', email: 'local@dev' }, loading: false });
        return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ user: session?.user || null, loading: false });
    } catch (e) {
      console.warn("Supabase not fully configured yet, bypassing auth for local dev.");
      set({ user: { id: 'local-user' }, loading: false });
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  }
}));
