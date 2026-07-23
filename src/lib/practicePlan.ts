// Practice-plan engine — decides "what should I do next?".
//
// Pure, deterministic helpers (no randomness, no store access) so the UI and the
// tests share one source of truth. The store owns spaced-repetition scheduling
// (SM-2) and raw progress; this module turns that state into a single actionable
// recommendation plus review-due counts.

import type { Exercise } from '../types/exercise';
import type { UserProgress, ReviewItem, ExerciseProgress } from '../types/progress';

export type RecommendationReason = 'review' | 'weak-area' | 'new' | 'refresh';

export interface Recommendation {
  exercise: Exercise;
  reason: RecommendationReason;
  /** Short human-readable rationale for surfacing this exercise. */
  detail: string;
}

// Accuracy below this (0-1) marks a type as a "weak area" worth strengthening.
const WEAK_ACCURACY = 0.7;
// A type needs at least this many attempts before we trust its accuracy signal.
const MIN_ATTEMPTS_FOR_WEAK = 3;
// bestScore (0-100) at or above this counts as "mastered".
const MASTERY_SCORE = 90;

/** Number of review items whose next-review date is now or in the past. */
export function dueReviewCount(items: ReviewItem[], now: Date = new Date()): number {
  return items.filter((r) => new Date(r.nextReview).getTime() <= now.getTime()).length;
}

interface TypeAccuracy {
  type: string;
  attempts: number;
  correct: number;
  accuracy: number; // 0-1
}

/** Aggregate accuracy per exercise type from recorded progress. */
export function accuracyByType(
  exerciseProgress: Record<string, ExerciseProgress>,
  exercises: Exercise[]
): TypeAccuracy[] {
  const typeById = new Map(exercises.map((e) => [e.id, e.type]));
  const totals = new Map<string, { attempts: number; correct: number }>();

  for (const ep of Object.values(exerciseProgress)) {
    const type = ep.exerciseType ?? typeById.get(ep.exerciseId);
    if (!type) continue;
    const acc = totals.get(type) ?? { attempts: 0, correct: 0 };
    acc.attempts += ep.totalAttempts;
    acc.correct += ep.correctAttempts;
    totals.set(type, acc);
  }

  return Array.from(totals.entries()).map(([type, t]) => ({
    type,
    attempts: t.attempts,
    correct: t.correct,
    accuracy: t.attempts > 0 ? t.correct / t.attempts : 0,
  }));
}

function labelForType(type: string): string {
  return type.replace(/-/g, ' ');
}

function bestScoreFor(progress: UserProgress, exerciseId: string): number {
  return progress.exerciseProgress[exerciseId]?.bestScore ?? 0;
}

function lastAttemptMs(progress: UserProgress, exerciseId: string): number {
  const at = progress.exerciseProgress[exerciseId]?.lastAttempt;
  return at ? new Date(at).getTime() : 0;
}

/**
 * Choose the single best exercise to practise next, in priority order:
 *   1. review  — an exercise is due for spaced-repetition review
 *   2. weak-area — reinforce the type with the lowest (trusted) accuracy
 *   3. new     — an exercise that has never been attempted
 *   4. refresh — revisit whatever was practised least recently
 * Returns null only when there are no exercises at all.
 */
export function recommendNext(
  exercises: Exercise[],
  progress: UserProgress,
  dueReviews: ReviewItem[],
  now: Date = new Date()
): Recommendation | null {
  if (exercises.length === 0) return null;

  // 1. Spaced-repetition reviews that are due (most overdue first).
  const due = dueReviews
    .filter((r) => new Date(r.nextReview).getTime() <= now.getTime())
    .sort((a, b) => new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime());
  for (const r of due) {
    const ex = exercises.find((e) => e.id === r.exerciseId);
    if (ex) {
      const n = due.length;
      return {
        exercise: ex,
        reason: 'review',
        detail: `${n} exercise${n === 1 ? '' : 's'} due for review`,
      };
    }
  }

  // 2. Weakest type with enough attempts to be trustworthy and sub-threshold accuracy.
  const weakTypes = accuracyByType(progress.exerciseProgress, exercises)
    .filter((t) => t.attempts >= MIN_ATTEMPTS_FOR_WEAK && t.accuracy < WEAK_ACCURACY)
    .sort((a, b) => a.accuracy - b.accuracy);
  for (const wt of weakTypes) {
    // Rank within the weak type: reinforce an attempted-but-unmastered exercise
    // first (that's the one you're actually struggling with), then try a new one
    // of the same type, and only repeat an already-mastered exercise as a last
    // resort. Ties break to the lower best score, then the easier exercise.
    const rank = (e: Exercise): number => {
      const ep = progress.exerciseProgress[e.id];
      if (!ep) return 1; // unattempted
      return ep.bestScore < MASTERY_SCORE ? 0 : 2; // struggling vs mastered
    };
    const candidates = exercises
      .filter((e) => e.type === wt.type)
      .sort((a, b) => {
        const ra = rank(a);
        const rb = rank(b);
        if (ra !== rb) return ra - rb;
        const sa = bestScoreFor(progress, a.id);
        const sb = bestScoreFor(progress, b.id);
        if (sa !== sb) return sa - sb;
        return a.difficulty - b.difficulty;
      });
    if (candidates.length > 0) {
      return {
        exercise: candidates[0],
        reason: 'weak-area',
        detail: `Your accuracy in ${labelForType(wt.type)} is ${Math.round(
          wt.accuracy * 100
        )}% — let's strengthen it`,
      };
    }
  }

  // 3. A new exercise never attempted (easiest first).
  const unattempted = exercises
    .filter((e) => !progress.exerciseProgress[e.id])
    .sort((a, b) => a.difficulty - b.difficulty);
  if (unattempted.length > 0) {
    return {
      exercise: unattempted[0],
      reason: 'new',
      detail: 'A new exercise to expand your skills',
    };
  }

  // 4. Refresh the least-recently practised exercise.
  const attempted = [...exercises]
    .filter((e) => progress.exerciseProgress[e.id])
    .sort((a, b) => lastAttemptMs(progress, a.id) - lastAttemptMs(progress, b.id));
  if (attempted.length > 0) {
    return {
      exercise: attempted[0],
      reason: 'refresh',
      detail: "Keep it fresh — revisit something you haven't practised recently",
    };
  }

  return null;
}
