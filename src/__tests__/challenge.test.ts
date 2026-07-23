import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadBest, saveBest, formatChallengeResult } from '../lib/challenge';

// The global setup.ts replaces window.localStorage with vi.fn() stubs that
// don't persist. Wire an in-memory store so save/load round-trips are real,
// mirroring src/__tests__/noteSpeed.test.ts.
let store: Record<string, string> = {};
const ls = window.localStorage as unknown as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
};

describe('challenge — load/save best', () => {
  beforeEach(() => {
    store = {};
    ls.getItem.mockImplementation((key: string) => store[key] ?? null);
    ls.setItem.mockImplementation((key: string, value: string) => {
      store[key] = value;
    });
    ls.removeItem.mockImplementation((key: string) => {
      delete store[key];
    });
    ls.clear.mockImplementation(() => {
      store = {};
    });
  });

  afterEach(() => {
    store = {};
  });

  it('loadBest returns 0 when nothing is stored', () => {
    expect(loadBest('interval-recognition')).toBe(0);
  });

  it('saveBest stores and returns true for a new best', () => {
    expect(saveBest('interval-recognition', 7)).toBe(true);
    expect(loadBest('interval-recognition')).toBe(7);
  });

  it('saveBest returns false and does not overwrite on a lower score', () => {
    saveBest('interval-recognition', 15);
    expect(saveBest('interval-recognition', 10)).toBe(false);
    expect(loadBest('interval-recognition')).toBe(15);
  });

  it('saveBest returns false for a tie or non-positive score', () => {
    saveBest('interval-recognition', 10);
    expect(saveBest('interval-recognition', 10)).toBe(false);
    expect(saveBest('interval-recognition', 0)).toBe(false);
    expect(saveBest('interval-recognition', -5)).toBe(false);
  });

  it('bests are isolated per exercise id', () => {
    saveBest('interval-recognition', 20);
    expect(loadBest('circle-of-fifths')).toBe(0);
    saveBest('circle-of-fifths', 5);
    expect(loadBest('interval-recognition')).toBe(20);
    expect(loadBest('circle-of-fifths')).toBe(5);
  });

  it('persists under the documented key prefix', () => {
    saveBest('interval-recognition', 8);
    expect(store['gtw-challenge-best-interval-recognition']).toBe('8');
  });

  it('loadBest tolerates corrupted storage gracefully', () => {
    store['gtw-challenge-best-interval-recognition'] = 'not-a-number';
    expect(loadBest('interval-recognition')).toBe(0);
  });

  it('loadBest tolerates a thrown localStorage (private mode)', () => {
    ls.getItem.mockImplementationOnce(() => {
      throw new Error('storage unavailable');
    });
    expect(loadBest('interval-recognition')).toBe(0);
  });

  it('saveBest tolerates a thrown localStorage (private mode)', () => {
    ls.setItem.mockImplementationOnce(() => {
      throw new Error('storage unavailable');
    });
    expect(saveBest('interval-recognition', 99)).toBe(false);
  });
});

describe('challenge — formatChallengeResult', () => {
  it('formats a normal result with percentage and best', () => {
    const result = formatChallengeResult(7, 10, 12);
    expect(result).toBe('Challenge complete: 7/10 correct (70%) — Best: 12');
  });

  it('marks "New best!" when the score equals or exceeds the best', () => {
    const result = formatChallengeResult(15, 15, 15);
    expect(result).toBe('Challenge complete: 15/15 correct (100%) — New best!');
  });

  it('marks "New best!" when the score strictly exceeds the best', () => {
    const result = formatChallengeResult(20, 20, 15);
    expect(result).toBe('Challenge complete: 20/20 correct (100%) — New best!');
  });

  it('handles zero total answered without division by zero', () => {
    const result = formatChallengeResult(0, 0, 5);
    expect(result).toBe('Challenge complete: 0/0 correct (0%) — Best: 5');
  });

  it('shows Best: 0 when no prior best and score is zero', () => {
    const result = formatChallengeResult(0, 10, 0);
    expect(result).toBe('Challenge complete: 0/10 correct (0%) — Best: 0');
  });

  it('rounds the percentage to the nearest integer', () => {
    const result = formatChallengeResult(1, 3, 2);
    expect(result).toBe('Challenge complete: 1/3 correct (33%) — Best: 2');
  });
});
