// Shared metronome helpers (BPM bounds, stepping, tap-tempo). Kept pure and
// UI-free so they can be unit-tested and reused across controls.

export const MIN_BPM = 40;
export const MAX_BPM = 300;

// Taps farther apart than this (ms) start a fresh tap sequence rather than
// averaging across an unrelated earlier tap.
export const TAP_RESET_MS = 2000;

// Number of trailing taps to average for a stable rolling tempo.
export const MAX_TAP_SAMPLES = 6;

/** Clamp/round an arbitrary number to a valid integer BPM. */
export function clampBpm(bpm: number): number {
  // NaN has no ordering, so guard it explicitly; +/-Infinity clamp naturally.
  if (Number.isNaN(bpm)) return MIN_BPM;
  return Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(bpm)));
}

/**
 * Compute a BPM from an ordered list of tap timestamps (ms, e.g. from
 * performance.now()). Returns null when there are fewer than 2 taps. Averages
 * the intervals between consecutive taps and clamps to the valid BPM range.
 */
export function bpmFromTapTimes(times: number[]): number | null {
  if (times.length < 2) return null;
  let sum = 0;
  for (let i = 1; i < times.length; i++) {
    sum += times[i] - times[i - 1];
  }
  const avg = sum / (times.length - 1);
  if (avg <= 0) return null;
  return clampBpm(60000 / avg);
}

/**
 * Append a new tap timestamp to an existing sequence, resetting the sequence
 * when the gap since the last tap exceeds TAP_RESET_MS and keeping only the
 * most recent MAX_TAP_SAMPLES taps. Returns the updated sequence (new array).
 */
export function recordTap(times: number[], now: number): number[] {
  const last = times[times.length - 1];
  const base = last !== undefined && now - last > TAP_RESET_MS ? [] : times;
  const next = [...base, now];
  return next.length > MAX_TAP_SAMPLES ? next.slice(next.length - MAX_TAP_SAMPLES) : next;
}

// --- Subdivisions (clicks per beat) ---

/** A subdivision is how many evenly-spaced clicks sound within one beat. */
export type Subdivision = 1 | 2 | 3 | 4;

// UI options: label + clicks-per-beat. Quarter = the beat itself (no subdivision).
export const SUBDIVISIONS: { value: Subdivision; label: string }[] = [
  { value: 1, label: 'Quarter' },
  { value: 2, label: 'Eighths' },
  { value: 3, label: 'Triplets' },
  { value: 4, label: 'Sixteenths' },
];

/** Clamp an arbitrary value to a supported subdivision (defaults to 1). */
export function clampSubdivision(n: number): Subdivision {
  return n === 2 || n === 3 || n === 4 ? n : 1;
}

/**
 * Seconds between consecutive metronome clicks for the given bpm, time-signature
 * denominator, and subdivision. The beat unit is a quarter note in /4-style
 * signatures and an eighth note in /8 signatures (matching how the beat counter
 * is advanced), then divided evenly by the subdivision.
 */
export function clickIntervalSeconds(
  bpm: number,
  denominator: number,
  subdivision: number
): number {
  const quarterSeconds = 60 / clampBpm(bpm);
  const beatUnitSeconds = denominator === 8 ? quarterSeconds / 2 : quarterSeconds;
  return beatUnitSeconds / clampSubdivision(subdivision);
}

// --- Tempo auto-ramp (quick win) ---

/**
 * Pure tempo/speed auto-ramp: every `everyBars` completed bars, add `step` BPM
 * to the start tempo, never exceeding `maxBpm`. `completedBars` is the number
 * of whole bars that have elapsed since the ramp started. A non-positive
 * `everyBars` is guarded to 1 so the ramp never divides by zero. The result is
 * always clamped to the valid BPM range and rounded.
 */
export function nextRampBpm(
  startBpm: number,
  step: number,
  everyBars: number,
  maxBpm: number,
  completedBars: number
): number {
  const period = Math.max(1, everyBars);
  const target = Math.min(maxBpm, startBpm + step * Math.floor(completedBars / period));
  return clampBpm(target);
}
