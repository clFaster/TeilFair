/**
 * After a deploy, a tab that is still open asks for route chunks the new build no longer has.
 * Vite reports the failed import as `vite:preloadError`; one reload fetches the new build.
 *
 * The time of that reload is kept in sessionStorage (a timestamp, nothing else). A chunk that
 * fails again shortly after it is left to the error boundary instead of reloading in a loop.
 */
const RELOAD_KEY = 'teilfair-chunk-reload';
const RELOAD_GUARD_MS = 60_000;

let reloading = false;

function claimReload(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY));
    if (Date.now() - last < RELOAD_GUARD_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    return true;
  } catch {
    // Without storage a repeated failure cannot be recognized, so never reload.
    return false;
  }
}

/** True once the reload has started. The failed import still reaches the error boundary. */
export function isChunkReloadPending(): boolean {
  return reloading;
}

export function reloadOnMissingChunk(): void {
  window.addEventListener('vite:preloadError', () => {
    if (reloading || !claimReload()) return;
    reloading = true;
    window.location.reload();
  });
}
