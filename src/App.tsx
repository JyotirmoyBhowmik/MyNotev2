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
import { PageContextMenu } from './components/PageContextMenu';
import { GraphView } from './components/GraphView';
import { TrashView } from './components/TrashView';
import { JournalView } from './components/JournalView';
import { useUIStore } from './store/uiStore';
import { useGraphStore } from './store/graphStore';
import { NexusErrorBoundary } from './components/NexusErrorBoundary';
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
  const { 
    graphOpen, setGraphOpen, 
    trashOpen,
    journalOpen,
    setCommandPaletteOpen 
  } = useUIStore();
  const [showAdmin, setShowAdmin] = useState(false);

  const { loadGraph } = useGraphStore();

  useEffect(() => {
    // 1. Clear any stale magic-link fragments BEFORE initialising auth
    clearAuthErrorFromUrl();
    // 2. Init auth (reads session cookie, subscribes to auth state changes)
    initAuth();
  }, []); 

  useEffect(() => {
    let timeout: any;
    if (user?.id && profile?.is_approved) {
      // Debounce the load to prevent race conditions during auth state transitions
      timeout = setTimeout(() => {
        loadGraph();
      }, 500);
    }
    return () => clearTimeout(timeout);
  }, [user?.id, profile?.is_approved, loadGraph]);

  // Safety check for activePageId
  useEffect(() => {
    const state = useGraphStore.getState();
    if (activePageId && !state.pages[activePageId] && !loading) {
      // Page might not be loaded yet or deleted
      // Wait for loadGraph to finish before clearing
    }
  }, [activePageId, loading]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+P for Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setCommandPaletteOpen]);

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
      <NexusErrorBoundary>
        <Layout>
        {trashOpen ? (
          <TrashView />
        ) : journalOpen ? (
          <JournalView onClose={() => useUIStore.getState().setJournalOpen(false)} />
        ) : activePageId ? (
          <PageEditor />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-[var(--text-secondary)] italic bg-[var(--obsidian-bg)] p-8 text-center">
            <div className="mb-6 text-6xl opacity-20 animate-pulse">🧠</div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] not-italic mb-2">Welcome to Nexus v3.15</h2>
            <p className="max-w-md mb-8 text-sm opacity-60">Your advanced neural workspace is ready. Select a page from the sidebar or use the quick actions below to begin.</p>
            
            <div className="grid grid-cols-2 gap-4 max-w-lg w-full not-italic">
              <div 
                onClick={() => setCommandPaletteOpen(true)}
                className="p-4 rounded-xl border border-[var(--glass-border)] bg-white/5 flex flex-col items-start gap-2 group hover:border-[var(--electric-blue)] transition-all cursor-pointer"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--electric-blue)]">Navigation</span>
                <span className="text-xs text-[var(--text-primary)]">Press <kbd className="bg-white/10 px-1 rounded">Ctrl+P</kbd> to search or jump to any page.</span>
              </div>
              <div 
                onClick={() => {
                  const p = useGraphStore.getState().createPage('New Page');
                  p.then(page => useGraphStore.getState().setActivePage(page.id));
                }}
                className="p-4 rounded-xl border border-[var(--glass-border)] bg-white/5 flex flex-col items-start gap-2 group hover:border-[var(--electric-blue)] transition-all cursor-pointer"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--electric-blue)]">Creation</span>
                <span className="text-xs text-[var(--text-primary)]">Type <kbd className="bg-white/10 px-1 rounded">/</kbd> inside any document for advanced blocks.</span>
              </div>
              <div 
                onClick={() => useUIStore.getState().toggleInspector()}
                className="p-4 rounded-xl border border-[var(--glass-border)] bg-white/5 flex flex-col items-start gap-2 group hover:border-[var(--electric-blue)] transition-all cursor-pointer"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--electric-blue)]">Intelligence</span>
                <span className="text-xs text-[var(--text-primary)]">Use backlinks in the right panel to see neural connections.</span>
              </div>
              <div className="p-4 rounded-xl border border-[var(--glass-border)] bg-white/5 flex flex-col items-start gap-2 group hover:border-[var(--electric-blue)] transition-all">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--electric-blue)]">Collaboration</span>
                <span className="text-xs text-[var(--text-primary)]">Changes sync in real-time across all your neural nodes.</span>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </NexusErrorBoundary>

      {/* Global Overlays */}
      <CommandPalette onNavigateToPage={(pid) => useGraphStore.getState().setActivePage(pid)} />
      <BlockMenu />
      <ContextMenu />
      <PageContextMenu />
      {graphOpen && <GraphView onClose={() => setGraphOpen(false)} activePageId={activePageId || ''} />}
      <Toaster position="bottom-right" theme="dark" expand={false} richColors />
    </div>
  );
}

export default App;
