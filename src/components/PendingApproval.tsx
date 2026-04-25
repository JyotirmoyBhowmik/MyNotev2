import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { LogOut, Clock, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import './PendingApproval.css';

export function PendingApproval() {
  const { signOut, checkApproval, authError, profile } = useAuthStore();
  const [checking, setChecking] = useState(false);
  const [email, setEmail] = useState('');
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email || '');
    });
  }, []);

  const checkStatus = async () => {
    setChecking(true);
    await checkApproval();
    setChecked(true);
    setTimeout(() => setChecking(false), 800);
  };

  return (
    <div className="pending-container">
      <div className="pending-blob pending-blob-1" />
      <div className="pending-blob pending-blob-2" />

      <div className="pending-card">
        <div className="pending-icon-wrap">
          <Clock className="pending-icon" size={32} />
          <div className="pending-icon-ring" />
        </div>

        <h1 className="pending-title">Awaiting Approval</h1>
        <p className="pending-desc">
          Your account <strong>{email}</strong> was created successfully.
          An administrator needs to approve it before you can access the workspace.
        </p>

        {/* Progress steps */}
        <div className="pending-steps">
          <div className="pending-step done"><CheckCircle size={15} /><span>Account created</span></div>
          <div className="pending-step done"><CheckCircle size={15} /><span>Email verified</span></div>
          <div className="pending-step pending"><Clock size={15} /><span>Admin approval</span></div>
          <div className="pending-step pending"><Clock size={15} /><span>Access granted</span></div>
        </div>

        {/* Error display */}
        {authError && (
          <div className="pending-error">
            <AlertTriangle size={14} />
            <span>{authError}</span>
          </div>
        )}

        {/* Debug: show current is_approved value */}
        {checked && profile && (
          <div className={`pending-debug ${profile.is_approved ? 'approved' : 'waiting'}`}>
            {profile.is_approved
              ? '✓ is_approved = true — try signing out and back in'
              : `✗ is_approved = false (role: ${profile.role}) — run the SQL below`}
          </div>
        )}

        {/* SQL hint */}
        <p className="pending-hint">If you are the admin, run this in <strong>Supabase → SQL Editor</strong>:</p>
        <div className="pending-sql">
          <code>
            UPDATE profiles<br />
            SET is_approved = true, role = 'admin'<br />
            WHERE email = '{email || 'your@email.com'}';
          </code>
        </div>

        <p className="pending-hint-sub">
          After running, click <strong>Check Again</strong> below — no page reload needed.
        </p>

        <div className="pending-actions">
          <button className="pending-check-btn" onClick={checkStatus} disabled={checking}>
            <RefreshCw size={15} className={checking ? 'spinning' : ''} />
            {checking ? 'Checking...' : 'Check Again'}
          </button>
          <button className="pending-signout-btn" onClick={signOut}>
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
