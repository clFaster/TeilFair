import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';

interface ThemeToggleButtonProps {
  mode: 'light' | 'dark';
  onToggle: () => void;
  title: string;
  size?: number;
}

export function ThemeToggleButton({ mode, onToggle, title, size = 18 }: Readonly<ThemeToggleButtonProps>) {
  return (
    <button className="theme-toggle" onClick={onToggle} title={title}>
      <FontAwesomeIcon icon={mode === 'dark' ? faMoon : faSun} style={{ fontSize: `${size}px` }} />
    </button>
  );
}
