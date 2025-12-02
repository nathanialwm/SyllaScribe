import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import SettingsModal from './SettingsModal';
import DarkModeToggle from './DarkModeToggle';
import { Settings, LogOut } from 'lucide-react';

export default function Navbar({ onShowAuth }) {
  const { user, logout } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary" role="navigation" aria-label="Main navigation">
        <div className="container-fluid px-3 px-md-4 px-lg-5">
          <a className="navbar-brand fw-bold fs-4" href="#" onClick={(e) => e.preventDefault()} aria-label="SyllaScribe Home">
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
            {user ? (
              <div className="d-flex align-items-center gap-3">
                <DarkModeToggle />
                <span className="text-light small" aria-label={`Signed in as ${user.name}`}>
                  {user.name}
                </span>
                <button 
                  className="btn btn-outline-light btn-sm"
                  onClick={() => setShowSettings(true)}
                  aria-label="Settings"
                >
                  <Settings size={18} />
                </button>
                <button 
                  className="btn btn-outline-light btn-sm"
                  onClick={logout}
                  aria-label="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div className="d-flex gap-2 align-items-center">
                <DarkModeToggle />
                <button 
                  className="btn btn-outline-light"
                  onClick={() => onShowAuth('login')}
                  aria-label="Login"
                >
                  Login
                </button>
                <button 
                  className="btn btn-light"
                  onClick={() => onShowAuth('signup')}
                  aria-label="Sign Up"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}