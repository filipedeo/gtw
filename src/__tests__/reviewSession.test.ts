import { describe, expect, it } from 'vitest';
import {
  buildReviewQueue,
  nextInQueue,
  queueProgress,
  type ReviewQueueEntry,
} from '../lib/reviewSession';
import type { Exercise } from '../types/exercise';
import type { ReviewItem } from '../types/progress';

function review(exerciseId: string): ReviewItem {
  return {
    exerciseId,
    easeFactor: 2.5,
    interval: 1,
    nextReview: new Date('2020-01-01'),
    repetitions: 1,
  };
}

function exercise(id: string, overrides: Partial<Exercise> = {}): Exercise {
  return {
    id,
    title: `Exercise ${id}`,
    description: '',
    type: 'note-identification',
    category: 'fundamentals',
    difficulty: 'beginner',
    ...overrides,
  } as Exercise;
}

describe('buildReviewQueue', () => {
  it('preserves the incoming (most-overdue-first) order', () => {
    const due = [review('c'), review('a'), review('b')];
    const exercises = [exercise('a'), exercise('b'), exercise('c')];
    const queue = buildReviewQueue(due, exercises);
    expect(queue.map((q) => q.exerciseId)).toEqual(['c', 'a', 'b']);
  });

  it('drops review items whose exercise no longer exists', () => {
    const due = [review('gone'), review('a')];
    const exercises = [exercise('a')];
    const queue = buildReviewQueue(due, exercises);
    expect(queue.map((q) => q.exerciseId)).toEqual(['a']);
  });

  it('de-duplicates by exerciseId, keeping the first occurrence', () => {
    const due = [review('a'), review('a'), review('b')];
    const exercises = [exercise('a'), exercise('b')];
    const queue = buildReviewQueue(due, exercises);
    expect(queue.map((q) => q.exerciseId)).toEqual(['a', 'b']);
  });

  it('filters out exercises not playable on the active instrument', () => {
    const due = [review('gtr'), review('bass'), review('both')];
    const exercises = [
      exercise('gtr', { instruments: ['guitar'] }),
      exercise('bass', { instruments: ['bass'] }),
      exercise('both', { instruments: ['guitar', 'bass'] }),
    ];
    const queue = buildReviewQueue(due, exercises, 'bass');
    expect(queue.map((q) => q.exerciseId)).toEqual(['bass', 'both']);
  });

  it('keeps instrument-agnostic exercises (no instruments field) for any instrument', () => {
    const due = [review('a')];
    const exercises = [exercise('a')];
    expect(buildReviewQueue(due, exercises, 'bass')).toHaveLength(1);
    expect(buildReviewQueue(due, exercises, 'guitar')).toHaveLength(1);
  });

  it('carries the exercise title through', () => {
    const queue = buildReviewQueue(
      [review('a')],
      [exercise('a', { title: 'Name the Note' })],
    );
    expect(queue[0]).toEqual({ exerciseId: 'a', title: 'Name the Note' });
  });

  it('returns an empty queue when nothing is due', () => {
    expect(buildReviewQueue([], [exercise('a')])).toEqual([]);
  });
});

describe('queueProgress', () => {
  const queue: ReviewQueueEntry[] = [
    { exerciseId: 'a', title: 'A' },
    { exerciseId: 'b', title: 'B' },
    { exerciseId: 'c', title: 'C' },
  ];

  it('reports a 1-based position and the total', () => {
    expect(queueProgress(queue, 'a')).toEqual({ position: 1, total: 3 });
    expect(queueProgress(queue, 'c')).toEqual({ position: 3, total: 3 });
  });

  it('reports position 0 for a null or unknown current id', () => {
    expect(queueProgress(queue, null)).toEqual({ position: 0, total: 3 });
    expect(queueProgress(queue, 'zzz')).toEqual({ position: 0, total: 3 });
  });

  it('reports total 0 for an empty queue', () => {
    expect(queueProgress([], 'a')).toEqual({ position: 0, total: 0 });
  });
});

describe('nextInQueue', () => {
  const queue: ReviewQueueEntry[] = [
    { exerciseId: 'a', title: 'A' },
    { exerciseId: 'b', title: 'B' },
  ];

  it('returns the first entry when there is no current id', () => {
    expect(nextInQueue(queue, null)?.exerciseId).toBe('a');
  });

  it('returns the following entry', () => {
    expect(nextInQueue(queue, 'a')?.exerciseId).toBe('b');
  });

  it('returns null after the last entry', () => {
    expect(nextInQueue(queue, 'b')).toBeNull();
  });

  it('returns null for an unknown current id', () => {
    expect(nextInQueue(queue, 'zzz')).toBeNull();
  });

  it('returns null for an empty queue', () => {
    expect(nextInQueue([], null)).toBeNull();
  });
});
