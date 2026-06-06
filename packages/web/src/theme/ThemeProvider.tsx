/**
 * TeilFair Web Theme Provider
 * React context for managing theme across the web application
 */

import { type ReactNode } from 'react';
import { useTheme as useThemeHook } from './useTheme';
import { ThemeContext } from './ThemeContext';

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
