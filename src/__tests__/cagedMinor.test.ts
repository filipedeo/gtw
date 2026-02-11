import { describe, it, expect } from 'vitest';
import { getNoteAtPosition } from '../utils/fretboardCalculations';
import { STANDARD_TUNINGS, normalizeNoteName } from '../types/guitar';

/**
 * Tests for CAGED minor chord positions and minor scale patterns.
 *
 * Mirrors the pattern from exerciseFixes.test.ts for major shapes, applied to
 * the new minor data added to CAGEDExercise.tsx.
 */

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Reproduce the minor data from CAGEDExercise.tsx
const CAGED_MINOR_SHAPES: Record<string, {
  name: string;
  rootString: number;
  baseKey: string;
  minorChordPositions: { string: number; fretOffset: number }[];
  minorScalePattern: number[][];
}> = {
  'C': {
    name: 'C Shape Minor',
    rootString: 1,
    baseKey: 'C',
    minorChordPositions: [
      { string: 1, fretOffset: 0 },
      { string: 2, fretOffset: -2 },
      { string: 3, fretOffset: -3 },
      { string: 4, fretOffset: -2 },
      { string: 5, fretOffset: -4 },
    ],
    minorScalePattern: [
      [0, -2], [0, 0], [1, -2], [1, 0], [1, 2],
      [2, -3], [2, -2], [2, 0], [3, -3], [3, -2], [3, 0],
      [4, -2], [4, 0], [4, 1], [5, -2], [5, 0], [5, 1]
    ]
  },
  'A': {
    name: 'A Shape Minor',
    rootString: 1,
    baseKey: 'A',
    minorChordPositions: [
      { string: 1, fretOffset: 0 },
      { string: 2, fretOffset: 2 },
      { string: 3, fretOffset: 2 },
      { string: 4, fretOffset: 1 },
      { string: 5, fretOffset: 0 },
    ],
    minorScalePattern: [
      [0, 0], [0, 1], [0, 3], [1, 0], [1, 2], [1, 3],
      [2, 0], [2, 2], [2, 3], [3, 0], [3, 2], [3, 4],
      [4, 0], [4, 1], [4, 3], [5, 0], [5, 1], [5, 3]
    ]
  },
  'G': {
    name: 'G Shape Minor',
    rootString: 0,
    baseKey: 'G',
    minorChordPositions: [
      { string: 0, fretOffset: 0 },
      { string: 1, fretOffset: -2 },
      { string: 2, fretOffset: -3 },
      { string: 3, fretOffset: -3 },
      { string: 4, fretOffset: -4 },
      { string: 5, fretOffset: 0 },
    ],
    minorScalePattern: [
      [0, -2], [0, 0], [0, 2], [1, -3], [1, -2], [1, 0],
      [2, -3], [2, -2], [2, 0], [3, -3], [3, -1], [3, 0],
      [4, -2], [4, 0], [4, 1], [5, -2], [5, 0], [5, 2]
    ]
  },
  'E': {
    name: 'E Shape Minor',
    rootString: 0,
    baseKey: 'E',
    minorChordPositions: [
      { string: 0, fretOffset: 0 },
      { string: 1, fretOffset: 2 },
      { string: 2, fretOffset: 2 },
      { string: 3, fretOffset: 0 },
      { string: 4, fretOffset: 0 },
      { string: 5, fretOffset: 0 },
    ],
    minorScalePattern: [
      [0, 0], [0, 2], [0, 3], [1, 0], [1, 2], [1, 3],
      [2, 0], [2, 2], [2, 4], [3, 0], [3, 2], [3, 4],
      [4, 0], [4, 1], [4, 3], [5, 0], [5, 2], [5, 3]
    ]
  },
  'D': {
    name: 'D Shape Minor',
    rootString: 2,
    baseKey: 'D',
    minorChordPositions: [
      { string: 2, fretOffset: 0 },
      { string: 3, fretOffset: 2 },
      { string: 4, fretOffset: 3 },
      { string: 5, fretOffset: 1 },
    ],
    minorScalePattern: [
      [1, 0], [1, 1], [1, 3], [2, 0], [2, 2], [2, 3],
      [3, 0], [3, 2], [3, 3], [4, 1], [4, 3], [4, 5],
      [5, 0], [5, 1], [5, 3]
    ]
  }
};

function getNaturalMinorNotes(key: string): Set<string> {
  const normalized = normalizeNoteName(key);
  const rootIdx = NOTE_NAMES_SHARP.indexOf(normalized);
  // Natural minor intervals: 0, 2, 3, 5, 7, 8, 10
  const intervals = [0, 2, 3, 5, 7, 8, 10];
  return new Set(intervals.map(i => NOTE_NAMES_SHARP[(rootIdx + i) % 12]));
}

function getRootFret(shapeName: string, key: string): number {
  const shape = CAGED_MINOR_SHAPES[shapeName];
  const keyIndex = KEYS.indexOf(key);
  const baseKeyIndex = KEYS.indexOf(shape.baseKey);
  const semitones = (keyIndex - baseKeyIndex + 12) % 12;

  let baseFret = 0;
  if (shapeName === 'C') baseFret = 3;
  if (shapeName === 'G') baseFret = 3;

  return baseFret + semitones;
}

