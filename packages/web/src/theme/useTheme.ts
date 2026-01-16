/**
 * TeilFair Web Theme Hook
 * React hook for managing theme in web application
 */

import { useState, useEffect } from 'react';
import { themes, type ThemeMode, type Theme } from '@teilfair/shared';
import { injectTheme } from './index';

export type ThemePreference = 'light' | 'dark' | 'system';

function getSystemTheme(): ThemeMode {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

/**
 * Hook for managing theme in the web application
 */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem('teilfair-theme-preference');
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      return saved;
    }
    return 'system';
  });

  const [systemTheme, setSystemTheme] = useState<ThemeMode>(getSystemTheme);

  // Determine actual mode based on preference
  const mode: ThemeMode = preference === 'system' ? systemTheme : preference;
  const theme: Theme = themes[mode];

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    // Inject theme on mount and when mode changes
    injectTheme(mode);
    // Save preference to localStorage
    localStorage.setItem('teilfair-theme-preference', preference);
  }, [mode, preference]);

  const toggleTheme = () => {
    setPreference((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  };

  const setThemePreference = (newPreference: ThemePreference) => {
    setPreference(newPreference);
  };

  return {
    theme,
    mode,
    preference,
    toggleTheme,
    setThemePreference,
    isDark: mode === 'dark',
    isLight: mode === 'light',
  };
}
