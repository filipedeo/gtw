import { describe, it, expect } from 'vitest';
import { matchesTarget } from '../lib/playAlong';
import { PitchResult } from '../lib/pitchDetection';

/** Build a synthetic PitchResult with the given note + tuning + clarity. */
function pitch(
  noteNameWithoutOctave: string,
  opts: { cents?: number; clarity?: number; octave?: number; frequency?: number } = {},
): PitchResult {
  const { cents = 0, clarity = 0.95, octave = 4, frequency = 440 } = opts;
  return {
    frequency,
    noteName: `${noteNameWithoutOctave}${octave}`,
    noteNameWithoutOctave,
    octave,
    cents,
    clarity,
  };
}

describe('matchesTarget', () => {
  it('returns true for an exact in-tune, clear match', () => {
    expect(matchesTarget(pitch('A', { cents: 0, clarity: 0.99 }), 'A')).toBe(true);
  });

  it('matches at the default cents boundary (35)', () => {
    expect(matchesTarget(pitch('G', { cents: 35, clarity: 0.9 }), 'G')).toBe(true);
    expect(matchesTarget(pitch('G', { cents: -35, clarity: 0.9 }), 'G')).toBe(true);
  });

  it('rejects when off by more than 35 cents', () => {
    expect(matchesTarget(pitch('A', { cents: 36 }), 'A')).toBe(false);
    expect(matchesTarget(pitch('A', { cents: -36 }), 'A')).toBe(false);
  });

  it('rejects when clarity is below 0.9', () => {
    expect(matchesTarget(pitch('A', { clarity: 0.89 }), 'A')).toBe(false);
  });

  it('accepts at the default clarity boundary (0.9)', () => {
    expect(matchesTarget(pitch('A', { clarity: 0.9, cents: 0 }), 'A')).toBe(true);
  });

  it('rejects a wrong note', () => {
    expect(matchesTarget(pitch('A'), 'C')).toBe(false);
  });

  it('normalizes enharmonic spellings (Db target matches C# detection)', () => {
    expect(matchesTarget(pitch('C#'), 'Db')).toBe(true);
    expect(matchesTarget(pitch('Db', { clarity: 0.95 }), 'C#')).toBe(true);
  });

  it('returns false when latest is null', () => {
    expect(matchesTarget(null, 'A')).toBe(false);
  });

  it('honors custom maxCents', () => {
    // 20 cents: rejected at default (35? no, 20<=35 true) but the point is a
    // tighter tolerance. With maxCents=10, 20 cents is rejected.
    expect(matchesTarget(pitch('A', { cents: 20 }), 'A', { maxCents: 10 })).toBe(false);
    expect(matchesTarget(pitch('A', { cents: 10 }), 'A', { maxCents: 10 })).toBe(true);
  });

  it('honors custom minClarity', () => {
    expect(matchesTarget(pitch('A', { clarity: 0.8 }), 'A', { minClarity: 0.75 })).toBe(true);
    expect(matchesTarget(pitch('A', { clarity: 0.7 }), 'A', { minClarity: 0.75 })).toBe(false);
  });

  it('ignores octave differences', () => {
    // A2 vs target "A" (no octave) — only the letter class matters.
    expect(matchesTarget(pitch('A', { octave: 2 }), 'A')).toBe(true);
  });
});
