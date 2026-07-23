// Play-along — pure helpers for matching a live mic pitch against a target note.
//
// The note-identification "Play it (mic)" mode listens to the user's guitar and
// treats a sustained, in-tune match of the hidden target note as a correct
// answer. This module holds the deterministic matching logic shared by the
// component and its unit test; it has no side effects and no audio deps.

import { PitchResult } from './pitchDetection';
import { normalizeNoteName } from '../types/guitar';

export interface MatchOptions {
  /** Max allowed tuning deviation in cents (inclusive). Default 35. */
  maxCents?: number;
  /** Minimum autocorrelation clarity (0..1). Default 0.9. */
  minClarity?: number;
}

/**
 * Decide whether a detected pitch counts as a hit on the target note.
 *
 * True iff `latest` is present, its note (without octave) is enharmonically
 * equal to `targetNoteNoOctave`, its tuning is within `maxCents`, and its
 * clarity meets `minClarity`. Both spellings are normalized to sharps first so
 * a target spelled "Db" matches a detected "C#".
 */
export function matchesTarget(
  latest: PitchResult | null,
  targetNoteNoOctave: string,
  opts: MatchOptions = {},
): boolean {
  if (!latest) return false;

  const { maxCents = 35, minClarity = 0.9 } = opts;

  const detected = normalizeNoteName(latest.noteNameWithoutOctave);
  const target = normalizeNoteName(targetNoteNoOctave);
  if (detected !== target) return false;

  if (Math.abs(latest.cents) > maxCents) return false;
  if (latest.clarity < minClarity) return false;

  return true;
}
