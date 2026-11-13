/**
 * CafeSync Design System - Typography Tokens
 * Refined serif font for headlines and clean modern sans-serif for UI/body.
 * Fixed type scale: 11 / 12 / 14 / 16 / 20 / 28 / 36 / 44 with balanced line heights.
 */

import { Platform } from 'react-native';

export const FONTS = {
  // Headings: Refined serif stack with Fraunces / Playfair / Georgia fallback
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    web: "'Fraunces', 'Playfair Display', Georgia, serif",
    default: 'serif',
  }),
  // Body: Clean, accessible sans-serif stack
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    web: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    default: 'sans-serif',
  }),
};

export const TYPE_SCALE = {
  tiny: { fontSize: 11, lineHeight: 15 },
  caption: { fontSize: 12, lineHeight: 16 },
  small: { fontSize: 14, lineHeight: 20 },
  body: { fontSize: 16, lineHeight: 24 },
  subtitle: { fontSize: 20, lineHeight: 28 },
  title: { fontSize: 28, lineHeight: 34 },
  headline: { fontSize: 36, lineHeight: 42 },
  display: { fontSize: 44, lineHeight: 52 },
};

export const FONT_WEIGHTS = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extraBold: '800',
};

export const TYPOGRAPHY = {
  display: {
    fontFamily: FONTS.serif,
    fontSize: TYPE_SCALE.display.fontSize,
    lineHeight: TYPE_SCALE.display.lineHeight,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: -1.2,
  },
  headline: {
    fontFamily: FONTS.serif,
    fontSize: TYPE_SCALE.headline.fontSize,
    lineHeight: TYPE_SCALE.headline.lineHeight,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: -1,
  },
  title: {
    fontFamily: FONTS.serif,
    fontSize: TYPE_SCALE.title.fontSize,
    lineHeight: TYPE_SCALE.title.lineHeight,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: FONTS.sans,
    fontSize: TYPE_SCALE.subtitle.fontSize,
    lineHeight: TYPE_SCALE.subtitle.lineHeight,
    fontWeight: FONT_WEIGHTS.semibold,
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: FONTS.sans,
    fontSize: TYPE_SCALE.body.fontSize,
    lineHeight: TYPE_SCALE.body.lineHeight,
    fontWeight: FONT_WEIGHTS.regular,
  },
  bodyBold: {
    fontFamily: FONTS.sans,
    fontSize: TYPE_SCALE.body.fontSize,
    lineHeight: TYPE_SCALE.body.lineHeight,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  caption: {
    fontFamily: FONTS.sans,
    fontSize: TYPE_SCALE.caption.fontSize,
    lineHeight: TYPE_SCALE.caption.lineHeight,
    fontWeight: FONT_WEIGHTS.medium,
  },
  eyebrow: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
};

