/**
 * ElevateWeb Design Tokens for Instagram Carousels (1080 x 1350)
 * Modern, technical, editorial, premium, and clean aesthetic.
 */

export const DIMENSIONS = {
  width: 1080,
  height: 1350,
  padding: {
    top: 80,
    bottom: 80,
    left: 80,
    right: 80,
  },
  contentWidth: 920, // 1080 - 160
  contentHeight: 1190, // 1350 - 160
} as const;

export const COLORS = {
  bg: {
    primary: '#0B0F17',
    secondary: '#111827',
    card: '#161F30',
    cardBorder: '#23324A',
    cardHighlight: '#1E293B',
    cardMuted: '#0F172A',
  },
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    muted: '#64748B',
    accent: '#38BDF8',
    accentSecondary: '#818CF8',
    emerald: '#34D399',
    amber: '#F59E0B',
    rose: '#FB7185',
  },
  border: {
    subtle: '#1E293B',
    medium: '#2B3950',
    bright: '#38BDF8',
  },
  gradients: {
    card: ['#161F30', '#111827'],
    accentBar: ['#38BDF8', '#818CF8'],
    subtle: ['#0B0F17', '#111827'],
  },
} as const;

export const TYPOGRAPHY = {
  fontFamily: {
    sans: 'Outfit, system-ui, -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif',
    mono: 'ui-monospace, Menlo, Monaco, Consolas, monospace',
  },
  fontSize: {
    eyebrow: 22,
    headlineLarge: 58,
    headlineMedium: 46,
    headlineSmall: 36,
    bodyLarge: 32,
    bodyMedium: 28,
    bodySmall: 22,
    metadata: 22,
    code: 24,
    badge: 20,
  },
  lineHeight: {
    tight: 1.15,
    snug: 1.25,
    normal: 1.45,
    relaxed: 1.6,
  },
} as const;

export const BRAND = {
  name: 'ElevateWeb',
  tagline: 'Engineering & Web Systems',
  markText: 'ELEVATEWEB',
  website: 'elevateweb.io',
} as const;
