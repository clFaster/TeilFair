export function productionTarget(value) {
  if (!value?.trim()) throw new Error('Scheduled system tests require the production BASE_URL repository variable.');
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
      || url.pathname !== '/' || url.hostname === 'localhost' || url.hostname.endsWith('.localhost')
      || url.hostname.endsWith('.local') || url.hostname === '[::1]' || /^127\./.test(url.hostname)) {
    throw new Error('Scheduled system tests require an HTTPS production site origin, without credentials or a path.');
  }
  return url.origin;
}
