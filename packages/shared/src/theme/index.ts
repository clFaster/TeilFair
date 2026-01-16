/**
 * TeilFair Theme System
 * Centralized theme configuration for web and mobile
 */

import { darkColors, lightColors, ColorPalette } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';
import { borderRadius } from './borderRadius';
import { shadows, cssShadows } from './shadows';

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  colors: ColorPalette;
  spacing: typeof spacing;
  typography: typeof typography;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
}

/**
 * Creates a theme object based on the mode
 */
export function createTheme(mode: ThemeMode): Theme {
  return {
    mode,
    colors: mode === 'dark' ? darkColors : lightColors,
    spacing,
    typography,
    borderRadius,
    shadows,
  };
}

/**
 * Default themes
 */
export const themes = {
  light: createTheme('light'),
  dark: createTheme('dark'),
} as const;

// Export all theme components
export { darkColors, lightColors, spacing, typography, borderRadius, shadows, cssShadows };
export type { ColorPalette };
