import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

interface FabProps {
  icon: IconDefinition;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
}

/** Extended floating action button, sits above the mobile tab bar. */
export function Fab({ icon, label, onClick, disabled, testId }: Readonly<FabProps>) {
  return (
    <button type="button" className="fab" onClick={onClick} disabled={disabled} data-testid={testId}>
      <FontAwesomeIcon icon={icon} className="fab-icon" aria-hidden="true" />
      <span className="fab-label">{label}</span>
    </button>
  );
}
