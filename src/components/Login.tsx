import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import './Login.css';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the login link! Or if email confirmation is off, you can log in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Personal Knowledge</h1>
        <p className="login-subtitle">Your private thinking environment.</p>
        
        {error && <div className="login-error">{error}</div>}
        
        <form onSubmit={handleAuth} className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="login-input"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="login-input"
            required
          />
          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>
        
        <div className="login-toggle">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" className="toggle-btn" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};
