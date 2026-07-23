import { describe, it, expect } from 'vitest';
import { MODES, getModeNotes } from '../lib/theoryEngine';
import { Note } from 'tonal';

/**
 * Tests for modal practice data.
 *
 * Validates the MODES constant and mode note generation used by
 * ModalPracticeExercise.tsx.
 */

function chroma(note: string): number {
  return Note.get(note).chroma ?? -1;
}

function chromaSet(notes: string[]): Set<number> {
  return new Set(notes.map(chroma).filter(c => c >= 0));
}

// ---------------------------------------------------------------------------
// MODES constant
// ---------------------------------------------------------------------------
describe('MODES constant', () => {
  it('first 7 modes are in order: ionian, dorian, phrygian, lydian, mixolydian, aeolian, locrian', () => {
    const names = MODES.slice(0, 7).map(m => m.name);
    expect(names).toEqual([
      'ionian', 'dorian', 'phrygian', 'lydian',
      'mixolydian', 'aeolian', 'locrian',
    ]);
  });

  it('includes harmonic minor, melodic minor, and blues', () => {
    const names = MODES.map(m => m.name);
    expect(names).toContain('harmonic minor');
    expect(names).toContain('melodic minor');
    expect(names).toContain('blues');
  });
});

// ---------------------------------------------------------------------------
// Parallel mode comparison
// ---------------------------------------------------------------------------
describe('Parallel modes from C', () => {
  it('Dorian and Aeolian share 6 of 7 pitch classes, differ in one', () => {
    const dorianCh = chromaSet(getModeNotes('C', 'dorian'));
    const aeolianCh = chromaSet(getModeNotes('C', 'aeolian'));

    let shared = 0;
    for (const c of dorianCh) {
      if (aeolianCh.has(c)) shared++;
    }
    expect(shared).toBe(6);
    expect(dorianCh.size).toBe(7);
    expect(aeolianCh.size).toBe(7);
  });

  it('Lydian and Ionian share 6 of 7 pitch classes', () => {
    const lydianCh = chromaSet(getModeNotes('C', 'lydian'));
    const ionianCh = chromaSet(getModeNotes('C', 'ionian'));

    let shared = 0;
    for (const c of lydianCh) {
      if (ionianCh.has(c)) shared++;
    }
    expect(shared).toBe(6);
  });

  it('Mixolydian and Ionian share 6 of 7 pitch classes', () => {
    const mixoCh = chromaSet(getModeNotes('C', 'mixolydian'));
    const ionianCh = chromaSet(getModeNotes('C', 'ionian'));

    let shared = 0;
    for (const c of mixoCh) {
      if (ionianCh.has(c)) shared++;
    }
    expect(shared).toBe(6);
  });

  it('each diatonic mode from C has 7 unique pitch classes', () => {
    for (const mode of MODES.slice(0, 7)) {
      const ch = chromaSet(getModeNotes('C', mode.name));
      expect(ch.size).toBe(7);
    }
  });

  it('blues scale from C has 6 unique pitch classes', () => {
    const ch = chromaSet(getModeNotes('C', 'blues'));
    expect(ch.size).toBe(6);
  });
});
