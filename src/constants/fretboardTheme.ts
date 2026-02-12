export interface FretboardColors {
  wood: string;
  woodGradient: string;
  woodGrain: string;
  nut: string;
  nutShadow: string;
  fret: string;
  fretShine: string;
  string: string;
  stringShine: string;
  dot: string;
  dotGlow: string;
  text: string;
  textMuted: string;
  fretNumber: string;
  noteHighlight: string;
  noteRoot: string;
  noteDefault: string;
}

const darkColors: FretboardColors = {
  wood: '#2c1810',
  woodGradient: '#1e1008',
  woodGrain: 'rgba(255, 200, 150, 0.04)',
  nut: '#d4c5a0',
  nutShadow: 'rgba(0,0,0,0.5)',
  fret: '#a0a0a0',
  fretShine: '#c8c8c8',
  string: '#b0b0b0',
  stringShine: '#d0d0d0',
  dot: '#c8b888',
  dotGlow: 'rgba(200, 184, 136, 0.25)',
  text: '#e2e8f0',
  textMuted: '#8896a8',
  fretNumber: '#7a8494',
  noteHighlight: '#60a5fa',
  noteRoot: '#f87171',
  noteDefault: 'rgba(100, 116, 139, 0.4)',
};

const lightColors: FretboardColors = {
  wood: '#c4956a',
  woodGradient: '#a87d56',
  woodGrain: 'rgba(0, 0, 0, 0.04)',
  nut: '#f5f0e0',
  nutShadow: 'rgba(0,0,0,0.3)',
  fret: '#b8b8b8',
  fretShine: '#d8d8d8',
  string: '#4a4a4a',
  stringShine: '#6a6a6a',
  dot: '#f0e8d8',
  dotGlow: 'rgba(240, 232, 216, 0.5)',
  text: '#374151',
  textMuted: '#6b7280',
  fretNumber: '#9ca3af',
  noteHighlight: '#3b82f6',
  noteRoot: '#ef4444',
  noteDefault: 'rgba(107, 114, 128, 0.3)',
};

export const FRETBOARD_THEME_COLORS: Record<'light' | 'dark', FretboardColors> = {
  dark: darkColors,
  light: lightColors,
};
