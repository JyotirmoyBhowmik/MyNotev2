import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { LogOut, Clock, RefreshCw, CheckCircle } from 'lucide-react';
import './PendingApproval.css';

export function PendingApproval() {
  const { signOut, checkApproval } = useAuthStore();
  const [checking, setChecking] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email || '');
    });
  }, []);

  const checkStatus = async () => {
    setChecking(true);
    await checkApproval();
    setTimeout(() => setChecking(false), 1000);
  };

  return (
    <div className="pending-container">
      {/* Animated background blobs */}
      <div className="pending-blob pending-blob-1" />
      <div className="pending-blob pending-blob-2" />

      <div className="pending-card">
        {/* Status icon */}
        <div className="pending-icon-wrap">
          <Clock className="pending-icon" size={32} />
          <div className="pending-icon-ring" />
        </div>

        <h1 className="pending-title">Awaiting Approval</h1>
        <p className="pending-desc">
          Your account <strong>{email}</strong> has been created successfully.
          An administrator needs to approve it before you can access the workspace.
        </p>

        <div className="pending-steps">
          <div className="pending-step done">
            <CheckCircle size={16} />
            <span>Account created</span>
          </div>
          <div className="pending-step done">
            <CheckCircle size={16} />
            <span>Email verified</span>
          </div>
          <div className="pending-step pending">
            <Clock size={16} />
            <span>Admin approval</span>
          </div>
          <div className="pending-step pending">
            <Clock size={16} />
            <span>Access granted</span>
          </div>
        </div>

        <p className="pending-hint">
          If you are the first user, run this in your Supabase SQL editor:
        </p>
        <div className="pending-sql">
          <code>UPDATE profiles SET is_approved=true, role='admin'<br/>WHERE email='{email || 'your@email.com'}';</code>
        </div>

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
