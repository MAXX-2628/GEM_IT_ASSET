import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import api from '../api/client';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('gem-theme-mode') || 'system';
  });

  const [primaryColor, setPrimaryColor] = useState(() => {
    return localStorage.getItem('gem-primary-color') || '#FF6A00';
  });

  const isFirstRender = useRef(true);

  // Fetch settings from server on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/settings');
        if (data.success && data.data) {
          const { themeMode: serverMode, primaryColor: serverColor } = data.data;
          if (serverMode) {
            setThemeMode(serverMode);
            localStorage.setItem('gem-theme-mode', serverMode);
          }
          if (serverColor) {
            setPrimaryColor(serverColor);
            localStorage.setItem('gem-primary-color', serverColor);
          }
        }
      } catch (err) {
        console.warn('Could not fetch server settings, using local defaults.', err);
      }
    };
    fetchSettings();
  }, []);

  // Save settings with debounce
  const saveSettings = useCallback(async (mode, color) => {
    try {
      await api.post('/settings', { themeMode: mode, primaryColor: color });
    } catch (err) {
      console.error('Failed to save settings to server:', err);
    }
  }, []);

  // Apply theme mode
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = (mode) => {
      root.removeAttribute('data-theme');
      if (mode === 'dark' || (mode === 'system' && mediaQuery.matches)) {
        root.setAttribute('data-theme', 'dark');
      }
    };

    applyTheme(themeMode);
    localStorage.setItem('gem-theme-mode', themeMode);

    if (themeMode === 'system') {
      const listener = () => applyTheme('system');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }

    if (!isFirstRender.current) {
      const timeoutId = setTimeout(() => saveSettings(themeMode, primaryColor), 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [themeMode, primaryColor, saveSettings]);

  // Apply primary color
  useEffect(() => {
    const root = window.document.documentElement;
    root.style.setProperty('--primary', primaryColor);
    
    const r = parseInt(primaryColor.slice(1, 3), 16);
    const g = parseInt(primaryColor.slice(3, 5), 16);
    const b = parseInt(primaryColor.slice(5, 7), 16);
    root.style.setProperty('--primary-glow', `rgba(${r}, ${g}, ${b}, 0.4)`);
    
    localStorage.setItem('gem-primary-color', primaryColor);

    if (!isFirstRender.current) {
        const timeoutId = setTimeout(() => saveSettings(themeMode, primaryColor), 1000);
        return () => clearTimeout(timeoutId);
    } else {
        isFirstRender.current = false;
    }
  }, [primaryColor, themeMode, saveSettings]);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, primaryColor, setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
};
