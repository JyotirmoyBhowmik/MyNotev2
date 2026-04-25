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
  authError: string | null;
  initAuth: () => void;
  checkApproval: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  authError: null,

  initAuth: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        set({ user: session.user });
        fetchProfile(session.user.id, session.user.email, set);
      } else {
        set({ user: null, profile: null, loading: false });
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        set({ user: session.user, loading: true });
        fetchProfile(session.user.id, session.user.email, set);
      } else {
        set({ user: null, profile: null, loading: false });
      }
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, authError: null });
  },

  checkApproval: async () => {
    const { user } = get();
    if (!user) return;
    set({ loading: true });
    await fetchProfile(user.id, user.email, set);
  },

  clearError: () => set({ authError: null }),
}));

async function fetchProfile(userId: string, email: string | undefined, set: any) {
  // Attempt 1: Direct fetch by ID
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();   // maybeSingle() returns null instead of error when 0 rows

  if (data) {
    set({ profile: data as Profile, loading: false, authError: null });
    return;
  }

  if (error) {
    console.error('Profile fetch error:', error);
    // RLS might be blocking — try creating the profile
    if (error.code === 'PGRST301' || error.code === '42501') {
      set({
        authError: 'Permission denied fetching profile. Check Supabase RLS policies for the profiles table.',
        loading: false,
        profile: { id: userId, email: email || '', full_name: null, role: 'user', is_approved: false, updated_at: null }
      });
      return;
    }
  }

  // Profile doesn't exist yet — wait for trigger and retry
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 700));
    const { data: retryData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (retryData) {
      set({ profile: retryData as Profile, loading: false, authError: null });
      return;
    }
  }

  // Still no profile — create it manually
  const newProfile: Profile = {
    id: userId,
    email: email || '',
    full_name: null,
    role: 'user',
    is_approved: false,
    updated_at: new Date().toISOString(),
  };
  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .upsert(newProfile, { onConflict: 'id' })
    .select()
    .single();

  if (inserted) {
    set({ profile: inserted as Profile, loading: false, authError: null });
  } else {
    console.error('Could not create profile:', insertError);
    set({
      profile: newProfile,
      loading: false,
      authError: insertError?.message || null,
    });
  }
}
