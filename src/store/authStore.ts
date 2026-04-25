import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
  is_approved: boolean;
  updated_at: string | null;
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        set({ user: session.user });
        fetchProfile(session.user.id, set);
      } else {
        set({ user: null, profile: null, loading: false });
      }
    });

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
  // Retry up to 3 times — profile is created by DB trigger, may have slight delay
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      set({ profile: data as Profile, loading: false });
      return;
    }

    if (error?.code !== 'PGRST116') {
      // PGRST116 = row not found; other errors are real
      console.error('Error fetching profile', error);
      break;
    }

    // Row not found yet — wait and retry
    await new Promise(r => setTimeout(r, 800));
  }

  // Fallback: treat as unapproved user
  set({ profile: { id: userId, email: '', full_name: null, role: 'user', is_approved: false, updated_at: null }, loading: false });
}
