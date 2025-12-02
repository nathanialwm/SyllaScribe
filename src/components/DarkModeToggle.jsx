import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

export default function DarkModeToggle() {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(() => {
    // Check if already set in DOM (from main.jsx initialization)
    const isDarkInDOM = document.documentElement.hasAttribute('data-theme');
    if (isDarkInDOM) return true;
    
    // Check user settings first, then localStorage, then system preference
    if (user?.settings?.darkMode !== undefined) {
      return user.settings.darkMode;
    }
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) {
      return stored === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Sync with user settings when user changes
  useEffect(() => {
    if (user?.settings?.darkMode !== undefined) {
      setDarkMode(user.settings.darkMode);
    }
  }, [user?.settings?.darkMode]);

  useEffect(() => {
    // Apply dark mode
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('darkMode', 'false');
    }

    // Save to server if user is logged in
    if (user) {
      authAPI.updateSettings({ darkMode, notifications: user.settings?.notifications !== false })
        .catch(err => console.error('Failed to save dark mode setting:', err));
    }
  }, [darkMode, user]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  return (
    <button
      className="btn btn-outline-secondary"
      onClick={toggleDarkMode}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {darkMode ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

