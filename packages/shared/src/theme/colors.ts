/**
 * TeilFair Color Palette
 * Defines the color system for both light and dark themes
 */

export interface ColorPalette {
  // Base colors
  dark: string;
  light: string;
  
  // Primary colors
  primary: {
    a0: string;
    a10: string;
    a20: string;
    a30: string;
    a40: string;
    a50: string;
  };
  
  // Surface colors
  surface: {
    a0: string;
    a10: string;
    a20: string;
    a30: string;
    a40: string;
    a50: string;
  };
  
  // Tonal surface colors
  surfaceTonal: {
    a0: string;
    a10: string;
    a20: string;
    a30: string;
    a40: string;
    a50: string;
  };
  
  // Status colors
  success: {
    a0: string;
    a10: string;
    a20: string;
  };
  
  warning: {
    a0: string;
    a10: string;
    a20: string;
  };
  
  danger: {
    a0: string;
    a10: string;
    a20: string;
  };
  
  info: {
    a0: string;
    a10: string;
    a20: string;
  };
}

/**
 * Dark theme color palette
 */
export const darkColors: ColorPalette = {
  // Base colors
  dark: '#000000',
  light: '#ffffff',
  
  // Primary colors
  primary: {
    a0: '#7632a6',
    a10: '#8649b0',
    a20: '#9660ba',
    a30: '#a676c4',
    a40: '#b58cce',
    a50: '#c4a2d8',
  },
  
  // Surface colors
  surface: {
    a0: '#121212',
    a10: '#282828',
    a20: '#3f3f3f',
    a30: '#575757',
    a40: '#717171',
    a50: '#8b8b8b',
  },
  
  // Tonal surface colors
  surfaceTonal: {
    a0: '#1c161f',
    a10: '#312b34',
    a20: '#47424a',
    a30: '#5f5a61',
    a40: '#777379',
    a50: '#918d93',
  },
  
  // Success colors
  success: {
    a0: '#22946e',
    a10: '#47d5a6',
    a20: '#9ae8ce',
  },
  
  // Warning colors
  warning: {
    a0: '#a87a2a',
    a10: '#d7ac61',
    a20: '#ecd7b2',
  },
  
  // Danger colors
  danger: {
    a0: '#9c2121',
    a10: '#d94a4a',
    a20: '#eb9e9e',
  },
  
  // Info colors
  info: {
    a0: '#21498a',
    a10: '#4077d1',
    a20: '#92b2e5',
  },
};

/**
 * Light theme color palette
 */
export const lightColors: ColorPalette = {
  // Base colors
  dark: '#000000',
  light: '#ffffff',
  
  // Primary colors
  primary: {
    a0: '#7632a6',
    a10: '#692e92',
    a20: '#5c297f',
    a30: '#4f256c',
    a40: '#422059',
    a50: '#361c48',
  },
  
  // Surface colors
  surface: {
    a0: '#ffffff',
    a10: '#f0f0f0',
    a20: '#e1e1e1',
    a30: '#d3d3d3',
    a40: '#c5c5c5',
    a50: '#b6b6b6',
  },
  
  // Tonal surface colors
  surfaceTonal: {
    a0: '#f2eaf6',
    a10: '#e5dee8',
    a20: '#d8d1db',
    a30: '#cbc5cd',
    a40: '#beb9c0',
    a50: '#b1aeb3',
  },
  
  // Success colors
  success: {
    a0: '#1b7f5c',
    a10: '#28be8a',
    a20: '#58dbad',
  },
  
  // Warning colors
  warning: {
    a0: '#b8871f',
    a10: '#dfae44',
    a20: '#ebca85',
  },
  
  // Danger colors
  danger: {
    a0: '#b13535',
    a10: '#d06262',
    a20: '#e29d9d',
  },
  
  // Info colors
  info: {
    a0: '#1e56a3',
    a10: '#347ada',
    a20: '#74a4e6',
  },
};
