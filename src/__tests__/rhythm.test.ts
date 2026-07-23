import { describe, it, expect } from 'vitest';
import {
  NOTE_BEATS,
  PATTERNS_BY_DIFFICULTY,
  RhythmPattern,
  patternFillsBar,
  expectedOnsetTimes,
  gradeTaps,
  getPattern,
  barDurationSeconds,
} from '../lib/rhythm';

describe('pattern data integrity', () => {
  it('every pattern in every difficulty fills exactly one bar', () => {
    for (const patterns of Object.values(PATTERNS_BY_DIFFICULTY)) {
      for (const p of patterns) {
        expect(patternFillsBar(p)).toBe(true);
      }
    }
  });

  it('difficulty 1 uses only quarter and half notes', () => {
    for (const p of PATTERNS_BY_DIFFICULTY[1]) {
      for (const n of p.notes) {
        expect(['quarter', 'half']).toContain(n);
      }
    }
  });

  it('difficulty 3 introduces eighths and half-note mixes', () => {
    const all = PATTERNS_BY_DIFFICULTY[3].flatMap((p) => p.notes);
    expect(all).toContain('half');
    expect(all).toContain('eighth');
  });
});

describe('expectedOnsetTimes', () => {
  it('starts at 0 and spaces quarters evenly at 60 BPM (1 beat = 1s)', () => {
    const pattern: RhythmPattern = { notes: ['quarter', 'quarter', 'quarter', 'quarter'], beatsPerBar: 4 };
    expect(expectedOnsetTimes(pattern, 60)).toEqual([0, 1, 2, 3]);
  });

  it('spaces eighths at half the quarter interval', () => {
    const pattern: RhythmPattern = { notes: ['eighth', 'eighth', 'quarter', 'quarter'], beatsPerBar: 4 };
    // 60 BPM: eighth = 0.5s, quarter = 1s
    expect(expectedOnsetTimes(pattern, 60)).toEqual([0, 0.5, 1, 2]);
  });

  it('respects half-note durations (2 beats each)', () => {
    const pattern: RhythmPattern = { notes: ['half', 'half'], beatsPerBar: 4 };
    expect(expectedOnsetTimes(pattern, 120)).toEqual([0, 1]);
  });

  it('scales onset times inversely with BPM', () => {
    const pattern: RhythmPattern = { notes: ['quarter', 'quarter'], beatsPerBar: 4 };
    const at60 = expectedOnsetTimes(pattern, 60);
    const at120 = expectedOnsetTimes(pattern, 120);
    expect(at120[1]).toBeCloseTo(at60[1] / 2, 10);
  });

  it('produces one onset per note', () => {
    for (const p of PATTERNS_BY_DIFFICULTY[2]) {
      expect(expectedOnsetTimes(p, 100).length).toBe(p.notes.length);
    }
  });
});

describe('barDurationSeconds', () => {
  it('computes 4/4 at 60 BPM as 4 seconds', () => {
    expect(barDurationSeconds(4, 60)).toBe(4);
  });

  it('computes 4/4 at 120 BPM as 2 seconds', () => {
    expect(barDurationSeconds(4, 120)).toBe(2);
  });
});

