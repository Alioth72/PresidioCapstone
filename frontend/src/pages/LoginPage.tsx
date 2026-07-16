import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { authApi } from '../api';
import { BookOpen, UserPlus, LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, showToast } = useStore();
  const navigate = useNavigate();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showToast('Username and Password are required.', 'error');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(username, password);
        navigate('/');
      } else {
        // Register flow
        if (!email.trim()) {
          showToast('Email is required for registration.', 'error');
          setLoading(false);
          return;
        }
        await authApi.register({
          username,
          email,
          full_name: fullName || undefined,
          password,
          role
        });
        showToast('Registration successful! Please login.', 'success');
        setIsLogin(true); // Switch to login mode
        setPassword('');
      }
    } catch (err: any) {
      // Toast notification is fired in store or we catch here
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem'
    }}>
      <div className="brut-card" style={{
        width: '450px',
        maxWidth: '100%',
        backgroundColor: '#FFFFFF',
        boxShadow: '8px 8px 0px #000000',
        padding: '2.5rem'
      }}>
        {/* Header Icon */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            backgroundColor: 'var(--primary)',
            border: 'var(--border-width) solid var(--border-color)',
            padding: '1rem',
            borderRadius: '0%',
            transform: 'rotate(-4deg)',
            boxShadow: '4px 4px 0px #000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BookOpen size={40} strokeWidth={2.5} />
          </div>
        </div>

        {/* Title */}
        <h2 style={{
          textAlign: 'center',
          fontFamily: 'var(--font-heading)',
          fontSize: '1.8rem',
          marginBottom: '1.5rem',
          textTransform: 'uppercase'
        }}>
          {isLogin ? 'LOG IN TO BIBLIOTECH' : 'CREATE ACCOUNT'}
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              Username
            </label>
            <input
              type="text"
              className="brut-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. libraryuser"
              required
            />
          </div>

          {!isLogin && (
            <>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  className="brut-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. user@example.com"
                  required={!isLogin}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  className="brut-input"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  System Role
                </label>
                <select
                  className="brut-input brut-input-select"
                  value={role}
                  onChange={e => setRole(e.target.value as 'member' | 'admin')}
                  style={{ fontWeight: 600 }}
                >
                  <option value="member">Member (Borrow, Return, Chat)</option>
                  <option value="admin">Admin (Manage Catalog & Loans)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              Password
            </label>
            <input
              type="password"
              className="brut-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="brut-btn brut-btn-primary"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              justifyContent: 'center',
              width: '100%',
              padding: '0.9rem'
            }}
          >
            {loading ? 'PROCESSING...' : isLogin ? (
              <>
                SIGN IN <LogIn size={18} />
              </>
            ) : (
              <>
                REGISTER ACCOUNT <UserPlus size={18} />
              </>
            )}
          </button>

          {/* Toggle */}
          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              style={{
                background: 'none',
                border: 'none',
                color: '#4B5563',
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'underline'
              }}
            >
              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
