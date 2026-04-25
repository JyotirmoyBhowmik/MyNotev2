import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { PendingApproval } from './components/PendingApproval';
import { AdminPanel } from './components/AdminPanel';

function App() {
  const { user, profile, loading, initAuth } = useAuthStore();
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-3)' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid var(--border-2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: '0.9rem' }}>Loading MyNote...</span>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (profile?.is_approved === false) {
    return <PendingApproval />;
  }

  if (showAdmin && profile?.role === 'admin') {
    return <AdminPanel onClose={() => setShowAdmin(false)} />;
  }

  return (
    <>
      <Layout onOpenAdmin={() => setShowAdmin(true)} isAdmin={profile?.role === 'admin'} />
    </>
  );
}

export default App;
