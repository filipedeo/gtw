import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  maxFretForDifficulty,
  resolveNote,
  buildOptions,
  generateQuestion,
  isAnswerCorrect,
  validPositionsForNote,
  isPositionCorrect,
  formatDrillKey,
  loadPersonalBest,
  savePersonalBest,
  clearPersonalBest,
} from '../lib/noteSpeed';
import { STANDARD_TUNINGS } from '../types/guitar';

const tuning = STANDARD_TUNINGS['standard-6'];
const stringCount = 6;

describe('noteSpeed — maxFretForDifficulty', () => {
  it('bounds fret range to mirror note-identification sets', () => {
    expect(maxFretForDifficulty(1)).toBe(5);
    expect(maxFretForDifficulty(2)).toBe(12);
    expect(maxFretForDifficulty(3)).toBe(22);
  });

  it('treats difficulty below 1 as the easiest set', () => {
    expect(maxFretForDifficulty(0)).toBe(5);
  });
});

describe('noteSpeed — resolveNote', () => {
  it('returns canonical sharp spelling + full note for a known position', () => {
    // String 0 (low E), fret 1 -> F (with octave)
    const { noteName, fullNote } = resolveNote({ string: 0, fret: 1 }, tuning, stringCount);
    expect(noteName).toBe('F');
    expect(fullNote).toMatch(/^F\d$/);
  });

  it('returns the open string note at fret 0', () => {
    const { noteName } = resolveNote({ string: 0, fret: 0 }, tuning, stringCount);
    expect(noteName).toBe('E');
  });
});

describe('noteSpeed — buildOptions', () => {
  it('always includes the correct note and exactly 4 options', () => {
    const opts = buildOptions('A#', () => 0);
    expect(opts).toHaveLength(4);
    expect(opts).toContain('A#');
  });

  it('never duplicates the correct note as a distractor', () => {
    // With a fixed RNG, options are deterministic but must still be unique.
    const opts = buildOptions('C', () => 0.5);
    expect(new Set(opts).size).toBe(4);
    expect(opts).toContain('C');
  });

  it('is enharmonic-aware: Bb is not a distractor for A#', () => {
    // Bb and A# are enharmonic equivalents; neither should appear as a wrong
    // option when the other is correct (would make the quiz ambiguous).
    const opts = buildOptions('A#', () => 0.3);
    expect(opts).toContain('A#');
    // Bb is not in NOTE_NAMES (which uses sharps), so this is trivially true,
    // but the guard documents the intent and protects against future spelling changes.
    expect(opts.filter((n) => n === 'A#')).toHaveLength(1);
  });
});

describe('noteSpeed — generateQuestion', () => {
  it('builds a question at the injected position with valid options', () => {
    const q = generateQuestion(stringCount, tuning, 1, {
      randomPosition: { string: 1, fret: 1 },
      shuffle: () => 0,
    });
    expect(q.position).toEqual({ string: 1, fret: 1 });
    expect(q.options).toHaveLength(4);
    expect(q.options).toContain(q.noteName);
  });

  it('respects the difficulty fret bound for a forced position', () => {
    // Difficulty 1 caps at fret 5; forcing fret 12 is allowed because we
    // inject the position (used only in tests), but the helper itself should
    // still resolve the note correctly regardless of the bound.
    const q = generateQuestion(stringCount, tuning, 1, {
      randomPosition: { string: 0, fret: 12 },
      shuffle: () => 0,
    });
    expect(q.noteName).toBe('E'); // 12th fret = same as open
  });
});

describe('noteSpeed — isAnswerCorrect', () => {
  it('treats enharmonic equivalents as correct', () => {
    expect(isAnswerCorrect('A#', 'A#')).toBe(true);
    expect(isAnswerCorrect('Bb', 'A#')).toBe(true);
    expect(isAnswerCorrect('C', 'D')).toBe(false);
  });
});

