import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending: false });
    if (!error && data) setUsers(data);
    setLoading(false);
  }

  async function setApproval(userId: string, is_approved: boolean) {
    setSaving(userId);
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved })
      .eq('id', userId);
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_approved } : u));
    } else {
      alert('Error updating user: ' + error.message);
    }
    setSaving(null);
  }

  async function setRole(userId: string, role: 'user' | 'admin') {
    setSaving(userId);
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } else {
      alert('Error updating role: ' + error.message);
    }
    setSaving(null);
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>⚙️ Admin Panel — User Management</h2>
        <button onClick={onClose} style={{ padding: '0.5rem 1.2rem', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }}>
          ← Back to Editor
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading users…</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ color: 'var(--text-secondary)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>Email</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Name</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Role</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '0.75rem 0.5rem' }}>{u.email}</td>
                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>{u.full_name || '—'}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <span style={{
                    padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                    backgroundColor: u.role === 'admin' ? '#4caf5033' : '#2196f333',
                    color: u.role === 'admin' ? '#4caf50' : '#2196f3',
                    border: `1px solid ${u.role === 'admin' ? '#4caf50' : '#2196f3'}`
                  }}>
                    {u.role?.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <span style={{
                    padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                    backgroundColor: u.is_approved ? '#4caf5033' : '#ff980033',
                    color: u.is_approved ? '#4caf50' : '#ff9800',
                    border: `1px solid ${u.is_approved ? '#4caf50' : '#ff9800'}`
                  }}>
                    {u.is_approved ? 'APPROVED' : 'PENDING'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {!u.is_approved && (
                      <button disabled={saving === u.id} onClick={() => setApproval(u.id, true)}
                        style={{ padding: '0.3rem 0.7rem', border: '1px solid #4caf50', color: '#4caf50', background: 'transparent', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                        ✓ Approve
                      </button>
                    )}
                    {u.is_approved && (
                      <button disabled={saving === u.id} onClick={() => setApproval(u.id, false)}
                        style={{ padding: '0.3rem 0.7rem', border: '1px solid #ff9800', color: '#ff9800', background: 'transparent', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                        ✗ Revoke
                      </button>
                    )}
                    {u.role !== 'admin' && (
                      <button disabled={saving === u.id} onClick={() => setRole(u.id, 'admin')}
                        style={{ padding: '0.3rem 0.7rem', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', background: 'transparent', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                        Make Admin
                      </button>
                    )}
                    {u.role === 'admin' && (
                      <button disabled={saving === u.id} onClick={() => setRole(u.id, 'user')}
                        style={{ padding: '0.3rem 0.7rem', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', background: 'transparent', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                        Remove Admin
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
