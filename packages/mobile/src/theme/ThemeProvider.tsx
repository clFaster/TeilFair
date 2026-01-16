/**
 * TeilFair Mobile Theme Provider
 * React context for managing theme across the mobile application
 */

import { createContext, useContext, type ReactNode } from 'react';
import { type ThemeMode } from '@teilfair/shared';
import { type NativeTheme } from './index';
import { useTheme as useThemeHook, type ThemePreference } from './useTheme';

interface ThemeContextValue {
  theme: NativeTheme;
  mode: ThemeMode;
  preference: ThemePreference;
  systemColorScheme: 'light' | 'dark' | null | undefined;
  toggleTheme: () => Promise<void>;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
  isDark: boolean;
  isLight: boolean;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Theme Provider component for React Native
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
