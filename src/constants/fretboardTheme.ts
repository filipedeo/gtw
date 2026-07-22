/**
 * Fretboard palette — folded into the design-system token layer.
 *
 * The canonical values live as `--fb-*` custom properties in `src/index.css`
 * (92 plan §1.2). The skeuomorphic wood palette (gradients, grain, metallic
 * shine, pearl inlays) has been retired in favour of a flat, legible surface.
 *
 * A `<canvas>` cannot read CSS custom properties directly, so this module reads
 * the resolved `--fb-*` values from the document at draw time and falls back to
 * the flat token values below when they are unavailable (SSR / jsdom tests, or
 * a not-yet-applied theme class). The fallbacks are theme-correct, so the board
 * always renders the right palette even before `getComputedStyle` can resolve
 * the live tokens.
 *
 * Keep the fallbacks in sync with the `--fb-*` values in `src/index.css`.
 */
export interface FretboardColors {
  /** Board background (--fb-surface). */
  wood: string;
  /** 1px inner edge for subtle depth (--fb-edge). */
  edge: string;
  /** Nut bar (reuses the fret wire colour). */
  nut: string;
  /** Fret wire (--fb-fret). */
  fret: string;
  /** Strings (--fb-string). */
  string: string;
  /** Position-marker inlays (--fb-inlay). */
  dot: string;
  /** String / tuning labels left of the nut (--text). */
  text: string;
  /** Muted note labels, e.g. faded "show all notes" (--text-muted). */
  textMuted: string;
  /** Fret numbers — AA on the board surface (--fb-fret-number). */
  fretNumber: string;
  /** Scale / highlighted note fill (--fb-note-scale). */
  noteHighlight: string;
  /** Root note fill (--fb-note-root). */
  noteRoot: string;
  /** Faded "other" notes (--fb-note-ghost). */
  noteDefault: string;
  /** Question-target ring stroke (--fb-note-target). */
  noteTarget: string;
  /** Question-target ring interior fill (--surface). */
  noteTargetFill: string;
}

// Flat fallbacks mirroring the --fb-* / shared text tokens in src/index.css.
const FALLBACK: Record<'light' | 'dark', FretboardColors> = {
  light: {
    wood: '#efe7db',
    edge: '#d8cbb6',
    nut: '#b8bcc4',
    fret: '#b8bcc4',
    string: '#6b7280',
    dot: '#cbb78f',
    text: '#1e293b',
    textMuted: '#6b7280',
    fretNumber: '#3b2f1c',
    noteHighlight: '#2563eb',
    noteRoot: '#dc2626',
    noteDefault: 'rgba(100, 116, 139, 0.28)',
    noteTarget: '#2563eb',
    noteTargetFill: '#ffffff',
  },
  dark: {
    wood: '#1a2232',
    edge: '#0f1626',
    nut: '#5b6675',
    fret: '#5b6675',
    string: '#aab4c2',
    dot: '#3c4759',
    text: '#e2e8f0',
    textMuted: '#94a3b8',
    fretNumber: '#9aa6b6',
    noteHighlight: '#60a5fa',
    noteRoot: '#f87171',
    noteDefault: 'rgba(148, 163, 184, 0.30)',
    noteTarget: '#93c5fd',
    noteTargetFill: '#1e293b',
  },
};

// CSS custom property each colour reads from (empty string = fallback only).
const CSS_VAR: Record<keyof FretboardColors, string> = {
  wood: '--fb-surface',
  edge: '--fb-edge',
  nut: '--fb-fret',
  fret: '--fb-fret',
  string: '--fb-string',
  dot: '--fb-inlay',
  text: '--text',
  textMuted: '--text-muted',
  fretNumber: '--fb-fret-number',
  noteHighlight: '--fb-note-scale',
  noteRoot: '--fb-note-root',
  noteDefault: '--fb-note-ghost',
  noteTarget: '--fb-note-target',
  // Read --surface directly: --fb-note-target-fill is defined as var(--surface)
  // and getComputedStyle would return the unresolved "var(--surface)" text.
  noteTargetFill: '--surface',
};

/**
 * Resolve the fretboard palette for the given theme. Reads the live `--fb-*`
 * tokens from the document when possible, falling back to the flat values.
 */
export function readFretboardColors(theme: 'light' | 'dark'): FretboardColors {
  const base = FALLBACK[theme];
  if (typeof window === 'undefined' || typeof getComputedStyle !== 'function') {
    return base;
  }
  const cs = getComputedStyle(document.documentElement);
  const result = {} as FretboardColors;
  (Object.keys(CSS_VAR) as (keyof FretboardColors)[]).forEach((key) => {
    const varName = CSS_VAR[key];
    const resolved = varName ? cs.getPropertyValue(varName).trim() : '';
    result[key] = resolved || base[key];
  });
  return result;
}
