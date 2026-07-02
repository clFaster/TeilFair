/**
 * Theme change animation
 * Wraps theme mode switches in the View Transitions API (when available) to
 * produce a smooth cross-fade between the old and new colors, instead of
 * them flipping instantly.
 */

import type { ThemeMode } from '@teilfair/shared';
import { injectTheme } from './index';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Applies the new theme, cross-fading between the old and new colors when
 * the browser supports the View Transitions API.
 */
export function applyThemeWithTransition(newMode: ThemeMode): void {
  const applyDom = () => injectTheme(newMode);

  if (typeof document.startViewTransition === 'function' && !prefersReducedMotion()) {
    // injectTheme() mutates the DOM synchronously, so by the time this
    // callback returns the browser can correctly snapshot before/after.
    document.startViewTransition(applyDom);
  } else {
    applyDom();
  }
}
