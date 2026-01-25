import type { ReactNode } from 'react';

interface AppHeaderProps {
  left: ReactNode;
  right?: ReactNode;
  wide?: boolean;
}

export function AppHeader({ left, right, wide = false }: Readonly<AppHeaderProps>) {
  const contentClassName = wide ? 'header-content header-content-wide' : 'header-content';

  return (
    <header className="header">
      <div className={contentClassName}>
        <div className="header-left">{left}</div>
        {right ? <div className="header-actions">{right}</div> : null}
      </div>
    </header>
  );
}
