/**
 * TeilFair Web Theme Hook
 * React hook for managing theme in web application
 */

import { useState, useEffect } from 'react';
import { themes, type ThemeMode, type Theme } from '@teilfair/shared';
import { injectTheme } from './index';
import { applyThemeWithTransition } from './themeTransition';

export type ThemePreference = 'light' | 'dark';

function getSystemTheme(): ThemeMode {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

/**
 * Hook for managing theme in the web application
 * Initializes with system preference, then allows toggling between light/dark
 */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('teilfair-theme-preference');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    // Initialize with system preference
    return getSystemTheme();
  });

  const theme: Theme = themes[mode];

  useEffect(() => {
    // Inject theme on mount and when mode changes
    injectTheme(mode);
    // Save preference to localStorage
    localStorage.setItem('teilfair-theme-preference', mode);
  }, [mode]);

  const toggleTheme = () => {
    const next: ThemeMode = mode === 'light' ? 'dark' : 'light';
    applyThemeWithTransition(next);
    setMode(next);
  };

  const setThemePreference = (newPreference: ThemePreference) => {
    if (newPreference === mode) return;
    applyThemeWithTransition(newPreference);
    setMode(newPreference);
  };

  return {
    theme,
    mode,
    toggleTheme,
    setThemePreference,
    isDark: mode === 'dark',
    isLight: mode === 'light',
  };
}
