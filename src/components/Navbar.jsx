import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeContext';

export default function Navbar({ onShowAuth }) {
  // Grabs theme state & toggle method from ThemeContext.
  const { theme, toggleTheme } = useTheme();
  return (
    <>
      <style>{`
        .navbar .navbar-brand {
          color: ${theme === 'light' ? '#ffffff' : '#000000'} !important;
        }
        .navbar #login-btn,
        .navbar #signup-btn,
        .navbar #theme-toggle-btn {
          color: ${theme === 'light' ? '#ffffff' : '#000000'} !important;
        }
        .navbar #theme-toggle-btn svg {
          color: ${theme === 'light' ? '#ffffff' : '#000000'} !important;
          stroke: ${theme === 'light' ? '#ffffff' : '#000000'} !important;
        }
      `}</style>
      <nav className="navbar navbar-expand-lg" style={{ backgroundColor: 'var(--primary)' }}>
        <div className="container-fluid px-3 px-md-4 px-lg-5">
          <a className="navbar-brand fw-bold fs-4" href="#" onClick={(e) => e.preventDefault()}>
            SyllaScribe
          </a>
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav" 
          aria-controls="navbarNav" 
          aria-expanded="false" 
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
          <div className="d-flex gap-2 align-items-center">
            <button 
              id="login-btn"
              className="btn"
              onClick={() => onShowAuth('login')}
              style={{ 
                backgroundColor: 'transparent',
                borderColor: 'var(--card-border)',
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              Login
            </button>
            <button 
              id="signup-btn"
              className="btn"
              onClick={() => onShowAuth('signup')}
              style={{ 
                backgroundColor: 'transparent',
                borderColor: 'var(--card-border)',
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              Sign Up
            </button>
            {/* The theme toggle button uses a sun/moon icon and calls toggleTheme().
                */}
            <button
              id="theme-toggle-btn"
              type="button"
              className="btn btn-outline-light"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-pressed={theme === 'dark'}
              onClick={(e) => { console.debug('[Navbar] toggle clicked', theme); toggleTheme(); }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </div>
    </nav>
    </>
  );
}