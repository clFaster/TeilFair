/**
 * Example: Using TeilFair Theme in a Web Component
 */

import { useTheme } from '../theme/ThemeProvider';

export function ExampleThemeUsage() {
  const { theme, mode, toggleTheme, isDark } = useTheme();

  return (
    <div 
      style={{
        backgroundColor: theme.colors.surface.a0,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
      }}
    >
      <h1 style={{ color: isDark ? theme.colors.light : theme.colors.dark }}>
        TeilFair Theme Example
      </h1>
      
      <p style={{ color: theme.colors.surface.a50 }}>
        Current mode: {mode}
      </p>

      <button
        onClick={toggleTheme}
        style={{
          backgroundColor: theme.colors.primary.a0,
          color: theme.colors.light,
          padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
          borderRadius: theme.borderRadius.sm,
          border: 'none',
          cursor: 'pointer',
          fontWeight: theme.typography.fontWeights.medium,
        }}
      >
        Switch to {isDark ? 'Light' : 'Dark'} Mode
      </button>

      <div style={{ marginTop: theme.spacing.lg }}>
        <h2>Using Utility Classes:</h2>
        <div className="bg-primary rounded-lg p-md shadow-sm">
          <p className="text-lg font-semibold">Primary Background</p>
        </div>
        
        <div className="bg-surface rounded-lg p-md shadow-sm" style={{ marginTop: theme.spacing.sm }}>
          <p className="text-success font-medium">Success Message</p>
          <p className="text-danger font-medium">Error Message</p>
          <p className="text-warning font-medium">Warning Message</p>
          <p className="text-info font-medium">Info Message</p>
        </div>
      </div>
    </div>
  );
}
