import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  }

  async function updateRole(userId: string, newRole: string) {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } else {
      alert("Error updating role");
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Admin Panel - User Approvals</h2>
        <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: 'var(--border-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close Admin Panel</button>
      </div>

      {loading ? <p>Loading users...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '1rem 0' }}>Email</th>
              <th style={{ padding: '1rem 0' }}>Role</th>
              <th style={{ padding: '1rem 0' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem 0' }}>{u.email}</td>
                <td style={{ padding: '1rem 0' }}>
                  <span style={{ 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '4px', 
                    backgroundColor: u.role === 'pending' ? '#ff9800' : u.role === 'admin' ? '#4caf50' : '#2196f3',
                    color: '#fff',
                    fontSize: '0.8rem'
                  }}>
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '1rem 0', display: 'flex', gap: '0.5rem' }}>
                  {u.role !== 'admin' && (
                    <>
                      <button onClick={() => updateRole(u.id, 'approved')} disabled={u.role === 'approved'} style={{ padding: '0.3rem 0.6rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px' }}>Approve</button>
                      <button onClick={() => updateRole(u.id, 'pending')} disabled={u.role === 'pending'} style={{ padding: '0.3rem 0.6rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px' }}>Revoke</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
