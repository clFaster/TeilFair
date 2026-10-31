/**
 * TeilFair Web Theme Hook
 * React hook for managing theme in web application
 */

import { useState, useEffect, useCallback } from 'react';
import { themes, type ThemeMode, type Theme } from '@teilfair/shared';
import { injectTheme } from './index';
import { applyThemeWithTransition } from './themeTransition';
import {
  DARK_SCHEME_QUERY,
  THEME_STORAGE_KEY,
  getSystemMode,
  readStoredPreference,
  resolveMode,
  writeStoredPreference,
  type ThemePreference,
} from './preference';

export type { ThemePreference } from './preference';

/**
 * Hook for managing theme in the web application.
 * - Starts on "system": follows prefers-color-scheme (also live OS changes).
 * - Nothing is persisted until the user picks a theme via the toggle.
 * - The first paint is already themed by the inline script in index.html.
 */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readStoredPreference);
  const [systemMode, setSystemMode] = useState<ThemeMode>(getSystemMode);

  const mode: ThemeMode = resolveMode(preference, systemMode);
  const theme: Theme = themes[mode];

  // Follow OS theme changes (only affects the result while preference is "system").
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(DARK_SCHEME_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemMode(event.matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // Keep other open tabs in sync with an explicit choice.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === THEME_STORAGE_KEY) {
        setPreference(readStoredPreference());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Apply data-theme + theme-color whenever the resolved mode changes.
  useEffect(() => {
    injectTheme(mode);
  }, [mode]);

  const setThemePreference = useCallback(
    (newPreference: ThemePreference) => {
      writeStoredPreference(newPreference);
      const nextMode = resolveMode(newPreference, systemMode);
      if (nextMode !== mode) {
        applyThemeWithTransition(nextMode);
      }
      setPreference(newPreference);
    },
    [mode, systemMode],
  );

  const toggleTheme = useCallback(() => {
    setThemePreference(mode === 'light' ? 'dark' : 'light');
  }, [mode, setThemePreference]);

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