describe('gradeTaps', () => {
  const tolerance = 0.15; // 150 ms

  it('perfect run: every tap hits → 100% accuracy, 0 misses, 0 extra', () => {
    const expected = [0, 1, 2, 3];
    const taps = [0.01, 1.02, 1.98, 3.05];
    const r = gradeTaps(expected, taps, tolerance);
    expect(r.hits).toBe(4);
    expect(r.misses).toBe(0);
    expect(r.extra).toBe(0);
    expect(r.accuracy).toBe(100);
  });

  it('counts a tap on the tolerance boundary as a hit (<=)', () => {
    const expected = [1];
    const taps = [1.15]; // exactly tolerance
    const r = gradeTaps(expected, taps, tolerance);
    expect(r.hits).toBe(1);
    expect(r.accuracy).toBe(100);
  });

  it('rejects a tap just outside tolerance', () => {
    const expected = [1];
    const taps = [1.151]; // just over tolerance
    const r = gradeTaps(expected, taps, tolerance);
    expect(r.hits).toBe(0);
    expect(r.misses).toBe(1);
    expect(r.extra).toBe(1);
    expect(r.accuracy).toBe(0);
  });

  it('does not double-count: two taps for one onset → 1 hit + 1 extra', () => {
    const expected = [1, 2];
    const taps = [1.0, 1.05, 2.0]; // two taps near onset 1, one near onset 2
    const r = gradeTaps(expected, taps, tolerance);
    expect(r.hits).toBe(2);
    expect(r.misses).toBe(0);
    expect(r.extra).toBe(1);
    expect(r.accuracy).toBe(100);
  });

  it('missed onsets: fewer taps than expected → misses counted', () => {
    const expected = [0, 1, 2, 3];
    const taps = [0.02, 2.01]; // missed onsets 1 and 3
    const r = gradeTaps(expected, taps, tolerance);
    expect(r.hits).toBe(2);
    expect(r.misses).toBe(2);
    expect(r.extra).toBe(0);
    expect(r.accuracy).toBe(50);
  });

  it('extra taps with no nearby onset count as extra', () => {
    const expected = [1, 2];
    const taps = [1.0, 5.0, 2.0]; // 5.0 is nowhere near any onset
    const r = gradeTaps(expected, taps, tolerance);
    expect(r.hits).toBe(2);
    expect(r.misses).toBe(0);
    expect(r.extra).toBe(1);
    expect(r.accuracy).toBe(100);
  });

  it('empty taps → 0 hits, all misses, 0% accuracy', () => {
    const expected = [0, 1, 2];
    const r = gradeTaps(expected, [], tolerance);
    expect(r.hits).toBe(0);
    expect(r.misses).toBe(3);
    expect(r.extra).toBe(0);
    expect(r.accuracy).toBe(0);
  });

  it('empty expected → 0% accuracy, no crashes', () => {
    const r = gradeTaps([], [1, 2, 3], tolerance);
    expect(r.hits).toBe(0);
    expect(r.misses).toBe(0);
    expect(r.extra).toBe(3);
    expect(r.accuracy).toBe(0);
  });

  it('greedy nearest matching: a tap closer to onset B than A grabs B', () => {
    const expected = [1, 2];
    const taps = [1.9]; // closer to onset at 2
    const r = gradeTaps(expected, taps, tolerance);
    expect(r.hits).toBe(1);
    expect(r.misses).toBe(1);
    expect(r.matchedTapIndices).toEqual([-1, 0]);
  });

  it('matchedTapIndices length equals expected count', () => {
    const expected = [0, 1, 2, 3];
    const taps = [0.1, 1.1, 2.1, 3.1];
    const r = gradeTaps(expected, taps, tolerance);
    expect(r.matchedTapIndices).toHaveLength(4);
    expect(r.matchedTapIndices).toEqual([0, 1, 2, 3]);
  });
});

describe('getPattern', () => {
  it('returns a valid pattern for known difficulty', () => {
    const p = getPattern(1, 0);
    expect(patternFillsBar(p)).toBe(true);
  });

  it('wraps around when index exceeds pool size', () => {
    const p0 = getPattern(1, 0);
    const p2 = getPattern(1, 2); // pool has 2 patterns → wraps to index 0
    expect(p2).toEqual(p0);
  });

  it('falls back to difficulty 1 for unknown levels', () => {
    const p = getPattern(99, 0);
    expect(patternFillsBar(p)).toBe(true);
  });
});

describe('NOTE_BEATS consistency', () => {
  it('whole = 2 × half = 4 × quarter = 8 × eighth = 16 × sixteenth', () => {
    expect(NOTE_BEATS.whole).toBe(2 * NOTE_BEATS.half);
    expect(NOTE_BEATS.whole).toBe(4 * NOTE_BEATS.quarter);
    expect(NOTE_BEATS.whole).toBe(8 * NOTE_BEATS.eighth);
    expect(NOTE_BEATS.whole).toBe(16 * NOTE_BEATS.sixteenth);
  });
});
