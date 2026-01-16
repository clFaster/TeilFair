/**
 * TeilFair Web Theme
 * Generates CSS variables from the shared theme
 */

import { themes, type ThemeMode } from '@teilfair/shared';

/**
 * Generates CSS variables string for a given theme mode
 */
export function generateCSSVariables(mode: ThemeMode): string {
  const theme = themes[mode];
  const { colors } = theme;

  return `
  /* Base colors */
  --clr-dark-a0: ${colors.dark};
  --clr-light-a0: ${colors.light};

  /* Theme primary colors */
  --clr-primary-a0: ${colors.primary.a0};
  --clr-primary-a10: ${colors.primary.a10};
  --clr-primary-a20: ${colors.primary.a20};
  --clr-primary-a30: ${colors.primary.a30};
  --clr-primary-a40: ${colors.primary.a40};
  --clr-primary-a50: ${colors.primary.a50};

  /* Theme surface colors */
  --clr-surface-a0: ${colors.surface.a0};
  --clr-surface-a10: ${colors.surface.a10};
  --clr-surface-a20: ${colors.surface.a20};
  --clr-surface-a30: ${colors.surface.a30};
  --clr-surface-a40: ${colors.surface.a40};
  --clr-surface-a50: ${colors.surface.a50};

  /* Theme tonal surface colors */
  --clr-surface-tonal-a0: ${colors.surfaceTonal.a0};
  --clr-surface-tonal-a10: ${colors.surfaceTonal.a10};
  --clr-surface-tonal-a20: ${colors.surfaceTonal.a20};
  --clr-surface-tonal-a30: ${colors.surfaceTonal.a30};
  --clr-surface-tonal-a40: ${colors.surfaceTonal.a40};
  --clr-surface-tonal-a50: ${colors.surfaceTonal.a50};

  /* Success colors */
  --clr-success-a0: ${colors.success.a0};
  --clr-success-a10: ${colors.success.a10};
  --clr-success-a20: ${colors.success.a20};

  /* Warning colors */
  --clr-warning-a0: ${colors.warning.a0};
  --clr-warning-a10: ${colors.warning.a10};
  --clr-warning-a20: ${colors.warning.a20};

  /* Danger colors */
  --clr-danger-a0: ${colors.danger.a0};
  --clr-danger-a10: ${colors.danger.a10};
  --clr-danger-a20: ${colors.danger.a20};

  /* Info colors */
  --clr-info-a0: ${colors.info.a0};
  --clr-info-a10: ${colors.info.a10};
  --clr-info-a20: ${colors.info.a20};

  /* Spacing */
  --spacing-xs: ${theme.spacing.xs}px;
  --spacing-sm: ${theme.spacing.sm}px;
  --spacing-md: ${theme.spacing.md}px;
  --spacing-lg: ${theme.spacing.lg}px;
  --spacing-xl: ${theme.spacing.xl}px;
  --spacing-xxl: ${theme.spacing.xxl}px;
  --spacing-xxxl: ${theme.spacing.xxxl}px;

  /* Border radius */
  --radius-none: ${theme.borderRadius.none}px;
  --radius-sm: ${theme.borderRadius.sm}px;
  --radius-md: ${theme.borderRadius.md}px;
  --radius-lg: ${theme.borderRadius.lg}px;
  --radius-xl: ${theme.borderRadius.xl}px;
  --radius-full: ${theme.borderRadius.full}px;

  /* Typography */
  --font-size-xs: ${theme.typography.fontSizes.xs}px;
  --font-size-sm: ${theme.typography.fontSizes.sm}px;
  --font-size-md: ${theme.typography.fontSizes.md}px;
  --font-size-lg: ${theme.typography.fontSizes.lg}px;
  --font-size-xl: ${theme.typography.fontSizes.xl}px;
  --font-size-xxl: ${theme.typography.fontSizes.xxl}px;
  --font-size-xxxl: ${theme.typography.fontSizes.xxxl}px;
  --font-size-display: ${theme.typography.fontSizes.display}px;

  --font-weight-light: ${theme.typography.fontWeights.light};
  --font-weight-regular: ${theme.typography.fontWeights.regular};
  --font-weight-medium: ${theme.typography.fontWeights.medium};
  --font-weight-semibold: ${theme.typography.fontWeights.semibold};
  --font-weight-bold: ${theme.typography.fontWeights.bold};

  --line-height-tight: ${theme.typography.lineHeights.tight};
  --line-height-normal: ${theme.typography.lineHeights.normal};
  --line-height-relaxed: ${theme.typography.lineHeights.relaxed};
  `.trim();
}

/**
 * Injects CSS variables into the document
 */
export function injectTheme(mode: ThemeMode = 'light'): void {
  const cssVariables = generateCSSVariables(mode);
  const root = document.documentElement;
  
  // Apply the CSS variables to :root
  const styleId = 'teilfair-theme-vars';
  let styleTag = document.getElementById(styleId) as HTMLStyleElement;
  
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = styleId;
    document.head.appendChild(styleTag);
  }
  
  styleTag.textContent = `:root {\n${cssVariables}\n}`;
  
  // Add data attribute for theme mode
  root.setAttribute('data-theme', mode);
}

/**
 * Gets the current theme mode from the document
 */
export function getCurrentTheme(): ThemeMode {
  const mode = document.documentElement.getAttribute('data-theme');
  return (mode === 'dark' ? 'dark' : 'light') as ThemeMode;
}

/**
 * Toggles between light and dark theme
 */
export function toggleTheme(): ThemeMode {
  const currentMode = getCurrentTheme();
  const newMode = currentMode === 'light' ? 'dark' : 'light';
  injectTheme(newMode);
  return newMode;
}
