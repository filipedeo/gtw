import { describe, it, expect } from 'vitest';
import { normalizeNoteName, areNotesEqual, NOTE_NAMES } from '../types/guitar';

describe('normalizeNoteName', () => {
  describe('flat to sharp conversions', () => {
    it('should normalize Db to C#', () => {
      expect(normalizeNoteName('Db')).toBe('C#');
    });

    it('should normalize Gb to F#', () => {
      expect(normalizeNoteName('Gb')).toBe('F#');
    });

    it('should normalize Eb to D#', () => {
      expect(normalizeNoteName('Eb')).toBe('D#');
    });

    it('should normalize Ab to G#', () => {
      expect(normalizeNoteName('Ab')).toBe('G#');
    });

    it('should normalize Bb to A#', () => {
      expect(normalizeNoteName('Bb')).toBe('A#');
    });
  });

  describe('special enharmonic cases', () => {
    it('should normalize Fb to E', () => {
      expect(normalizeNoteName('Fb')).toBe('E');
    });

    it('should normalize Cb to B', () => {
      expect(normalizeNoteName('Cb')).toBe('B');
    });

    it('should normalize E# to F', () => {
      expect(normalizeNoteName('E#')).toBe('F');
    });

    it('should normalize B# to C', () => {
      expect(normalizeNoteName('B#')).toBe('C');
    });
  });

  describe('natural notes stay unchanged', () => {
    it('should keep C unchanged', () => {
      expect(normalizeNoteName('C')).toBe('C');
    });

    it('should keep D unchanged', () => {
      expect(normalizeNoteName('D')).toBe('D');
    });

    it('should keep E unchanged', () => {
      expect(normalizeNoteName('E')).toBe('E');
    });

    it('should keep F unchanged', () => {
      expect(normalizeNoteName('F')).toBe('F');
    });

    it('should keep G unchanged', () => {
      expect(normalizeNoteName('G')).toBe('G');
    });

    it('should keep A unchanged', () => {
      expect(normalizeNoteName('A')).toBe('A');
    });

    it('should keep B unchanged', () => {
      expect(normalizeNoteName('B')).toBe('B');
    });
  });

  describe('sharp notes stay unchanged', () => {
    it('should keep C# unchanged', () => {
      expect(normalizeNoteName('C#')).toBe('C#');
    });

    it('should keep F# unchanged', () => {
      expect(normalizeNoteName('F#')).toBe('F#');
    });

    it('should keep G# unchanged', () => {
      expect(normalizeNoteName('G#')).toBe('G#');
    });
  });

  describe('notes with octave numbers', () => {
    it('should normalize Db4 to C#', () => {
      expect(normalizeNoteName('Db4')).toBe('C#');
    });

    it('should normalize Gb2 to F#', () => {
      expect(normalizeNoteName('Gb2')).toBe('F#');
    });

    it('should keep C4 as C', () => {
      expect(normalizeNoteName('C4')).toBe('C');
    });

    it('should keep E2 as E', () => {
      expect(normalizeNoteName('E2')).toBe('E');
    });
  });
});

describe('areNotesEqual', () => {
  describe('enharmonic equivalents should be equal', () => {
    it('should return true for Db and C#', () => {
      expect(areNotesEqual('Db', 'C#')).toBe(true);
    });

    it('should return true for Gb and F#', () => {
      expect(areNotesEqual('Gb', 'F#')).toBe(true);
    });

    it('should return true for Eb and D#', () => {
      expect(areNotesEqual('Eb', 'D#')).toBe(true);
    });

    it('should return true for Ab and G#', () => {
      expect(areNotesEqual('Ab', 'G#')).toBe(true);
    });

    it('should return true for Bb and A#', () => {
      expect(areNotesEqual('Bb', 'A#')).toBe(true);
    });

    it('should return true for Fb and E', () => {
      expect(areNotesEqual('Fb', 'E')).toBe(true);
    });

    it('should return true for Cb and B', () => {
      expect(areNotesEqual('Cb', 'B')).toBe(true);
    });
  });

  describe('different notes should not be equal', () => {
    it('should return false for C and C#', () => {
      expect(areNotesEqual('C', 'C#')).toBe(false);
    });

    it('should return false for D and Db', () => {
      expect(areNotesEqual('D', 'Db')).toBe(false);
    });

    it('should return false for E and F', () => {
      expect(areNotesEqual('E', 'F')).toBe(false);
    });

    it('should return false for G and A', () => {
      expect(areNotesEqual('G', 'A')).toBe(false);
    });

    it('should return false for F# and G', () => {
      expect(areNotesEqual('F#', 'G')).toBe(false);
    });
  });

  describe('same notes should be equal', () => {
    it('should return true for C and C', () => {
      expect(areNotesEqual('C', 'C')).toBe(true);
    });

    it('should return true for F# and F#', () => {
      expect(areNotesEqual('F#', 'F#')).toBe(true);
    });

    it('should return true for Bb and Bb', () => {
      expect(areNotesEqual('Bb', 'Bb')).toBe(true);
    });
  });

  describe('notes with octave numbers', () => {
    it('should return true for Db4 and C#4', () => {
      expect(areNotesEqual('Db4', 'C#4')).toBe(true);
    });

    it('should return true for Db4 and C#2 (octave ignored)', () => {
      expect(areNotesEqual('Db4', 'C#2')).toBe(true);
    });

    it('should return false for C4 and D4', () => {
      expect(areNotesEqual('C4', 'D4')).toBe(false);
    });
  });
});

describe('NOTE_NAMES constant', () => {
  it('should contain all 12 chromatic notes', () => {
    expect(NOTE_NAMES).toHaveLength(12);
  });

  it('should use sharps (not flats) for accidentals', () => {
    expect(NOTE_NAMES).toContain('C#');
    expect(NOTE_NAMES).toContain('D#');
    expect(NOTE_NAMES).toContain('F#');
    expect(NOTE_NAMES).toContain('G#');
    expect(NOTE_NAMES).toContain('A#');
    expect(NOTE_NAMES).not.toContain('Db');
    expect(NOTE_NAMES).not.toContain('Eb');
    expect(NOTE_NAMES).not.toContain('Gb');
    expect(NOTE_NAMES).not.toContain('Ab');
    expect(NOTE_NAMES).not.toContain('Bb');
  });

  it('should be in chromatic order starting from C', () => {
    expect(NOTE_NAMES[0]).toBe('C');
    expect(NOTE_NAMES[1]).toBe('C#');
    expect(NOTE_NAMES[2]).toBe('D');
    expect(NOTE_NAMES[11]).toBe('B');
  });
});
