import { describe, it, expect } from 'vitest';
import {
  distributeMinutes,
  maxExercisesForDuration,
  MIN_MINUTES_PER_EXERCISE,
  clampSessionIndex,
} from '../utils/sessionPlan';

describe('sessionPlan duration math', () => {
  describe('distributeMinutes', () => {
    it('sums to exactly the requested total for various counts', () => {
      const cases: Array<[number, number]> = [
        [30, 8],
        [30, 12],
        [15, 7],
        [60, 12],
        [60, 1],
        [45, 4],
        [15, 5],
      ];
      for (const [total, count] of cases) {
        const minutes = distributeMinutes(total, count);
        expect(minutes).toHaveLength(count);
        expect(minutes.reduce((a, b) => a + b, 0)).toBe(total);
      }
    });

    it('spreads the remainder so per-exercise minutes differ by at most 1', () => {
      const minutes = distributeMinutes(30, 8); // 8 -> [4,4,4,4,4,4,3,3] (sum 30)
      const max = Math.max(...minutes);
      const min = Math.min(...minutes);
      expect(max - min).toBeLessThanOrEqual(1);
      expect(minutes.reduce((a, b) => a + b, 0)).toBe(30);
    });

    it('distributes the extra minutes to the earliest exercises first', () => {
      // 30 / 7 = base 4, remainder 2 -> first two get 5
      expect(distributeMinutes(30, 7)).toEqual([5, 5, 4, 4, 4, 4, 4]);
    });

    it('returns an empty array for non-positive counts', () => {
      expect(distributeMinutes(30, 0)).toEqual([]);
      expect(distributeMinutes(30, -3)).toEqual([]);
    });
  });

  describe('maxExercisesForDuration', () => {
    it('caps exercise count so each gets at least the minimum block', () => {
      expect(maxExercisesForDuration(15)).toBe(7); // floor(15/2)
      expect(maxExercisesForDuration(30)).toBe(15);
      expect(maxExercisesForDuration(60)).toBe(30);
    });

    it('always allows at least one exercise', () => {
      expect(maxExercisesForDuration(1)).toBe(1);
      expect(maxExercisesForDuration(0)).toBe(1);
    });

    it('honors a custom minimum', () => {
      expect(maxExercisesForDuration(30, 5)).toBe(6);
    });
  });

  describe('integration: a generated plan sums to the requested session length', () => {
    // Mirrors SessionPlanner.generatePlan: cap the item count, then distribute.
    const buildPlanMinutes = (totalMinutes: number, availableCategories: number): number[] => {
      const cap = maxExercisesForDuration(totalMinutes);
      const count = Math.min(availableCategories, cap);
      return distributeMinutes(totalMinutes, count);
    };

    it('30-min plan sums to 30 (regression: previously summed to ~24)', () => {
      for (const available of [4, 8, 12, 20]) {
        const minutes = buildPlanMinutes(30, available);
        expect(minutes.reduce((a, b) => a + b, 0)).toBe(30);
      }
    });

    it('15- and 60-min plans sum exactly to their requested totals', () => {
      expect(buildPlanMinutes(15, 12).reduce((a, b) => a + b, 0)).toBe(15);
      expect(buildPlanMinutes(60, 12).reduce((a, b) => a + b, 0)).toBe(60);
    });

    it('never budgets an exercise below the minimum block', () => {
      const minutes = buildPlanMinutes(15, 30); // 30 categories, but only 7 fit
      expect(minutes.length).toBe(7);
      for (const m of minutes) {
        expect(m).toBeGreaterThanOrEqual(MIN_MINUTES_PER_EXERCISE);
      }
    });
  });
});

describe('clampSessionIndex', () => {
  it('returns 0 for an empty plan regardless of index', () => {
    expect(clampSessionIndex(0, 0)).toBe(0);
    expect(clampSessionIndex(5, 0)).toBe(0);
    expect(clampSessionIndex(-2, 0)).toBe(0);
  });

  it('clamps indices below 0 up to 0', () => {
    expect(clampSessionIndex(-1, 5)).toBe(0);
    expect(clampSessionIndex(-100, 5)).toBe(0);
  });

  it('clamps indices above the last valid position to the final index', () => {
    expect(clampSessionIndex(5, 5)).toBe(4);
    expect(clampSessionIndex(999, 3)).toBe(2);
  });

  it('passes through in-range indices unchanged', () => {
    expect(clampSessionIndex(0, 5)).toBe(0);
    expect(clampSessionIndex(2, 5)).toBe(2);
    expect(clampSessionIndex(4, 5)).toBe(4);
  });
});
