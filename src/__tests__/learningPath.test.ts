import { describe, it, expect } from 'vitest';
import { getLearningPath } from '../lib/learningPath';
import type { Exercise } from '../types/exercise';
import type { UserProgress } from '../types/progress';

function ex(id: string, type: Exercise['type'], difficulty: number): Exercise {
  return {
    id,
    type,
    title: id,
    description: '',
    difficulty: difficulty as Exercise['difficulty'],
    instructions: ['x'],
    audioRequired: false,
    fretboardRequired: false,
  };
}

function progressWith(attemptedIds: string[]): UserProgress {
  const exerciseProgress: UserProgress['exerciseProgress'] = {};
  for (const id of attemptedIds) {
    exerciseProgress[id] = {
      exerciseId: id,
      totalAttempts: 1,
      correctAttempts: 1,
      averageTime: 0,
      lastAttempt: new Date(),
      bestScore: 1,
    };
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

// Deliberately unordered so the arc + within-category difficulty sort is tested.
const exercises: Exercise[] = [
  ex('n3', 'note-identification', 3),
  ex('n1', 'note-identification', 1),
  ex('c2', 'caged-system', 2),
  ex('n2', 'note-identification', 2),
  ex('c1', 'caged-system', 1),
];

describe('getLearningPath', () => {
  it('orders by authored category arc, then difficulty ascending within category', () => {
    const path = getLearningPath(exercises, progressWith([]));
    expect(path.map((s) => s.exercise.id)).toEqual(['n1', 'n2', 'n3', 'c1', 'c2']);
  });

  it('marks attempted exercises done and the first remaining step current', () => {
    const path = getLearningPath(exercises, progressWith(['n1']));
    const byId = Object.fromEntries(path.map((s) => [s.exercise.id, s.status]));
    expect(byId.n1).toBe('done');
    expect(byId.n2).toBe('current');
    expect(byId.n3).toBe('upcoming');
    expect(path.filter((s) => s.status === 'current')).toHaveLength(1);
  });

  it('a goal floor marks lower-difficulty unattempted steps optional; current lands at the floor', () => {
    const path = getLearningPath(exercises, progressWith([]), 'intermediate'); // floor 2
    const byId = Object.fromEntries(path.map((s) => [s.exercise.id, s.status]));
    expect(byId.n1).toBe('optional'); // difficulty 1 < 2
    expect(byId.n2).toBe('current'); // first at/above floor
    expect(byId.c1).toBe('optional');
    expect(path.filter((s) => s.status === 'current')).toHaveLength(1);
  });

  it('has no current step once everything is attempted', () => {
    const path = getLearningPath(exercises, progressWith(['n1', 'n2', 'n3', 'c1', 'c2']));
    expect(path.every((s) => s.status === 'done')).toBe(true);
    expect(path.some((s) => s.status === 'current')).toBe(false);
  });
});
