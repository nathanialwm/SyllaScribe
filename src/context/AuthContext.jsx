import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(authAPI.getCurrentUser());
  const [loading, setLoading] = useState(false);

  // Apply dark mode on mount and when user changes
  useEffect(() => {
    const applyDarkMode = () => {
      const darkMode = user?.settings?.darkMode || localStorage.getItem('darkMode') === 'true';
      if (darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    };

    applyDarkMode();
  }, [user]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      console.log('AuthContext: Attempting login for:', email);
      const data = await authAPI.login(email, password);
      console.log('AuthContext: Login successful, user data:', data.user);
      setUser(data.user);
      // Apply dark mode if user has it enabled
      if (data.user?.settings?.darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
      return { success: true };
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      const errorMessage = error.message || 'Login failed. Please check your credentials.';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      console.log('AuthContext: Attempting registration for:', email);
      const data = await authAPI.register(email, password, name);
      console.log('AuthContext: Registration successful, user data:', data.user);
      setUser(data.user);
      // Apply dark mode if user has it enabled
      if (data.user?.settings?.darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
      return { success: true };
    } catch (error) {
      console.error('AuthContext: Registration error:', error);
      const errorMessage = error.message || 'Registration failed. Please try again.';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
  };

  const value = { user, loading, login, register, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


