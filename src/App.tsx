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
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}>Loading application...</div>;
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
