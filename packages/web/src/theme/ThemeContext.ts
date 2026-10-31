import { createContext, useContext } from 'react';
import { type ThemeMode, type Theme } from '@teilfair/shared';
import { type ThemePreference } from './useTheme';

export interface ThemeContextValue {
  theme: Theme;
  /** The resolved, active mode. */
  mode: ThemeMode;
  /** The user's choice; "system" until the user toggles. */
  preference: ThemePreference;
  toggleTheme: () => void;
  setThemePreference: (preference: ThemePreference) => void;
  isDark: boolean;
  isLight: boolean;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
