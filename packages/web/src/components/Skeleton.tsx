interface SkeletonProps {
  shape?: 'line' | 'circle' | 'block';
  className?: string;
}

/** Shimmering placeholder. Purely decorative; announce loading on the container. */
export function Skeleton({ shape = 'line', className }: Readonly<SkeletonProps>) {
  return <span className={['skeleton', `skeleton-${shape}`, className].filter(Boolean).join(' ')} />;
}

const LIST_ROWS = [0, 1, 2, 3];

interface GroupPageSkeletonProps {
  label: string;
}

/** Placeholder that mirrors the group page layout while it loads. */
export function GroupPageSkeleton({ label }: Readonly<GroupPageSkeletonProps>) {
  return (
    <main className="group-shell" role="status" aria-busy="true" data-testid="group-loading">
      <span className="sr-only">{label}</span>

      <div className="group-main" aria-hidden="true">
        <div className="group-hero">
          <div className="group-hero-main">
            <Skeleton className="skeleton-title" />
            <Skeleton className="skeleton-w-50" />
          </div>
          <div className="group-hero-total">
            <Skeleton className="skeleton-w-label" />
            <Skeleton className="skeleton-amount" />
          </div>
        </div>

        <div className="card group-panel">
          <Skeleton shape="block" className="skeleton-tabs" />
          {LIST_ROWS.map((row) => (
            <div key={row} className="skeleton-row">
              <Skeleton shape="circle" />
              <div className="skeleton-row-text">
                <Skeleton className="skeleton-w-60" />
                <Skeleton className="skeleton-w-40" />
              </div>
              <Skeleton className="skeleton-w-amount" />
            </div>
          ))}
        </div>
      </div>

      <div className="group-aside skeleton-aside" aria-hidden="true">
        <div className="side-panel-card">
          <Skeleton className="skeleton-w-40" />
          <Skeleton shape="block" className="skeleton-stats" />
          {LIST_ROWS.slice(0, 3).map((row) => (
            <Skeleton key={row} shape="block" className="skeleton-balance" />
          ))}
        </div>
      </div>
    </main>
  );
}