function resolveChordNotes(shapeName: string, key: string): number[] {
  const shape = CAGED_MINOR_SHAPES[shapeName];
  const rootFret = getRootFret(shapeName, key);

  const midis: number[] = [];
  const OPEN_MIDI = [40, 45, 50, 55, 59, 64]; // E2, A2, D3, G3, B3, E4

  for (const pos of shape.minorChordPositions) {
    const fret = rootFret + pos.fretOffset;
    if (fret >= 0 && fret <= 22) {
      midis.push(OPEN_MIDI[pos.string] + fret);
    }
  }
  return midis;
}

function resolveScaleNoteNames(shapeName: string, key: string): string[] {
  const shape = CAGED_MINOR_SHAPES[shapeName];
  const rootFret = getRootFret(shapeName, key);
  const tuning = STANDARD_TUNINGS['standard-6'];
  const stringCount = 6;

  const notes: string[] = [];
  for (const [stringIdx, fretOffset] of shape.minorScalePattern) {
    const fret = rootFret + fretOffset;
    if (fret >= 0 && fret <= 22) {
      const fullNote = getNoteAtPosition({ string: stringIdx, fret }, tuning, stringCount);
      if (fullNote) {
        notes.push(normalizeNoteName(fullNote));
      }
    }
  }
  return notes;
}

// ---------------------------------------------------------------------------
// Minor chord position tests
// ---------------------------------------------------------------------------
describe('CAGED minor chord positions', () => {
  for (const [shapeName, shape] of Object.entries(CAGED_MINOR_SHAPES)) {
    describe(`${shape.name} in key of ${shape.baseKey}`, () => {
      it('produces root + b3 + 5 intervals (0, 3, 7 semitones)', () => {
        const midis = resolveChordNotes(shapeName, shape.baseKey);
        expect(midis.length).toBeGreaterThanOrEqual(3);

        // Get the root pitch class
        const rootChroma = midis[0] % 12;

        // All notes should be root (0), minor 3rd (3), or perfect 5th (7)
        const validIntervals = [0, 3, 7];
        for (const midi of midis) {
          const interval = ((midi % 12) - rootChroma + 12) % 12;
          expect(validIntervals).toContain(interval);
        }
      });

      it('chord contains the root note', () => {
        const midis = resolveChordNotes(shapeName, shape.baseKey);
        const rootKey = normalizeNoteName(shape.baseKey);
        const rootChroma = NOTE_NAMES_SHARP.indexOf(rootKey);

        const hasRoot = midis.some(m => m % 12 === rootChroma);
        expect(hasRoot).toBe(true);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Minor scale pattern tests
// ---------------------------------------------------------------------------
describe('CAGED minor scale patterns', () => {
  for (const [shapeName, shape] of Object.entries(CAGED_MINOR_SHAPES)) {
    describe(`${shape.name} in key of ${shape.baseKey}`, () => {
      it('all scale notes belong to the natural minor scale', () => {
        const scaleNotes = getNaturalMinorNotes(shape.baseKey);
        const patternNotes = resolveScaleNoteNames(shapeName, shape.baseKey);

        expect(patternNotes.length).toBeGreaterThan(0);

        for (const note of patternNotes) {
          expect(scaleNotes.has(note)).toBe(true);
        }
      });

      it('pattern note count >= 14', () => {
        const patternNotes = resolveScaleNoteNames(shapeName, shape.baseKey);
        expect(patternNotes.length).toBeGreaterThanOrEqual(14);
      });

      it('pattern contains the root note', () => {
        const patternNotes = resolveScaleNoteNames(shapeName, shape.baseKey);
        const normalizedRoot = normalizeNoteName(shape.baseKey);
        expect(patternNotes).toContain(normalizedRoot);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Transposition
// ---------------------------------------------------------------------------
describe('Minor scale transposition', () => {
  it('E minor shape in G produces G natural minor notes', () => {
    const scaleNotes = getNaturalMinorNotes('G');
    const patternNotes = resolveScaleNoteNames('E', 'G');

    expect(patternNotes.length).toBeGreaterThan(0);
    for (const note of patternNotes) {
      expect(scaleNotes.has(note)).toBe(true);
    }
  });

  it('A minor shape in C produces C natural minor notes', () => {
    const scaleNotes = getNaturalMinorNotes('C');
    const patternNotes = resolveScaleNoteNames('A', 'C');

    expect(patternNotes.length).toBeGreaterThan(0);
    for (const note of patternNotes) {
      expect(scaleNotes.has(note)).toBe(true);
    }
  });

  it('C minor shape in D produces D natural minor notes', () => {
    const scaleNotes = getNaturalMinorNotes('D');
    const patternNotes = resolveScaleNoteNames('C', 'D');

    expect(patternNotes.length).toBeGreaterThan(0);
    for (const note of patternNotes) {
      expect(scaleNotes.has(note)).toBe(true);
    }
  });
});
