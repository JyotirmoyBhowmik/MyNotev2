import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { PendingApproval } from './components/PendingApproval';
import { AdminPanel } from './components/AdminPanel';
import { PasswordReset } from './components/PasswordReset';
import { PageEditor } from './components/PageEditor';
import { CommandPalette } from './components/CommandPalette';
import { BlockMenu } from './components/BlockMenu';
import { ContextMenu } from './components/ContextMenu';
import { useGraphStore } from './store/graphStore';
import { Toaster } from 'sonner';

// ─── Clear stale auth error hashes from the URL ──────────────────────────────
// e.g. #error=access_denied&error_code=otp_expired from expired magic links.
// If not cleared, Supabase re-processes the fragment on every hot-reload,
// which can invalidate an active session mid-edit.
function clearAuthErrorFromUrl() {
  const hash = window.location.hash;
  if (hash.includes('error=') || hash.includes('access_token=')) {
    // Replace state without navigation so the Supabase client won't re-parse it
    window.history.replaceState(null, '', window.location.pathname);
  }
}

function App() {
  const { user, profile, loading, initAuth, isRecovering } = useAuthStore();
  const activePageId = useGraphStore(s => s.activePageId);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    // 1. Clear any stale magic-link fragments BEFORE initialising auth
    clearAuthErrorFromUrl();
    // 2. Init auth (reads session cookie, subscribes to auth state changes)
    initAuth();
  }, []);   // ← intentionally empty; initAuth is stable

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '14px',
        height: '100vh', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', color: 'var(--text-3)',
      }}>
        <div style={{
          width: '32px', height: '32px',
          border: '2px solid var(--border-2)', borderTopColor: 'var(--accent)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: '0.9rem' }}>Loading Nexus OS…</span>
      </div>
    );
  }

  if (isRecovering) return <PasswordReset />;
  if (!user) return <Login />;

  // Still loading profile (2nd stage)
  if (profile === null) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '14px',
        height: '100vh', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', color: 'var(--text-3)',
      }}>
        <div style={{
          width: '28px', height: '28px',
          border: '2px solid var(--border-2)', borderTopColor: 'var(--accent)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: '0.85rem' }}>Loading your workspace…</span>
      </div>
    );
  }

  if (profile.is_approved === false) return <PendingApproval />;

  if (showAdmin && profile.role === 'admin') {
    return <AdminPanel onClose={() => setShowAdmin(false)} />;
  }



  return (
    <div className="h-screen w-screen overflow-hidden">
      <Layout>
        {activePageId ? (
          <PageEditor />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-[var(--text-secondary)] italic bg-[var(--obsidian-bg)]">
            <div className="mb-4 text-4xl opacity-20">🧠</div>
            Select a page or create a new one to start
          </div>
        )}
      </Layout>

      {/* Global Overlays */}
      <CommandPalette onNavigateToPage={(pid) => useGraphStore.getState().setActivePage(pid)} />
      <BlockMenu />
      <ContextMenu />
      <Toaster position="bottom-right" theme="dark" expand={false} richColors />
    </div>
  );
}

export default App;
