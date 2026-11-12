export function RouteFallback() {
  return (
    <div className="route-loading" aria-busy="true">
      <div className="route-loading-spinner" />
    </div>
  );
}
