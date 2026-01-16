/**
 * TeilFair Web Theme Provider
 * React context for managing theme across the web application
 */

import { createContext, useContext, type ReactNode } from 'react';
import { type ThemeMode, type Theme } from '@teilfair/shared';
import { useTheme as useThemeHook, type ThemePreference } from './useTheme';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  toggleTheme: () => void;
  setThemePreference: (preference: ThemePreference) => void;
  isDark: boolean;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Theme Provider component
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeValue = useThemeHook();

  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
