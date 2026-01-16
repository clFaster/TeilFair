/**
 * Theme Settings Component
 * Allows users to switch between light, dark, and system theme preferences
 */

import { useTheme } from '../theme/ThemeProvider';
import type { ThemePreference } from '../theme/useTheme';

export function ThemeSettings() {
  const { preference, setThemePreference, mode } = useTheme();

  const options: { value: ThemePreference; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'system', label: 'System', icon: '💻' },
  ];

  return (
    <div className="theme-settings">
      <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
        Theme
      </h3>
      <div style={{ display: 'flex', gap: '8px' }}>
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => setThemePreference(option.value)}
            className={preference === option.value ? 'theme-btn active' : 'theme-btn'}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: preference === option.value 
                ? '2px solid var(--color-primary)' 
                : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              fontWeight: preference === option.value ? '600' : '400',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: '24px' }}>{option.icon}</span>
            <span style={{ fontSize: '12px' }}>{option.label}</span>
          </button>
        ))}
      </div>
      {preference === 'system' && (
        <p style={{ 
          marginTop: '8px', 
          fontSize: '12px', 
          color: 'var(--color-text-muted)',
          textAlign: 'center'
        }}>
          Currently using: {mode}
        </p>
      )}
    </div>
  );
}
