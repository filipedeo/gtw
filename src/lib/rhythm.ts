// Rhythm training — pure pattern data, onset timing, and tap grading.
//
// No audio, no DOM, no Tone.js. This module is the single source of truth for
// rhythm patterns, their expected onset times (derived from BPM), and the
// grading algorithm that matches user taps to those onsets within a tolerance
// window. The trainer component and its unit tests share this module.

/** Note durations, expressed as fractions of a beat (quarter = 1 beat). */
export type NoteDuration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

/** How many beats each note duration occupies. */
export const NOTE_BEATS: Record<NoteDuration, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
};

/** Short human-readable labels for the visual blocks. */
export const NOTE_LABELS: Record<NoteDuration, string> = {
  whole: 'Whole',
  half: 'Half',
  quarter: 'Quarter',
  eighth: 'Eighth',
  sixteenth: '16th',
};

export interface RhythmPattern {
  /** Ordered note durations that fill exactly one bar. */
  notes: NoteDuration[];
  /** Beats per bar (time signature numerator, e.g. 4 for 4/4). */
  beatsPerBar: number;
}

/**
 * Patterns grouped by difficulty (1 = easy, 2 = medium, 3 = hard).
 * Each pattern's notes sum to exactly `beatsPerBar` beats.
 */
export const PATTERNS_BY_DIFFICULTY: Record<number, RhythmPattern[]> = {
  1: [
    { notes: ['quarter', 'quarter', 'quarter', 'quarter'], beatsPerBar: 4 },
    { notes: ['half', 'half'], beatsPerBar: 4 },
  ],
  2: [
    { notes: ['quarter', 'eighth', 'eighth', 'quarter', 'quarter'], beatsPerBar: 4 },
    { notes: ['eighth', 'eighth', 'quarter', 'eighth', 'eighth', 'eighth', 'eighth'], beatsPerBar: 4 },
    { notes: ['half', 'quarter', 'quarter'], beatsPerBar: 4 },
  ],
  3: [
    { notes: ['half', 'quarter', 'eighth', 'eighth'], beatsPerBar: 4 },
    { notes: ['half', 'eighth', 'eighth', 'eighth', 'eighth'], beatsPerBar: 4 },
    { notes: ['quarter', 'eighth', 'eighth', 'half'], beatsPerBar: 4 },
    { notes: ['eighth', 'eighth', 'eighth', 'eighth', 'half'], beatsPerBar: 4 },
  ],
};

/** Default BPM per difficulty level. */
export const DEFAULT_BPM_BY_DIFFICULTY: Record<number, number> = {
  1: 80,
  2: 100,
  3: 120,
};

/**
 * Validate that a pattern's note durations sum to exactly one bar.
 * Returns true when `sum(NOTE_BEATS[n]) === beatsPerBar`.
 */
export function patternFillsBar(pattern: RhythmPattern): boolean {
  const total = pattern.notes.reduce((sum, n) => sum + NOTE_BEATS[n], 0);
  return Math.abs(total - pattern.beatsPerBar) < 1e-9;
}

/**
 * Absolute onset time (in seconds, from the start of the bar) for each note in
 * the pattern, derived from the BPM. The first note always starts at 0.
 *
 * @param pattern  The rhythm pattern.
 * @param bpm      Tempo in beats per minute.
 * @returns        Array of onset times in seconds, one per note.
 */
export function expectedOnsetTimes(pattern: RhythmPattern, bpm: number): number[] {
  const secondsPerBeat = 60 / bpm;
  const onsets: number[] = [];
  let elapsed = 0;
  for (const note of pattern.notes) {
    onsets.push(elapsed);
    elapsed += NOTE_BEATS[note] * secondsPerBeat;
  }
  return onsets;
}

/** Total duration of one bar in seconds at the given BPM. */
export function barDurationSeconds(beatsPerBar: number, bpm: number): number {
  return (beatsPerBar * 60) / bpm;
}

export interface GradeResult {
  /** Expected onsets the user matched with a tap. */
  hits: number;
  /** Expected onsets the user missed (no tap within tolerance). */
  misses: number;
  /** Taps that didn't match any expected onset (extra / wrong timing). */
  extra: number;
  /** Accuracy percentage 0–100, rounded: hits / expectedCount. */
  accuracy: number;
  /** Per-expected-onset match detail (index into expectedTimes, or -1 if missed). */
  matchedTapIndices: number[];
}

/**
 * Grade user taps against expected onset times.
 *
 * Algorithm: greedily match each tap (in order) to the nearest *unmatched*
 * expected onset within `toleranceSec`. Each expected onset is matched by at
 * most one tap (no double-counting). Taps that match no onset count as "extra";
 * onsets that receive no tap count as "missed".
 *
 * @param expectedTimes  Expected onset times in seconds (from expectedOnsetTimes).
 * @param tapTimes       User tap times in seconds (same clock origin).
 * @param toleranceSec   Maximum absolute error for a tap to count as a hit.
 */
export function gradeTaps(
  expectedTimes: number[],
  tapTimes: number[],
  toleranceSec: number,
): GradeResult {
  const matched = new Array<boolean>(expectedTimes.length).fill(false);
  const matchedTapIndices = new Array<number>(expectedTimes.length).fill(-1);
  let hits = 0;
  let extra = 0;

  for (let t = 0; t < tapTimes.length; t++) {
    const tap = tapTimes[t];
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < expectedTimes.length; i++) {
      if (matched[i]) continue;
      const dist = Math.abs(expectedTimes[i] - tap);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0 && bestDist <= toleranceSec) {
      matched[bestIdx] = true;
      matchedTapIndices[bestIdx] = t;
      hits++;
    } else {
      extra++;
    }
  }

  const misses = expectedTimes.length - hits;
  const accuracy =
    expectedTimes.length > 0
      ? Math.round((hits / expectedTimes.length) * 100)
      : 0;

  return { hits, misses, extra, accuracy, matchedTapIndices };
}

/**
 * Pick a pattern for the given difficulty using a deterministic index.
 * Falls back to difficulty 1 patterns for unknown levels.
 */
export function getPattern(difficulty: number, index: number): RhythmPattern {
  const pool = PATTERNS_BY_DIFFICULTY[difficulty] ?? PATTERNS_BY_DIFFICULTY[1];
  return pool[index % pool.length];
}
