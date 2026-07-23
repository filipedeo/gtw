import type { Exercise } from '../types/exercise';
import type { Instrument } from '../types/guitar';
import type { ReviewItem } from '../types/progress';

/**
 * A single step in a spaced-repetition review session.
 * Kept minimal on purpose: the UI resolves the live Exercise by id when it
 * launches, so this stays a pure, serializable value.
 */
export interface ReviewQueueEntry {
  exerciseId: string;
  title: string;
}

/**
 * Build an ordered "review due now" queue from the SM-2 due list.
 *
 * Contract:
 * - Preserves the incoming order (getNextReviews() already returns the most
 *   overdue first), so the learner clears the longest-waiting items first.
 * - Drops items whose exercise no longer exists in the catalog (stale ids from
 *   a removed/renamed exercise) so a session can never launch into nothing.
 * - Drops items not playable on the active instrument (e.g. a bass-only drill
 *   while the guitar is selected) so every step is actionable.
 * - De-duplicates by exerciseId (first/most-overdue occurrence wins).
 */
export function buildReviewQueue(
  dueReviews: ReviewItem[],
  exercises: Exercise[],
  instrument?: Instrument,
): ReviewQueueEntry[] {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const seen = new Set<string>();
  const queue: ReviewQueueEntry[] = [];

  for (const item of dueReviews) {
    if (seen.has(item.exerciseId)) continue;
    const exercise = byId.get(item.exerciseId);
    if (!exercise) continue;
    if (
      instrument &&
      exercise.instruments &&
      !exercise.instruments.includes(instrument)
    ) {
      continue;
    }
    seen.add(item.exerciseId);
    queue.push({ exerciseId: exercise.id, title: exercise.title });
  }

  return queue;
}

/**
 * 1-based position of the current exercise within the queue plus the total.
 * position is 0 when the queue is empty or the id is not in the queue.
 */
export function queueProgress(
  queue: ReviewQueueEntry[],
  currentId: string | null,
): { position: number; total: number } {
  const total = queue.length;
  if (!currentId) return { position: 0, total };
  const index = queue.findIndex((entry) => entry.exerciseId === currentId);
  return { position: index >= 0 ? index + 1 : 0, total };
}

/**
 * The entry that follows currentId in the queue, or null when currentId is the
 * last entry / not found. Used to advance a running review session one step.
 */
export function nextInQueue(
  queue: ReviewQueueEntry[],
  currentId: string | null,
): ReviewQueueEntry | null {
  if (queue.length === 0) return null;
  if (!currentId) return queue[0];
  const index = queue.findIndex((entry) => entry.exerciseId === currentId);
  if (index < 0 || index + 1 >= queue.length) return null;
  return queue[index + 1];
}
