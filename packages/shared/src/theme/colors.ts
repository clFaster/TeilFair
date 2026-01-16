/**
 * TeilFair Color Palette
 * Inspired by the TeilFair logo: teal/cyan gradient with orange/gold accents
 * Primary: Teal (#1da987) - represents fairness and balance
 * Accent: Orange/Gold (#ff931e) - represents value and transactions
 */

export interface ColorPalette {
  // Base colors
  dark: string;
  light: string;
  
  // Primary colors (Teal - from logo)
  primary: {
    a0: string;
    a10: string;
    a20: string;
    a30: string;
    a40: string;
    a50: string;
  };
  
  // Accent colors (Orange/Gold - from logo)
  accent: {
    a0: string;
    a10: string;
    a20: string;
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
  
  // Tonal surface colors (teal-tinted)
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

  // Settlement colors (purple/violet - distinct from other status colors)
  settlement: {
    bg: string;
    border: string;
    accent: string;
  };
}

/**
 * Dark theme color palette
 */
export const darkColors: ColorPalette = {
  // Base colors
  dark: '#0a0f0e',
  light: '#ffffff',
  
  // Primary colors (Teal - lighter for dark mode)
  primary: {
    a0: '#1da987',  // Base teal from logo
    a10: '#36cdb2', // Lighter teal from logo gradient
    a20: '#5fd9d2', // Cyan from logo
    a30: '#7ee4de',
    a40: '#a3ede9',
    a50: '#c8f5f3',
  },
  
  // Accent colors (Orange/Gold)
  accent: {
    a0: '#ff931e',  // Orange from logo
    a10: '#ffab4d',
    a20: '#ffc37d',
  },
  
  // Surface colors (dark with slight teal tint)
  surface: {
    a0: '#0f1514',  // Deep dark with teal undertone
    a10: '#1a2320',
    a20: '#2a3532',
    a30: '#3d4a47',
    a40: '#52605c',
    a50: '#6a7975',
  },
  
  // Tonal surface colors (teal-tinted for dark mode)
  surfaceTonal: {
    a0: '#0f1917',
    a10: '#1a2725',
    a20: '#283735',
    a30: '#3a4947',
    a40: '#4d5c5a',
    a50: '#63706e',
  },
  
  // Success colors (green, harmonizes with teal)
  success: {
    a0: '#0c8d67',  // Deep green
    a10: '#28be8a', // Medium green
    a20: '#6bdd91', // Light green from logo
  },
  
  // Warning colors (gold/amber, matches accent)
  warning: {
    a0: '#c97d1a',
    a10: '#fec118', // Gold from logo
    a20: '#fdd827', // Yellow from logo
  },
  
  // Danger colors (pink/red from logo palette)
  danger: {
    a0: '#c44455',
    a10: '#e96474', // Pink from logo
    a20: '#f2bdc1', // Light pink from logo
  },
  
  // Info colors (blue from logo gradient)
  info: {
    a0: '#2e61b3', // Blue from logo gradient
    a10: '#4a7dc7',
    a20: '#7a9fd8',
  },

  // Settlement colors (purple/violet - distinct and readable)
  settlement: {
    bg: '#2d2246',
    border: '#4c3a73',
    accent: '#a78bfa',
  },
};

/**
 * Light theme color palette
 */
export const lightColors: ColorPalette = {
  // Base colors
  dark: '#0a0f0e',
  light: '#ffffff',
  
  // Primary colors (Teal - darker for light mode for contrast)
  primary: {
    a0: '#1da987',  // Base teal from logo
    a10: '#189274', // Darker
    a20: '#147b62', // Even darker
    a30: '#0f6550',
    a40: '#0b4f3f',
    a50: '#073a2e',
  },
  
  // Accent colors (Orange/Gold)
  accent: {
    a0: '#e8850c',  // Slightly darker for light mode
    a10: '#ff931e', // Orange from logo
    a20: '#ffab4d',
  },
  
  // Surface colors (clean whites and grays)
  surface: {
    a0: '#ffffff',
    a10: '#f5f7f7', // Slight teal tint
    a20: '#e8eceb',
    a30: '#d8dddc',
    a40: '#c5cbca',
    a50: '#a8b0ae',
  },
  
  // Tonal surface colors (teal-tinted for light mode)
  surfaceTonal: {
    a0: '#f0f7f6',  // Very light teal tint
    a10: '#e3efed',
    a20: '#d4e5e2',
    a30: '#c4d9d6',
    a40: '#b2cbc8',
    a50: '#9ebdb9',
  },
  
  // Success colors
  success: {
    a0: '#0c8d67',  // Deep green
    a10: '#1da987', // Medium (same as primary for consistency)
    a20: '#d4f5e9', // Light green bg
  },
  
  // Warning colors
  warning: {
    a0: '#b87a15',
    a10: '#e8960c',
    a20: '#fff4d9', // Light yellow bg
  },
  
  // Danger colors
  danger: {
    a0: '#c44455',
    a10: '#e96474',
    a20: '#fde8ea', // Light pink bg
  },
  
  // Info colors
  info: {
    a0: '#2e61b3',
    a10: '#3a71c4',
    a20: '#e3ecf7', // Light blue bg
  },

  // Settlement colors (purple/violet - distinct and readable)
  settlement: {
    bg: '#f3f0ff',
    border: '#d4c9f7',
    accent: '#7c3aed',
  },
};
