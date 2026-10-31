// Upgrade legacy query links before React and telemetry load. Old links still
// reach the host once; all newly created links keep capabilities in the fragment.
(function () {
  var url = new URL(window.location.href);
  if (!/^\/g\/[^/]+\/?$/.test(url.pathname)) return;
  var token = url.searchParams.get('t');
  if (!token) return;
  url.searchParams.delete('t');
  var fragment = new URLSearchParams(url.hash.slice(1));
  if (!fragment.get('t')) fragment.set('t', token);
  url.hash = fragment.toString();
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
})();

(function () {
  var KEY = 'teilfair-theme-preference';
  var COLORS = { light: '#ffffff', dark: '#0a1110' };
  var mode = null;
  try {
    var stored = window.localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') mode = stored;
  } catch (e) {}
  if (!mode) {
    mode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', mode);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', COLORS[mode]);
})();
