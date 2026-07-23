// Guided-path engine (roadmap P1#1). Pure + deterministic: turns the authored
// exercise arc + recorded progress into an ordered path with per-step status.
// Soft gating only — every exercise stays freely reachable from the nav; this
// just tells the learner where they are and what's next.

import type { Exercise } from '../types/exercise';
import type { UserProgress } from '../types/progress';
import type { SkillLevel } from '../stores/progressStore';

export type PathStatus = 'done' | 'current' | 'upcoming' | 'optional';

export interface PathStep {
  exercise: Exercise;
  status: PathStatus;
}

// A goal level sets the difficulty at which the path "starts": not-yet-attempted
// exercises below the floor are shown as optional so `current` lands at the
// learner's chosen level.
const LEVEL_FLOOR: Record<SkillLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

/**
 * Ordered learning path: the authored category arc (the order each `type` first
 * appears in `exercises`), and within each category by ascending difficulty.
 * `done` = attempted at least once; below the goal floor + unattempted =
 * `optional`; the first remaining step = `current`; the rest `upcoming`.
 */
export function getLearningPath(
  exercises: Exercise[],
  progress: UserProgress,
  goalLevel?: SkillLevel,
): PathStep[] {
  const order: string[] = [];
  for (const ex of exercises) {
    if (!order.includes(ex.type)) order.push(ex.type);
  }

  const sorted = [...exercises].sort((a, b) => {
    const byArc = order.indexOf(a.type) - order.indexOf(b.type);
    return byArc !== 0 ? byArc : a.difficulty - b.difficulty;
  });

  const floor = goalLevel ? LEVEL_FLOOR[goalLevel] : 0;
  let currentAssigned = false;

  return sorted.map((exercise): PathStep => {
    const attempts = progress.exerciseProgress[exercise.id]?.totalAttempts ?? 0;
    if (attempts > 0) return { exercise, status: 'done' };
    if (exercise.difficulty < floor) return { exercise, status: 'optional' };
    if (!currentAssigned) {
      currentAssigned = true;
      return { exercise, status: 'current' };
    }
    return { exercise, status: 'upcoming' };
  });
}
