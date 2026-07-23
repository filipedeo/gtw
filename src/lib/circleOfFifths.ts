// Circle of fifths — canonical data and pure helpers.
//
// The circle of fifths organises the 15 commonly-taught major keys (and their
// relative minors) by key signature. Moving clockwise adds a sharp (up a perfect
// fifth); moving counter-clockwise adds a flat (down a perfect fifth). This module
// holds the reference data plus deterministic helpers so the trainer component and
// its tests share one source of truth.

export type Accidental = 'sharp' | 'flat' | 'none';

export interface KeyInfo {
  /** Major key tonic, e.g. "C", "G", "F#", "Bb". */
  major: string;
  /** Relative natural minor tonic (without the trailing "m"), e.g. "A" for C major. */
  relativeMinor: string;
  /** Number of accidentals in the key signature (0-7). */
  accidentals: number;
  /** Whether the signature uses sharps, flats, or neither. */
  type: Accidental;
  /** Signed position on the circle: 0 = C, positive = sharp side, negative = flat side. */
  position: number;
}

// Order in which sharps are added to a key signature (F# C# G# ...).
export const ORDER_OF_SHARPS = ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#'] as const;
// Order in which flats are added to a key signature (Bb Eb Ab ...).
export const ORDER_OF_FLATS = ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb'] as const;

// The 15 standard keys, ordered from the flat extreme to the sharp extreme.
export const CIRCLE_OF_FIFTHS: KeyInfo[] = [
  { major: 'Cb', relativeMinor: 'Ab', accidentals: 7, type: 'flat', position: -7 },
  { major: 'Gb', relativeMinor: 'Eb', accidentals: 6, type: 'flat', position: -6 },
  { major: 'Db', relativeMinor: 'Bb', accidentals: 5, type: 'flat', position: -5 },
  { major: 'Ab', relativeMinor: 'F', accidentals: 4, type: 'flat', position: -4 },
  { major: 'Eb', relativeMinor: 'C', accidentals: 3, type: 'flat', position: -3 },
  { major: 'Bb', relativeMinor: 'G', accidentals: 2, type: 'flat', position: -2 },
  { major: 'F', relativeMinor: 'D', accidentals: 1, type: 'flat', position: -1 },
  { major: 'C', relativeMinor: 'A', accidentals: 0, type: 'none', position: 0 },
  { major: 'G', relativeMinor: 'E', accidentals: 1, type: 'sharp', position: 1 },
  { major: 'D', relativeMinor: 'B', accidentals: 2, type: 'sharp', position: 2 },
  { major: 'A', relativeMinor: 'F#', accidentals: 3, type: 'sharp', position: 3 },
  { major: 'E', relativeMinor: 'C#', accidentals: 4, type: 'sharp', position: 4 },
  { major: 'B', relativeMinor: 'G#', accidentals: 5, type: 'sharp', position: 5 },
  { major: 'F#', relativeMinor: 'D#', accidentals: 6, type: 'sharp', position: 6 },
  { major: 'C#', relativeMinor: 'A#', accidentals: 7, type: 'sharp', position: 7 },
];

/** Look up a key by its major tonic (case-sensitive, expects canonical spelling). */
export function getKeyByMajor(major: string): KeyInfo | undefined {
  return CIRCLE_OF_FIFTHS.find((k) => k.major === major);
}

/** Look up a key by its relative-minor tonic (without a trailing "m"). */
export function getKeyByMinor(minor: string): KeyInfo | undefined {
  const clean = minor.replace(/m$/, '');
  return CIRCLE_OF_FIFTHS.find((k) => k.relativeMinor === clean);
}

/**
 * The actual accidentals in a key's signature, in the order they are written.
 * e.g. "D" -> ["F#", "C#"], "Eb" -> ["Bb", "Eb", "Ab"], "C" -> [].
 */
export function getAccidentalNotes(major: string): string[] {
  const key = getKeyByMajor(major);
  if (!key || key.type === 'none') return [];
  const source = key.type === 'sharp' ? ORDER_OF_SHARPS : ORDER_OF_FLATS;
  return source.slice(0, key.accidentals);
}

/**
 * Human-readable key-signature label, e.g. "2 sharps", "1 flat",
 * "no sharps or flats".
 */
export function keySignatureLabel(major: string): string {
  const key = getKeyByMajor(major);
  if (!key || key.type === 'none') return 'no sharps or flats';
  const noun = key.type === 'sharp' ? 'sharp' : 'flat';
  return `${key.accidentals} ${noun}${key.accidentals === 1 ? '' : 's'}`;
}

/** Relative minor tonic of a major key, with the trailing "m" (e.g. "C" -> "Am"). */
export function relativeMinorOf(major: string): string | undefined {
  const key = getKeyByMajor(major);
  return key ? `${key.relativeMinor}m` : undefined;
}

/** Relative major of a minor key (accepts "Am" or "A"), e.g. "Am" -> "C". */
export function relativeMajorOf(minor: string): string | undefined {
  const key = getKeyByMinor(minor);
  return key ? key.major : undefined;
}

/**
 * The neighbouring key on the circle. Clockwise = up a perfect fifth (add a sharp
 * / drop a flat); counter-clockwise = down a perfect fifth. Returns undefined at
 * the ends of the standard 15-key circle.
 */
export function neighborKey(
  major: string,
  direction: 'clockwise' | 'counterclockwise'
): string | undefined {
  const key = getKeyByMajor(major);
  if (!key) return undefined;
  const delta = direction === 'clockwise' ? 1 : -1;
  const next = CIRCLE_OF_FIFTHS.find((k) => k.position === key.position + delta);
  return next?.major;
}
