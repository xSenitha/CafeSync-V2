/**
 * CafeSync Design System - Color Tokens
 * Mood: Warm, calm, cozy, premium cafe. "A little time for yourself."
 * Includes daytime warm neutrals and nighttime "Night Cafe" dark mode palette.
 */

export const LIGHT_COLORS = {
  // Brand - Deep Coffee / Roasted Espresso
  primary: '#2B1810',
  primaryLight: '#4E3125',
  primaryDark: '#190E09',
  primaryGlow: 'rgba(43, 24, 16, 0.08)',

  // Secondary - Roasted Hazelnut & Warm Bean
  secondary: '#573A2B',
  secondaryLight: '#7D5842',

  // Warm Neutrals (Cream, Oat, Latte)
  background: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F2ECE1',
  surfaceMuted: '#E8E0D2',
  cream: '#FAF7F2',
  oat: '#F2ECE1',
  latte: '#E8E0D2',

  // Text Tokens (High WCAG AA Contrast)
  text: '#221612',       // 15.6:1 contrast ratio against cream background
  textMid: '#54433A',    // 7.4:1 contrast ratio
  textLight: '#7B6B62',  // 4.6:1 contrast ratio

  // Accents - Warm Terracotta & Soft Sage
  accent: '#C35E3D',
  accentLight: 'rgba(195, 94, 61, 0.12)',
  accentSoft: '#FBECE7',
  copper: '#B77C4B',
  sage: '#5E7C69',
  sageLight: 'rgba(94, 124, 105, 0.12)',
  sageSoft: '#EEF4F0',

  // Status Tokens
  success: '#3E7252',
  successLight: 'rgba(62, 114, 82, 0.12)',
  danger: '#B94435',
  dangerLight: 'rgba(185, 68, 53, 0.12)',
  warning: '#A8681B',
  warningLight: 'rgba(168, 104, 27, 0.12)',
  info: '#466782',
  infoLight: 'rgba(70, 103, 130, 0.12)',

  // UI Structure
  divider: '#E6DDD2',
  dividerLight: '#EFE9DF',
  cardBorder: 'rgba(43, 24, 16, 0.07)',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Gradients
  grad1Start: '#2B1810',
  grad1End: '#573A2B',
  grad2Start: '#C35E3D',
  grad2End: '#D97A59',
};

export const DARK_COLORS = {
  // Brand - Warm Oat Foam for dark backgrounds
  primary: '#EFE7DC',
  primaryLight: '#DFD4C4',
  primaryDark: '#FAF5EE',
  primaryGlow: 'rgba(239, 231, 220, 0.14)',

  // Secondary - Soft Caramel Toast
  secondary: '#D1BFAC',
  secondaryLight: '#A69280',

  // Dark "Night Cafe" Neutrals
  background: '#130D0A',  // Midnight Roast
  surface: '#1C1410',     // Dark Espresso Table
  surfaceAlt: '#271C17',  // Roasted Coffee Bean
  surfaceMuted: '#34251F', // Smoked Cedar
  cream: '#FAF7F2',
  oat: '#271C17',
  latte: '#34251F',

  // Text Tokens (High WCAG AA Contrast)
  text: '#FAF5EE',       // Cream Milk White
  textMid: '#C7B9AC',    // Steamed Oat
  textLight: '#96877A',  // Ground Cinnamon

  // Accents - Radiant Terracotta & Luminous Sage
  accent: '#DF7654',
  accentLight: 'rgba(223, 118, 84, 0.18)',
  accentSoft: '#2E1E19',
  copper: '#C68A57',
  sage: '#7AA389',
  sageLight: 'rgba(122, 163, 137, 0.18)',
  sageSoft: '#1A261F',

  // Status Tokens
  success: '#529E70',
  successLight: 'rgba(82, 158, 112, 0.18)',
  danger: '#D85848',
  dangerLight: 'rgba(216, 88, 72, 0.18)',
  warning: '#D48D3B',
  warningLight: 'rgba(212, 141, 59, 0.18)',
  info: '#628FAF',
  infoLight: 'rgba(98, 143, 175, 0.18)',

  // UI Structure
  divider: '#2D211C',
  dividerLight: '#241A15',
  cardBorder: 'rgba(250, 245, 238, 0.08)',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Gradients
  grad1Start: '#1C1410',
  grad1End: '#271C17',
  grad2Start: '#DF7654',
  grad2End: '#C35E3D',
};

export const SHADOWS = {
  subtle: {
    ios: { shadowColor: '#2B1810', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
    android: { elevation: 2 },
    web: { boxShadow: '0 2px 8px rgba(43, 24, 16, 0.04)' },
  },
  card: {
    ios: { shadowColor: '#2B1810', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
    android: { elevation: 3 },
    web: { boxShadow: '0 4px 16px rgba(43, 24, 16, 0.06)' },
  },
  floating: {
    ios: { shadowColor: '#2B1810', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20 },
    android: { elevation: 6 },
    web: { boxShadow: '0 8px 24px rgba(43, 24, 16, 0.12)' },
  },
  hover: {
    ios: { shadowColor: '#2B1810', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.09, shadowRadius: 16 },
    android: { elevation: 4 },
    web: { boxShadow: '0 6px 20px rgba(43, 24, 16, 0.09)' },
  },
};

// Default export uses LIGHT_COLORS for universal backward compatibility
export const COLORS = LIGHT_COLORS;
