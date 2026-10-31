/**
 * Theme preference helpers shared by the React hook and the theme DOM helpers.
 *
 * IMPORTANT: index.html contains an inline pre-paint script that mirrors
 * THEME_STORAGE_KEY, THEME_COLORS and the resolution logic below so the right
 * theme is applied before the first paint. Keep both in sync.
 */

import type { ThemeMode } from '@teilfair/shared';

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'teilfair-theme-preference';

export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

/** Browser UI color (theme-color meta) per mode; mirrored in the index.html pre-paint script. */
export const THEME_COLORS: Record<ThemeMode, string> = {
  light: '#ffffff',
  dark: '#0a1110',
};

export function getSystemMode(): ThemeMode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia(DARK_SCHEME_QUERY).matches ? 'dark' : 'light';
}

/** Reads the explicit user choice. Anything else (nothing stored yet) means "system". */
export function readStoredPreference(): ThemePreference {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // Storage can be unavailable (privacy mode, blocked cookies) - fall back to system.
  }
  return 'system';
}

/** Persists an explicit choice; "system" clears it so the OS setting is followed again. */
export function writeStoredPreference(preference: ThemePreference): void {
  try {
    if (preference === 'system') {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  } catch {
    // Ignore - the choice still applies for this session.
  }
}

export function resolveMode(preference: ThemePreference, systemMode: ThemeMode = getSystemMode()): ThemeMode {
  return preference === 'system' ? systemMode : preference;
}
