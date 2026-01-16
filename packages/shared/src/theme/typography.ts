/**
 * TeilFair Typography System
 */

export const typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 48,
  },
  
  fontWeights: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export type FontSizeKey = keyof typeof typography.fontSizes;
export type FontWeightKey = keyof typeof typography.fontWeights;
export type LineHeightKey = keyof typeof typography.lineHeights;
