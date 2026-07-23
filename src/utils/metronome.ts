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