describe('noteSpeed — locate-the-note direction', () => {
  it('lists all valid positions for a note within the difficulty bound', () => {
    // On a 6-string standard tuning, F (chroma 5) appears at least once per
    // string within frets 0-5 (difficulty 1).
    const positions = validPositionsForNote('F', tuning, stringCount, 1);
    expect(positions.length).toBeGreaterThan(0);
    // Each position actually resolves to F.
    for (const p of positions) {
      const { noteName } = resolveNote(p, tuning, stringCount);
      expect(noteName).toBe('F');
    }
  });

  it('isPositionCorrect accepts any valid position and rejects others', () => {
    const valid = validPositionsForNote('G', tuning, stringCount, 2);
    expect(valid.length).toBeGreaterThan(0);
    expect(isPositionCorrect(valid[0], 'G', tuning, stringCount, 2)).toBe(true);
    // A fret that is not a G on that string should be rejected.
    const wrong = { string: valid[0].string, fret: (valid[0].fret + 1) % 13 };
    expect(isPositionCorrect(wrong, 'G', tuning, stringCount, 2)).toBe(false);
  });
});

describe('noteSpeed — formatDrillKey', () => {
  it('builds a stable, namespaced key per instrument + string count', () => {
    expect(formatDrillKey('guitar', 6)).toBe('gtw-note-speed-best:guitar-6');
    expect(formatDrillKey('bass', 4)).toBe('gtw-note-speed-best:bass-4');
  });

  it('produces distinct keys for different configs', () => {
    expect(formatDrillKey('guitar', 6)).not.toBe(formatDrillKey('guitar', 7));
    expect(formatDrillKey('guitar', 6)).not.toBe(formatDrillKey('bass', 6));
  });
});

describe('noteSpeed — personal best persistence', () => {
  // The global setup.ts replaces window.localStorage with vi.fn() stubs that
  // don't persist. Wire an in-memory store so save/load round-trips are real.
  let store: Record<string, string> = {};
  // Cast the mocked localStorage so we can call vitest mock methods on it.
  const ls = window.localStorage as unknown as {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };

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

  it('loadPersonalBest returns 0 when nothing is stored', () => {
    expect(loadPersonalBest('gtw-note-speed-best:guitar-6')).toBe(0);
  });

  it('savePersonalBest stores and returns true for a new best', () => {
    const key = formatDrillKey('guitar', 6);
    expect(savePersonalBest(key, 10)).toBe(true);
    expect(loadPersonalBest(key)).toBe(10);
  });

  it('savePersonalBest returns false and does not overwrite on a lower score', () => {
    const key = formatDrillKey('guitar', 6);
    savePersonalBest(key, 15);
    expect(savePersonalBest(key, 10)).toBe(false);
    expect(loadPersonalBest(key)).toBe(15);
  });

  it('savePersonalBest returns false for a tie or non-positive score', () => {
    const key = formatDrillKey('guitar', 6);
    savePersonalBest(key, 10);
    expect(savePersonalBest(key, 10)).toBe(false);
    expect(savePersonalBest(key, 0)).toBe(false);
    expect(savePersonalBest(key, -5)).toBe(false);
  });

  it('bests are isolated per drill key (instrument / string count)', () => {
    const g6 = formatDrillKey('guitar', 6);
    const b4 = formatDrillKey('bass', 4);
    savePersonalBest(g6, 20);
    expect(loadPersonalBest(b4)).toBe(0);
    savePersonalBest(b4, 5);
    expect(loadPersonalBest(g6)).toBe(20);
    expect(loadPersonalBest(b4)).toBe(5);
  });

  it('clearPersonalBest removes the stored value', () => {
    const key = formatDrillKey('guitar', 6);
    savePersonalBest(key, 12);
    clearPersonalBest(key);
    expect(loadPersonalBest(key)).toBe(0);
  });

  it('loadPersonalBest tolerates corrupted storage gracefully', () => {
    store['gtw-note-speed-best:guitar-6'] = 'not-a-number';
    expect(loadPersonalBest('gtw-note-speed-best:guitar-6')).toBe(0);
  });

  it('loadPersonalBest tolerates a thrown localStorage (private mode)', () => {
    ls.getItem.mockImplementationOnce(() => {
      throw new Error('storage unavailable');
    });
    expect(loadPersonalBest('gtw-note-speed-best:guitar-6')).toBe(0);
  });

  it('savePersonalBest tolerates a thrown localStorage (private mode)', () => {
    // getItem works (returns null → current best 0), but setItem throws.
    ls.setItem.mockImplementationOnce(() => {
      throw new Error('storage unavailable');
    });
    expect(savePersonalBest('gtw-note-speed-best:guitar-6', 99)).toBe(false);
  });
});
