import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import './Login.css'; // Reuse login styles

export const PasswordReset: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => {
        window.location.href = window.location.origin + '/notes';
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />

      <div className="login-card">
        <div className="login-logo">🔒</div>
        <h1 className="login-title">Reset Password</h1>
        <p className="login-subtitle">Enter your new workspace credentials</p>

        {error && <div className="login-error">⚠ {error}</div>}
        {success && <div className="login-success">✓ Password updated! Redirecting...</div>}

        {!success && (
          <form onSubmit={handleReset} className="login-form">
            <div className="login-field">
              <label className="login-label">New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="login-input"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="login-field">
              <label className="login-label">Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="login-input"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Processing...' : '✦ Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
