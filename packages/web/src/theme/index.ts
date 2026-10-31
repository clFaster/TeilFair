/**
 * TeilFair Web Theme
 * Design tokens live in theme.css (the single source of truth on web).
 * These helpers only switch the active mode on the document.
 */

import type { ThemeMode } from '@teilfair/shared';
import { THEME_COLORS } from './preference';

/**
 * Keeps the browser UI color (address bar / status bar) in sync with the theme.
 * Uses a single theme-color meta tag, creating it if it is missing.
 */
export function syncThemeColorMeta(mode: ThemeMode): void {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = THEME_COLORS[mode];
}

/**
 * Applies a theme mode: sets data-theme on <html> (which switches the token set
 * in theme.css) and updates the theme-color meta.
 */
export function injectTheme(mode: ThemeMode = 'light'): void {
  const root = document.documentElement;
  if (root.getAttribute('data-theme') !== mode) {
    root.setAttribute('data-theme', mode);
  }
  syncThemeColorMeta(mode);
}

/**
 * Gets the current theme mode from the document
 */
export function getCurrentTheme(): ThemeMode {
  const mode = document.documentElement.getAttribute('data-theme');
  return mode === 'dark' ? 'dark' : 'light';
}

/**
 * Toggles between light and dark theme
 */
export function toggleTheme(): ThemeMode {
  const currentMode = getCurrentTheme();
  const newMode = currentMode === 'light' ? 'dark' : 'light';
  injectTheme(newMode);
  return newMode;
}
