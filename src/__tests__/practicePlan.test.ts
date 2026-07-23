import { describe, it, expect } from 'vitest';
import { dueReviewCount, accuracyByType, recommendNext } from '../lib/practicePlan';
import type { Exercise } from '../types/exercise';
import type { UserProgress, ReviewItem, ExerciseProgress } from '../types/progress';

const NOW = new Date('2026-07-23T12:00:00Z');

function ex(id: string, type: Exercise['type'], difficulty: number): Exercise {
  return {
    id,
    type,
    title: id,
    description: '',
    difficulty: difficulty as Exercise['difficulty'],
    instructions: [],
    audioRequired: false,
    fretboardRequired: false,
  };
}

function progressWith(entries: Partial<ExerciseProgress>[]): UserProgress {
  const exerciseProgress: Record<string, ExerciseProgress> = {};
  for (const e of entries) {
    const full: ExerciseProgress = {
      exerciseId: e.exerciseId!,
      exerciseType: e.exerciseType,
      totalAttempts: e.totalAttempts ?? 0,
      correctAttempts: e.correctAttempts ?? 0,
      averageTime: e.averageTime ?? 0,
      lastAttempt: e.lastAttempt ?? new Date('2026-07-01T00:00:00Z'),
      bestScore: e.bestScore ?? 0,
    };
    exerciseProgress[full.exerciseId] = full;
  }
  return {
    totalExercisesCompleted: 0,
    totalTimeSpent: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: null,
    exerciseProgress,
    weakAreas: [],
    strongAreas: [],
  };
}

function review(exerciseId: string, nextReview: string): ReviewItem {
  return { exerciseId, easeFactor: 2.5, interval: 1, nextReview: new Date(nextReview), repetitions: 1 };
}

describe('dueReviewCount', () => {
  it('counts only items due now or earlier', () => {
    const items = [
      review('a', '2026-07-22T00:00:00Z'), // past -> due
      review('b', '2026-07-23T12:00:00Z'), // exactly now -> due
      review('c', '2026-07-24T00:00:00Z'), // future -> not due
    ];
    expect(dueReviewCount(items, NOW)).toBe(2);
  });

  it('returns 0 for an empty list', () => {
    expect(dueReviewCount([], NOW)).toBe(0);
  });
});

describe('accuracyByType', () => {
  it('aggregates attempts and accuracy per type', () => {
    const exercises = [ex('n1', 'note-identification', 1), ex('i1', 'interval-recognition', 1)];
    const progress = progressWith([
      { exerciseId: 'n1', totalAttempts: 10, correctAttempts: 5 },
      { exerciseId: 'i1', totalAttempts: 4, correctAttempts: 4 },
    ]);
    const byType = accuracyByType(progress.exerciseProgress, exercises);
    const note = byType.find((t) => t.type === 'note-identification')!;
    const interval = byType.find((t) => t.type === 'interval-recognition')!;
    expect(note.accuracy).toBeCloseTo(0.5);
    expect(interval.accuracy).toBeCloseTo(1);
  });

  it('prefers the stored exerciseType over the exercise lookup', () => {
    const exercises = [ex('x1', 'note-identification', 1)];
    const progress = progressWith([
      { exerciseId: 'x1', exerciseType: 'interval-recognition', totalAttempts: 2, correctAttempts: 1 },
    ]);
    const byType = accuracyByType(progress.exerciseProgress, exercises);
    expect(byType).toHaveLength(1);
    expect(byType[0].type).toBe('interval-recognition');
  });
});

describe('recommendNext priority', () => {
  const exercises = [
    ex('n1', 'note-identification', 1),
    ex('n2', 'note-identification', 2),
    ex('i1', 'interval-recognition', 1),
    ex('c1', 'circle-of-fifths', 1),
  ];

  it('returns null when there are no exercises', () => {
    expect(recommendNext([], progressWith([]), [], NOW)).toBeNull();
  });

  it('1. prioritises a due review (most overdue first)', () => {
    const reviews = [review('i1', '2026-07-20T00:00:00Z'), review('n1', '2026-07-22T00:00:00Z')];
    const rec = recommendNext(exercises, progressWith([]), reviews, NOW)!;
    expect(rec.reason).toBe('review');
    expect(rec.exercise.id).toBe('i1'); // more overdue
    expect(rec.detail).toContain('2 exercises due');
  });

  it('ignores reviews that are not yet due', () => {
    const reviews = [review('i1', '2026-07-25T00:00:00Z')];
    const rec = recommendNext(exercises, progressWith([{ exerciseId: 'n1' }]), reviews, NOW)!;
    expect(rec.reason).not.toBe('review');
  });

  it('2. targets the weakest type once enough attempts exist', () => {
    const progress = progressWith([
      { exerciseId: 'n1', totalAttempts: 10, correctAttempts: 4, bestScore: 40 }, // 40%
      { exerciseId: 'i1', totalAttempts: 10, correctAttempts: 6, bestScore: 60 }, // 60%
    ]);
    const rec = recommendNext(exercises, progress, [], NOW)!;
    expect(rec.reason).toBe('weak-area');
    // note-identification is weakest; n1 has the lower best score of that type
    expect(rec.exercise.type).toBe('note-identification');
    expect(rec.exercise.id).toBe('n1');
  });

  it('does not flag a weak area below the attempt threshold', () => {
    const progress = progressWith([
      { exerciseId: 'n1', totalAttempts: 2, correctAttempts: 0, bestScore: 0 }, // too few attempts
    ]);
    const rec = recommendNext(exercises, progress, [], NOW)!;
    // falls through to a new exercise instead of weak-area
    expect(rec.reason).toBe('new');
  });

  it('3. recommends a new (unattempted) exercise, easiest first', () => {
    const progress = progressWith([
      { exerciseId: 'n1', totalAttempts: 5, correctAttempts: 5, bestScore: 100 },
      { exerciseId: 'n2', totalAttempts: 5, correctAttempts: 5, bestScore: 100 },
    ]);
    const rec = recommendNext(exercises, progress, [], NOW)!;
    expect(rec.reason).toBe('new');
    // i1 (difficulty 1) and c1 (difficulty 1) unattempted; i1 comes first in list order at same difficulty
    expect(['i1', 'c1']).toContain(rec.exercise.id);
    expect(rec.exercise.difficulty).toBe(1);
  });

  it('4. refreshes the least-recently practised when all attempted and strong', () => {
    const progress = progressWith([
      { exerciseId: 'n1', totalAttempts: 5, correctAttempts: 5, bestScore: 100, lastAttempt: new Date('2026-07-10') },
      { exerciseId: 'n2', totalAttempts: 5, correctAttempts: 5, bestScore: 100, lastAttempt: new Date('2026-07-05') },
      { exerciseId: 'i1', totalAttempts: 5, correctAttempts: 5, bestScore: 100, lastAttempt: new Date('2026-07-15') },
      { exerciseId: 'c1', totalAttempts: 5, correctAttempts: 5, bestScore: 100, lastAttempt: new Date('2026-07-12') },
    ]);
    const rec = recommendNext(exercises, progress, [], NOW)!;
    expect(rec.reason).toBe('refresh');
    expect(rec.exercise.id).toBe('n2'); // oldest lastAttempt
  });
});
