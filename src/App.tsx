import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { Login } from './components/Login';
import { Layout } from './components/Layout';

function App() {
  const { user, loading, checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}>Loading application...</div>;
  }

  return (
    <>
      {user ? <Layout /> : <Login />}
    </>
  );
}

export default App;
