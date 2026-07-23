import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CHORDS,
  STRING_COUNT,
  changesPerMinute,
  formatCpm,
  getChordById,
  chordsByCategory,
  pairKey,
  pairLabel,
  loadPersonalBest,
  savePersonalBest,
} from '../lib/chordLibrary';

// ---------------------------------------------------------------------------
// Chord data validity — every shape is internally consistent.
// ---------------------------------------------------------------------------

describe('chord data validity', () => {
  it('has exactly 6 strings per chord', () => {
    for (const chord of CHORDS) {
      expect(chord.frets.length).toBe(STRING_COUNT);
      expect(chord.fingers.length).toBe(STRING_COUNT);
    }
  });

  it('frets are in range (-1..12) and fingers in range (0..4)', () => {
    for (const chord of CHORDS) {
      for (const fret of chord.frets) {
        expect(fret).toBeGreaterThanOrEqual(-1);
        expect(fret).toBeLessThanOrEqual(12);
      }
      for (const finger of chord.fingers) {
        expect(finger).toBeGreaterThanOrEqual(0);
        expect(finger).toBeLessThanOrEqual(4);
      }
    }
  });

  it('finger is 0 wherever the string is muted or open', () => {
    for (const chord of CHORDS) {
      chord.frets.forEach((fret, s) => {
        if (fret <= 0) {
          expect(chord.fingers[s]).toBe(0);
        }
      });
    }
  });

  it('finger is > 0 wherever a fret is pressed', () => {
    for (const chord of CHORDS) {
      chord.frets.forEach((fret, s) => {
        if (fret > 0) {
          expect(chord.fingers[s]).toBeGreaterThan(0);
        }
      });
    }
  });

  it('baseFret is >= 1 and no fret is below the diagram base', () => {
    for (const chord of CHORDS) {
      expect(chord.baseFret).toBeGreaterThanOrEqual(1);
      for (const fret of chord.frets) {
        if (fret > 0) expect(fret).toBeGreaterThanOrEqual(chord.baseFret);
      }
    }
  });

  it('barre fret is the floor across spanning strings (higher frets = other fingers)', () => {
    for (const chord of CHORDS) {
      if (!chord.barre) continue;
      const { fret, fromString, toString } = chord.barre;
      expect(fret).toBeGreaterThanOrEqual(chord.baseFret);
      expect(fromString).toBeLessThanOrEqual(toString);
      // Every spanned string is either barred at the barre fret or fretted
      // higher by another finger on top of the barre. Muted (-1) is not allowed
      // inside a barre span.
      for (let s = fromString; s <= toString; s++) {
        expect(chord.frets[s]).toBeGreaterThanOrEqual(fret);
      }
    }
  });

  it('ids and names are unique', () => {
    const ids = CHORDS.map((c) => c.id);
    const names = CHORDS.map((c) => c.name);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('includes the required open majors, minors, 7ths, barres, and 7th colours', () => {
    const ids = new Set(CHORDS.map((c) => c.id));
    for (const required of [
      'C', 'A', 'G', 'E', 'D',
      'Am', 'Em', 'Dm',
      'A7', 'E7', 'D7', 'G7',
      'F-barre', 'B-barre',
      'Cmaj7', 'Am7', 'Dm7',
    ]) {
      expect(ids.has(required)).toBe(true);
    }
  });

  it('categories cover the documented set', () => {
    const cats = new Set(CHORDS.map((c) => c.category));
    for (const cat of ['major', 'minor', 'dominant-7', 'maj7', 'min7', 'barre'] as const) {
      expect(cats.has(cat)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

describe('lookups', () => {
  it('getChordById returns the chord', () => {
    expect(getChordById('C').name).toBe('C');
  });

  it('getChordById throws for unknown ids', () => {
    expect(() => getChordById('nope')).toThrow();
  });

  it('chordsByCategory filters and preserves order', () => {
    const majors = chordsByCategory('major');
    expect(majors.length).toBeGreaterThan(0);
    expect(majors.every((c) => c.category === 'major')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Change-rate computation
// ---------------------------------------------------------------------------

describe('changesPerMinute', () => {
  it('returns 0 for zero changes', () => {
    expect(changesPerMinute(0, 60)).toBe(0);
  });

  it('60 changes over 60 seconds = 60 CPM', () => {
    expect(changesPerMinute(60, 60)).toBe(60);
  });

  it('30 changes over 15 seconds = 120 CPM', () => {
    expect(changesPerMinute(30, 15)).toBe(120);
  });

  it('clamps sub-second elapsed to 1s (no infinity)', () => {
    const cpm = changesPerMinute(5, 0.01);
    expect(Number.isFinite(cpm)).toBe(true);
    expect(cpm).toBe(5 * 60); // uses clamped 1s
  });
});

describe('formatCpm', () => {
  it('formats 0 and non-finite as "0"', () => {
    expect(formatCpm(0)).toBe('0');
    expect(formatCpm(NaN)).toBe('0');
  });

  it('shows one decimal under 100', () => {
    expect(formatCpm(62.5)).toBe('62.5');
  });

  it('rounds to integer at/above 100', () => {
    expect(formatCpm(120.7)).toBe('121');
  });
});

// ---------------------------------------------------------------------------
// Personal-best persistence
// ---------------------------------------------------------------------------

describe('personal best', () => {
  // The shared test setup mocks localStorage as a no-op vi.fn(). For these
  // persistence tests we need a real in-memory store, so install one per test.
  let store: Map<string, string>;
  beforeEach(() => {
    store = new Map();
    localStorage.getItem = vi.fn((k: string) => (store.has(k) ? store.get(k)! : null));
    localStorage.setItem = vi.fn((k: string, v: string) => { store.set(k, v); });
    localStorage.removeItem = vi.fn((k: string) => { store.delete(k); });
    localStorage.clear = vi.fn(() => { store.clear(); });
  });
  afterEach(() => { store.clear(); });

  it('pairKey is order-independent', () => {
    expect(pairKey('G', 'C')).toBe(pairKey('C', 'G'));
  });

  it('pairLabel renders both names with a connector', () => {
    expect(pairLabel('G', 'Em')).toBe('G ↔ Em');
  });

  it('returns undefined when no best stored', () => {
    expect(loadPersonalBest('G', 'C')).toBeUndefined();
  });

  it('saves and loads a best', () => {
    expect(savePersonalBest('G', 'C', 40, 40)).toBe(true);
    const best = loadPersonalBest('G', 'C');
    expect(best).toBeDefined();
    expect(best!.changes).toBe(40);
    expect(best!.cpm).toBe(40);
    expect(best!.achievedAt).toBeGreaterThan(0);
  });

  it('does not overwrite a higher best', () => {
    savePersonalBest('G', 'C', 50, 50);
    expect(savePersonalBest('G', 'C', 40, 40)).toBe(false);
    expect(loadPersonalBest('G', 'C')!.changes).toBe(50);
  });

  it('overwrites when changes tie but cpm is higher', () => {
    savePersonalBest('G', 'C', 40, 40);
    expect(savePersonalBest('G', 'C', 40, 41)).toBe(true);
    expect(loadPersonalBest('G', 'C')!.cpm).toBe(41);
  });

  it('ignores corrupt storage', () => {
    localStorage.setItem(pairKey('G', 'C'), '{not json');
    expect(loadPersonalBest('G', 'C')).toBeUndefined();
  });
});
