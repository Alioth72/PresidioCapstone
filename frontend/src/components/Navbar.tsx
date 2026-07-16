import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { LogOut, BookOpen, User as UserIcon, ShieldAlert, Sun, Moon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, theme, toggleTheme } = useStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav style={{
      borderBottom: 'var(--border-width) solid var(--border-color)',
      backgroundColor: 'var(--card-bg)',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 100
    }}>
      <Link to="/" style={{
        textDecoration: 'none',
        color: 'var(--text-color)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{
          backgroundColor: 'var(--primary)',
          border: 'var(--border-width) solid var(--border-color)',
          padding: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'rotate(-3deg)',
          boxShadow: '2px 2px 0px var(--border-color)'
        }}>
          <BookOpen size={24} strokeWidth={2.5} />
        </div>
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 900,
          fontSize: '1.5rem',
          letterSpacing: '-0.02em',
          textTransform: 'uppercase',
          color: 'var(--text-color)'
        }}>
          Bibliotech
        </span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Navigation Links */}
        {user && (
          <>
            <Link to="/" className="brut-btn brut-btn-flat" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
              Catalog
            </Link>
            <Link to="/dashboard" className="brut-btn brut-btn-flat" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
              Dashboard
            </Link>

            {/* User Profile Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: 'var(--border-width) solid var(--border-color)',
              padding: '0.4rem 0.8rem',
              backgroundColor: user.role === 'admin' ? 'var(--accent)' : 'var(--secondary)',
              fontWeight: 700,
              fontSize: '0.9rem',
              boxShadow: '2px 2px 0px var(--border-color)',
              color: '#000000'
            }}>
              {user.role === 'admin' ? <ShieldAlert size={16} /> : <UserIcon size={16} />}
              <span>{user.username}</span>
              <span style={{
                fontSize: '0.7rem',
                backgroundColor: '#FFFFFF',
                color: '#000000',
                border: '1.5px solid #000000',
                padding: '0.1rem 0.3rem',
                textTransform: 'uppercase',
                marginLeft: '0.25rem'
              }}>
                {user.role}
              </span>
            </div>
          </>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="brut-btn brut-btn-flat"
          style={{
            padding: '0.5rem',
            border: 'var(--border-width) solid var(--border-color)',
            backgroundColor: 'var(--primary)',
            boxShadow: '2px 2px 0px var(--border-color)',
            color: '#000000'
          }}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={18} strokeWidth={2.5} /> : <Sun size={18} strokeWidth={2.5} />}
        </button>

        {/* Logout Button */}
        {user && (
          <button
            onClick={handleLogout}
            className="brut-btn brut-btn-flat"
            style={{
              padding: '0.5rem',
              border: 'var(--border-width) solid var(--border-color)',
              backgroundColor: 'var(--bg-color)',
              boxShadow: '2px 2px 0px var(--border-color)'
            }}
            title="Log Out"
          >
            <LogOut size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </nav>
  );
};

