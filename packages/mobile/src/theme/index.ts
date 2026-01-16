/**
 * TeilFair Mobile Theme
 * React Native theme configuration from shared theme
 */

import { themes, type ThemeMode, type Theme, type ColorPalette } from '@teilfair/shared';
import { ViewStyle, TextStyle, ImageStyle } from 'react-native';

/**
 * React Native compatible theme type
 */
export interface NativeTheme extends Theme {
  colors: ColorPalette & {
    text: string;
    textSecondary: string;
    background: string;
    card: string;
    border: string;
  };
}

/**
 * Creates a React Native compatible theme
 */
export function createNativeTheme(mode: ThemeMode): NativeTheme {
  const baseTheme = themes[mode];
  const { colors } = baseTheme;

  return {
    ...baseTheme,
    colors: {
      ...colors,
      // Convenience aliases for common use cases
      text: mode === 'dark' ? '#f0f5f4' : colors.dark,
      textSecondary: mode === 'dark' ? '#8a9996' : '#4a5754',
      background: colors.surface.a0,
      card: colors.surfaceTonal.a0,
      border: colors.surface.a20,
    },
  };
}

/**
 * Default native themes
 */
export const nativeThemes = {
  light: createNativeTheme('light'),
  dark: createNativeTheme('dark'),
} as const;

/**
 * Type for style creator function
 */
export type StyleCreator<T> = (theme: NativeTheme) => T;

/**
 * Helper type for React Native styles
 */
export type NamedStyles<T> = {
  [P in keyof T]: ViewStyle | TextStyle | ImageStyle;
};

/**
 * Creates styles with theme support
 * Usage: const styles = createStyles((theme) => ({ ... }))
 */
export function createStyles<T extends NamedStyles<T>>(
  styleCreator: StyleCreator<T>
): StyleCreator<T> {
  return styleCreator;
}

// Re-export theme types and utilities
export type { ThemeMode, Theme };
export { themes };
