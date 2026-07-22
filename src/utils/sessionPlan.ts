/**
 * Pure helpers for allocating practice-session time across exercises.
 *
 * Extracted from SessionPlanner so the duration math can be unit-tested in
 * isolation. The previous inline logic used `Math.floor(total / n)` for a
 * fixed per-category block and stopped early, leaving minutes unallocated
 * (e.g. a requested 30-min session only summing to ~24 min). These helpers
 * guarantee the per-exercise minutes sum to EXACTLY the requested total.
 */

/** Minimum minutes budgeted per exercise in a generated plan. */
export const MIN_MINUTES_PER_EXERCISE = 2;

/**
 * Maximum number of exercises that fit in `totalMinutes` while still giving
 * each at least `minPerExercise` minutes. Always at least 1 (a session should
 * contain at least one exercise even for very short/edge durations).
 */
export function maxExercisesForDuration(
  totalMinutes: number,
  minPerExercise: number = MIN_MINUTES_PER_EXERCISE
): number {
  return Math.max(1, Math.floor(totalMinutes / minPerExercise));
}

/**
 * Distribute `totalMinutes` across `count` exercises so the returned
 * per-exercise minutes sum to EXACTLY `totalMinutes`. The remainder is spread
 * one minute at a time over the first items, so durations differ by at most 1.
 *
 * Returns an empty array when `count <= 0`.
 */
export function distributeMinutes(totalMinutes: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(totalMinutes / count);
  const remainder = totalMinutes - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Clamp a session position index into the valid range [0, length-1] for a plan
 * of `length` items. Returns 0 for an empty plan. Keeps the "current exercise"
 * pointer valid after items are added/removed mid-session.
 */
export function clampSessionIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(index, length - 1));
}
