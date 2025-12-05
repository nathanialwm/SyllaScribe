import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => { // Default to light mode on initial load.
  const getInitialTheme = () => {
    try {
      const storedTheme = localStorage.getItem('theme');
      return storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : 'light';
    } catch (e) {
      return 'light';
    }
  };
  const [theme, setTheme] = useState(getInitialTheme);


  const applyTheme = useCallback((t) => {
    const root = document.documentElement;
    const body = document.body;

    root.setAttribute('data-theme', t);
    body.setAttribute('data-theme', t);

    document.body.classList.toggle('theme-dark', t === 'dark');
    document.body.classList.toggle('theme-light', t === 'light');
    try { console.debug(`[Theme] applied ${t} to :root (data-theme)`); } catch(e) {}
  }, []);

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
  }, [theme, applyTheme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try { console.debug(`[Theme] toggling from ${prev} to ${next}`); } catch(e) {}
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
