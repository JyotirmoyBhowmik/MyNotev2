import { useAuthStore } from '../store/authStore';

export function PendingApproval() {
  const { signOut } = useAuthStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}>
      <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Account Pending Approval</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', textAlign: 'center', maxWidth: '400px', lineHeight: '1.5' }}>
        Your account has been created successfully, but it requires administrator approval before you can access the system. Please check back later.
      </p>
      <button 
        onClick={signOut}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: 'transparent',
          border: '1px solid var(--border-color)',
          color: 'var(--text-secondary)',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Sign Out
      </button>
    </div>
  );
}
