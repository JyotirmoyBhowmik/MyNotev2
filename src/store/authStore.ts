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
  isRecovering: boolean;
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
  isRecovering: false,

  initAuth: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        set({ user: session.user });
        fetchProfile(session.user.id, session.user.email ?? '', set);
      } else {
        set({ user: null, profile: null, loading: false });
      }
    });

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        set({ isRecovering: true });
      }
      
      if (session?.user) {
        set({ user: session.user, loading: true });
        fetchProfile(session.user.id, session.user.email ?? '', set);
      } else {
        set({ user: null, profile: null, loading: false, isRecovering: false });
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
    set({ loading: true, authError: null });
    await fetchProfile(user.id, user.email ?? '', set);
  },

  clearError: () => set({ authError: null }),
}));

async function fetchProfile(userId: string, email: string, set: any) {
  // --- Attempt to fetch the existing profile ---
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_approved, updated_at')
    .eq('id', userId)
    .maybeSingle();   // returns null (not error) when 0 rows

  if (data) {
    // ✅ Profile found — use it exactly as-is
    set({ profile: data as Profile, loading: false, authError: null });
    return;
  }

  if (error) {
    // Real DB error (e.g. RLS blocking read)
    const msg = `Profile read error (${error.code}): ${error.message}. Check RLS policies in Supabase.`;
    console.error(msg, error);
    set({
      loading: false,
      authError: msg,
      // Show as pending so UI shows helpful error — do NOT override with is_approved: false
      profile: { id: userId, email, full_name: null, role: 'user', is_approved: false, updated_at: null },
    });
    return;
  }

  // --- Profile doesn't exist yet (0 rows, no error) ---
  // This only happens for brand-new signups before the trigger fires.
  // Retry a few times before trying to create it.
  for (let i = 0; i < 4; i++) {
    await new Promise(r => setTimeout(r, 600));
    const { data: retry } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, is_approved, updated_at')
      .eq('id', userId)
      .maybeSingle();
    if (retry) {
      set({ profile: retry as Profile, loading: false, authError: null });
      return;
    }
  }

  // --- Still nothing — insert a new profile (new user first login) ---
  // IMPORTANT: Only insert, never update, so we never overwrite is_approved
  const { data: inserted, error: insertErr } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      full_name: null,
      role: 'user',
      is_approved: false,
      updated_at: new Date().toISOString(),
    })
    .select()
    .maybeSingle();

  if (inserted) {
    set({ profile: inserted as Profile, loading: false, authError: null });
  } else {
    // Insert failed — profile might have appeared (race). Try one final read.
    const { data: finalRead } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, is_approved, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (finalRead) {
      set({ profile: finalRead as Profile, loading: false, authError: null });
    } else {
      console.error('Could not create or read profile:', insertErr);
      set({
        loading: false,
        authError: insertErr?.message ?? 'Could not load profile. Run the SQL setup script.',
        profile: { id: userId, email, full_name: null, role: 'user', is_approved: false, updated_at: null },
      });
    }
  }
}
