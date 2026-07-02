import type { ReactNode } from 'react';

interface AppHeaderProps {
  left: ReactNode;
  right?: ReactNode;
}

export function AppHeader({ left, right }: Readonly<AppHeaderProps>) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">{left}</div>
        {right ? <div className="header-actions">{right}</div> : null}
      </div>
    </header>
  );
}
