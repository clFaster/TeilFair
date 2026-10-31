import { useCallback, useSyncExternalStore } from 'react';

/** Desktop layout (side panel, no bottom tab bar). Mirrors the CSS breakpoint. */
export const DESKTOP_QUERY = '(min-width: 1024px)';

/**
 * Subscribe to a CSS media query via `matchMedia`.
 * Only use it where markup differs; pure styling belongs in CSS.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query]
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
