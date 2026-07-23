// Key-aware scale-degree / interval labelling — the single source of truth for
// how a note relates to a root, shared by the Fretboard overlay and the active-
// recall check so a graded degree can never diverge from what the board shows.
//
// The interval NUMBER comes from the letter names and the accidental from the
// semitone distance, so the label agrees with the note name that would be
// rendered (rather than a purely chromatic computation, which mislabels e.g.
// #4 as b5). Extracted verbatim from Fretboard.tsx; behaviour-preserving.

import { NOTE_NAMES, normalizeNoteName } from '../types/guitar';
import { NOTE_NAMES_FLAT, getKeySpelledNotes } from '../lib/theoryEngine';

// Chromas of the keys the app spells with flats: Db(1), Eb(3), F(5), Ab(8), Bb(10).
// The only accidental key the app spells with a sharp is F# (chroma 6).
const FLAT_KEY_CHROMAS = new Set([1, 3, 5, 8, 10]);

const LETTER_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
// Semitone offset above the tonic for each major-scale degree number (1..7).
const MAJOR_DEGREE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
// Safe chromatic fallbacks (used when a note cannot be spelled cleanly, e.g. the
// leading tone of F# major is E#, which NOTE_NAMES cannot represent).
const CHROMATIC_DEGREE_NAMES = ['1', '\u266d2', '2', '\u266d3', '3', '4', '\u266d5', '5', '\u266d6', '6', '\u266d7', '7'];
const CHROMATIC_INTERVAL_NAMES = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

/** Whether notes should be spelled with flats for the given (tonic) root note. */
export function preferFlatsForRoot(rootNote: string | null): boolean {
  if (!rootNote) return false;
  const chroma = NOTE_NAMES.indexOf(normalizeNoteName(rootNote));
  return FLAT_KEY_CHROMAS.has(chroma);
}

/** Spell a chroma (0-11) using flats or sharps. */
export function spellChroma(chroma: number, useFlats: boolean): string {
  return (useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES)[chroma];
}

/**
 * Spell a chroma using an active key/scale spelling table when available,
 * else the tonic's key-signature convention. Pure version of the helper that
 * lived inside Fretboard as a closure over `spellingTable`/`rootNote`.
 */
export function spellChromaForContext(
  spellingTable: string[] | null,
  rootNote: string | null,
  chroma: number,
  fallbackName: string
): string {
  return chroma === -1
    ? fallbackName
    : (spellingTable && spellingTable[chroma]) || spellChroma(chroma, preferFlatsForRoot(rootNote));
}

/**
 * Derive a scale-degree / interval label from the key-aware spelling of the
 * root and the target note.
 */
export function getDegreeLabel(
  rootSpelling: string,
  noteSpelling: string,
  chromaInterval: number,
  mode: 'degrees' | 'intervals'
): string {
  const chromaticFallback = mode === 'intervals'
    ? CHROMATIC_INTERVAL_NAMES[chromaInterval]
    : CHROMATIC_DEGREE_NAMES[chromaInterval];

  const rootLetterIdx = LETTER_ORDER.indexOf(rootSpelling[0]);
  const noteLetterIdx = LETTER_ORDER.indexOf(noteSpelling[0]);
  if (rootLetterIdx === -1 || noteLetterIdx === -1) return chromaticFallback;

  const degreeNumber = ((noteLetterIdx - rootLetterIdx + 7) % 7) + 1; // 1..7
  let alteration = chromaInterval - MAJOR_DEGREE_SEMITONES[degreeNumber - 1];
  // Keep the accidental sane when the interval wraps across the octave.
  if (alteration > 6) alteration -= 12;
  if (alteration < -6) alteration += 12;

  // Guard against enharmonic gaps: NOTE_NAMES/NOTE_NAMES_FLAT cannot express
  // notes such as E#/Cb, so a mis-spelled note could yield a nonsensical label
  // (e.g. 'b1'). If the letter-derived degree is degenerate (a non-unison mapped
  // to degree 1, or a double accidental), use the plain chromatic name instead.
  if ((degreeNumber === 1 && chromaInterval !== 0) || alteration < -1 || alteration > 1) {
    return chromaticFallback;
  }

  if (mode === 'intervals') {
    if (degreeNumber === 1 && alteration === 0) return 'R';
    const acc = alteration > 0 ? '#'.repeat(alteration) : alteration < 0 ? 'b'.repeat(-alteration) : '';
    return `${acc}${degreeNumber}`;
  }
  // Degrees mode uses unicode accidentals to match prior styling.
  const acc = alteration > 0 ? '\u266f'.repeat(alteration) : alteration < 0 ? '\u266d'.repeat(-alteration) : '';
  return `${acc}${degreeNumber}`;
}

/**
 * Convenience: the scale-degree label (default) or interval label for `note`
 * relative to `rootNote`, using the same key-aware spelling the fretboard shows.
 * Returns null when either note is unresolvable (no root context / bad input).
 * `note` may carry an octave digit; it is stripped.
 */
export function degreeForNote(
  rootNote: string | null,
  scaleContext: { root: string; name: string } | null,
  note: string,
  mode: 'degrees' | 'intervals' = 'degrees'
): string | null {
  if (!rootNote) return null;
  const rootName = normalizeNoteName(rootNote);
  const noteName = normalizeNoteName(note.replace(/\d+/g, ''));
  const rootChroma = NOTE_NAMES.indexOf(rootName);
  const chroma = NOTE_NAMES.indexOf(noteName);
  if (rootChroma === -1 || chroma === -1) return null;

  const spellingTable = scaleContext ? getKeySpelledNotes(scaleContext.root, scaleContext.name) : null;
  const rootSpelling = spellChromaForContext(spellingTable, rootNote, rootChroma, rootName);
  const displayNote = spellChromaForContext(spellingTable, rootNote, chroma, noteName);
  const chromaInterval = (chroma - rootChroma + 12) % 12;
  return getDegreeLabel(rootSpelling, displayNote, chromaInterval, mode);
}
