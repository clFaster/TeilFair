import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

interface EmptyStateProps {
  icon: IconDefinition;
  title: ReactNode;
  description?: ReactNode;
  /** Call to action, e.g. a button or link. */
  action?: ReactNode;
  /** Small eyebrow above the title, e.g. "404". */
  code?: string;
  tone?: 'primary' | 'warning' | 'danger' | 'muted';
  /** `page` is a standalone card (status pages), `inline` sits inside a panel. */
  variant?: 'page' | 'inline';
  titleAs?: 'h1' | 'h2' | 'h3';
  role?: 'alert' | 'status';
  className?: string;
  testId?: string;
}

/** Friendly illustrated state with an optional call to action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  code,
  tone = 'primary',
  variant = 'inline',
  titleAs: Title = 'h2',
  role,
  className,
  testId,
}: Readonly<EmptyStateProps>) {
  const classes = ['state-card', `state-card-${variant}`, variant === 'page' ? 'card' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} role={role} data-testid={testId}>
      <span className={`state-card-icon state-card-icon-${tone}`} aria-hidden="true">
        <FontAwesomeIcon icon={icon} />
      </span>
      {code && <span className="state-card-code">{code}</span>}
      <Title className="state-card-title">{title}</Title>
      {description && <p className="state-card-text">{description}</p>}
      {action && <div className="state-card-actions">{action}</div>}
    </div>
  );
}
