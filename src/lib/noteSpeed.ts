// Note Speed trainer — pure helpers + self-contained personal-best persistence.
//
// The fretboard note-naming speed drill generates a random fret position and
// asks the user to name it. This module holds the deterministic question-
// generation + scoring helpers (so the component and its unit test share one
// source of truth) and a tiny localStorage-backed personal-best store that is
// deliberately separate from progressStore.

import { FretPosition, Tuning, NOTE_NAMES, normalizeNoteName, areNotesEqual, Instrument } from '../types/guitar';
import { getNoteAtPosition, getPositionsForNote } from '../utils/fretboardCalculations';

/** Difficulty -> max fret bound (mirrors the note-identification sets). */
export function maxFretForDifficulty(difficulty: number): number {
  if (difficulty <= 1) return 5;
  if (difficulty <= 2) return 12;
  return 22;
}

export interface NoteSpeedQuestion {
  position: FretPosition;
  noteName: string; // canonical sharp spelling, e.g. "F#"
  fullNote: string; // with octave, e.g. "F#4"
  options: string[]; // 4 note names, shuffled, includes the correct one
}

/** Resolve a note name from a position given the tuning. Returns canonical spelling + full note. */
export function resolveNote(position: FretPosition, tuning: Tuning, stringCount: number): {
  noteName: string;
  fullNote: string;
} {
  const fullNote = getNoteAtPosition(position, tuning, stringCount);
  const raw = fullNote.replace(/\d/, '');
  return { noteName: normalizeNoteName(raw), fullNote };
}

/**
 * Build the 4 multiple-choice options for a question: the correct note plus 3
 * enharmonic-aware distractors drawn from the 12 chromatic notes, shuffled.
 * Inject a `shuffle` fn for deterministic tests; defaults to Math.random.
 */
export function buildOptions(correctNote: string, shuffle: (n: number) => number = Math.random): string[] {
  const wrong = NOTE_NAMES.filter((n) => !areNotesEqual(n, correctNote));
  // Fisher-Yates-ish pick using the injected RNG so tests stay deterministic.
  const picked: string[] = [];
  const pool = [...wrong];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = Math.floor(shuffle(pool.length));
    picked.push(pool.splice(idx, 1)[0]);
  }
  const all = [correctNote, ...picked];
  // Shuffle the final order deterministically with the same RNG.
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(shuffle(i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

/**
 * Generate a complete question at a random position within the difficulty's
 * fret range. Pass a `randomPosition` to force the position (deterministic
 * tests) and/or `shuffle` to control option ordering.
 */
export function generateQuestion(
  stringCount: number,
  tuning: Tuning,
  difficulty: number,
  opts: {
    randomPosition?: FretPosition;
    shuffle?: (n: number) => number;
  } = {}
): NoteSpeedQuestion {
  const maxFret = maxFretForDifficulty(difficulty);
  const position: FretPosition =
    opts.randomPosition ??
    {
      string: Math.floor(Math.random() * stringCount),
      fret: Math.floor(Math.random() * (maxFret + 1)),
    };
  const { noteName, fullNote } = resolveNote(position, tuning, stringCount);
  const options = buildOptions(noteName, opts.shuffle);
  return { position, noteName, fullNote, options };
}

/** Enharmonic-aware answer check. */
export function isAnswerCorrect(answer: string, correctNote: string): boolean {
  return areNotesEqual(answer, correctNote);
}

/**
 * Locate-the-note direction: given a target note name, return all valid
 * positions within the difficulty's fret range. Used to validate a user's
 * fret click.
 */
export function validPositionsForNote(
  noteName: string,
  tuning: Tuning,
  stringCount: number,
  difficulty: number
): FretPosition[] {
  return getPositionsForNote(noteName, tuning, stringCount, maxFretForDifficulty(difficulty));
}

/** Enharmonic-aware membership check for the locate direction. */
export function isPositionCorrect(
  clicked: FretPosition,
  targetNote: string,
  tuning: Tuning,
  stringCount: number,
  difficulty: number
): boolean {
  const valid = validPositionsForNote(targetNote, tuning, stringCount, difficulty);
  return valid.some(
    (p) => p.string === clicked.string && p.fret === clicked.fret
  );
}

// ---------------------------------------------------------------------------
// Personal-best persistence (self-contained localStorage, no progressStore).
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'gtw-note-speed-best:';

/** Stable key scoped per (instrument, stringCount). */
export function formatDrillKey(instrument: Instrument, stringCount: number): string {
  return `${STORAGE_PREFIX}${instrument}-${stringCount}`;
}

/** Read the persisted best score for a key. Returns 0 when unset/invalid. */
export function loadPersonalBest(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return 0;
    const val = parseInt(raw, 10);
    return Number.isFinite(val) && val > 0 ? val : 0;
  } catch {
    return 0;
  }
}

/**
 * Persist a score if it beats the stored best. Returns true when a new best
 * was set (so the UI can show a "New best!" badge). Tolerates a missing
 * localStorage (SSR / privacy mode) by treating it as "not beaten".
 */
export function savePersonalBest(key: string, score: number): boolean {
  if (score <= 0) return false;
  try {
    const current = loadPersonalBest(key);
    if (score > current) {
      localStorage.setItem(key, String(score));
      return true;
    }
  } catch {
    // localStorage unavailable — treat as not beaten.
  }
  return false;
}

/** Clear the stored best for a key (test helper / reset affordance). */
export function clearPersonalBest(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
