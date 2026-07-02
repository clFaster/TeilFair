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
    <button className="theme-toggle app-header-icon" onClick={onToggle} title={title}>
      {/* key={mode} forces remount so the icon-swap CSS animation replays on every toggle */}
      <FontAwesomeIcon
        key={mode}
        icon={mode === 'dark' ? faMoon : faSun}
        className="theme-toggle-icon"
        style={{ fontSize: `${size}px` }}
      />
    </button>
  );
}
