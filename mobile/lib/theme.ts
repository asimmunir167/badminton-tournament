// Shared design tokens matching reference/tournament-app-design.png:
// dark navy background, white cards, gold primary actions, badminton
// iconography. Import from here rather than hardcoding colors per-screen.
export const colors = {
  background: '#0a1e3f',
  backgroundGradientEnd: '#0f2a5c',
  card: '#ffffff',
  cardMuted: '#f4f6fb',
  textOnDark: '#ffffff',
  textOnDarkMuted: '#b7c3dd',
  textPrimary: '#0a1e3f',
  textSecondary: '#5b6b8c',
  gold: '#f5c518',
  goldDark: '#d9a900',
  navy: '#0a1e3f',
  navyLight: '#16305e',
  green: '#1fa858',
  greenLight: '#e6f7ee',
  red: '#e53946',
  redLight: '#fdecee',
  border: '#e3e7f0',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 24, fontWeight: '800' as const },
  heading: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '600' as const },
};
