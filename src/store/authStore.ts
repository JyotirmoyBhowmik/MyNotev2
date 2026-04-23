import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  role: 'pending' | 'approved' | 'admin';
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initAuth: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,

  initAuth: () => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        set({ user: session.user });
        fetchProfile(session.user.id, set);
      } else {
        set({ user: null, profile: null, loading: false });
      }
    });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        set({ user: session.user, loading: true });
        fetchProfile(session.user.id, set);
      } else {
        set({ user: null, profile: null, loading: false });
      }
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  }
}));

async function fetchProfile(userId: string, set: any) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (data) {
    set({ profile: data, loading: false });
  } else {
    console.error('Error fetching profile', error);
    // Profile might not be created immediately due to trigger delay, 
    // or RLS prevents reading it if something is wrong.
    set({ profile: { id: userId, email: '', role: 'pending' }, loading: false });
  }
}
