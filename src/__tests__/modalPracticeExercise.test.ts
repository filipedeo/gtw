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
  it('has 25 entries (7 diatonic + 7 harmonic minor + 7 melodic minor + 3 symmetric + 1 other)', () => {
    expect(MODES).toHaveLength(25);
  });

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

  it('each mode has displayName and characteristicNote', () => {
    for (const mode of MODES) {
      expect(mode.displayName.length).toBeGreaterThan(0);
      expect(mode.characteristicNote.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Mode notes from C
// ---------------------------------------------------------------------------
describe('Mode notes from C', () => {
  it('C ionian = C D E F G A B', () => {
    const notes = getModeNotes('C', 'ionian');
    expect(notes).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  });

  it('C dorian = C D Eb F G A Bb', () => {
    const notes = getModeNotes('C', 'dorian');
    expect(notes).toEqual(['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb']);
  });

  it('C phrygian = C Db Eb F G Ab Bb', () => {
    const notes = getModeNotes('C', 'phrygian');
    expect(notes).toEqual(['C', 'Db', 'Eb', 'F', 'G', 'Ab', 'Bb']);
  });

  it('C lydian = C D E F# G A B', () => {
    const notes = getModeNotes('C', 'lydian');
    expect(notes).toEqual(['C', 'D', 'E', 'F#', 'G', 'A', 'B']);
  });

  it('C mixolydian = C D E F G A Bb', () => {
    const notes = getModeNotes('C', 'mixolydian');
    expect(notes).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'Bb']);
  });

  it('C aeolian = C D Eb F G Ab Bb', () => {
    const notes = getModeNotes('C', 'aeolian');
    expect(notes).toEqual(['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb']);
  });

  it('C locrian = C Db Eb F Gb Ab Bb', () => {
    const notes = getModeNotes('C', 'locrian');
    expect(notes).toEqual(['C', 'Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb']);
  });
});

// ---------------------------------------------------------------------------
// Characteristic notes
// ---------------------------------------------------------------------------
describe('Characteristic notes verified', () => {
  it('Dorian has natural 6 (differs from Aeolian)', () => {
    const dorian = getModeNotes('C', 'dorian');
    const aeolian = getModeNotes('C', 'aeolian');
    // Dorian has A (natural 6), Aeolian has Ab (b6)
    expect(dorian).toContain('A');
    expect(aeolian).toContain('Ab');
    expect(dorian).not.toContain('Ab');
  });

  it('Phrygian has b2 (differs from Aeolian)', () => {
    const phrygian = getModeNotes('C', 'phrygian');
    const aeolian = getModeNotes('C', 'aeolian');
    expect(phrygian).toContain('Db');
    expect(aeolian).toContain('D');
  });

  it('Lydian has #4 (differs from Ionian)', () => {
    const lydian = getModeNotes('C', 'lydian');
    const ionian = getModeNotes('C', 'ionian');
    expect(lydian).toContain('F#');
    expect(ionian).toContain('F');
  });

  it('Mixolydian has b7 (differs from Ionian)', () => {
    const mixo = getModeNotes('C', 'mixolydian');
    const ionian = getModeNotes('C', 'ionian');
    expect(mixo).toContain('Bb');
    expect(ionian).toContain('B');
  });

  it('Locrian has b5 (differs from Phrygian)', () => {
    const locrian = getModeNotes('C', 'locrian');
    const phrygian = getModeNotes('C', 'phrygian');
    expect(locrian).toContain('Gb');
    expect(phrygian).toContain('G');
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
