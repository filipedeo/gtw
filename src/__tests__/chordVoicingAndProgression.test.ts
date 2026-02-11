import { describe, it, expect } from 'vitest';
import { buildProgressionChords } from '../lib/theoryEngine';
import { normalizeNoteName } from '../types/guitar';

/**
 * Tests for:
 * 1. buildProgressionChords() — chord progression theory engine
 * 2. Triad voicing interval math — all chord types, all string sets
 * 3. computeRootFret — key-to-position auto-mapping
 * 4. stopAllNotes — audioEngine export
 */

// --------------------------------------------------------------------------
// Shared constants (mirrored from ChordVoicingExercise.tsx)
// --------------------------------------------------------------------------

const KEYS_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const OPEN_STRING_MIDI: Record<number, number[]> = {
  6: [40, 45, 50, 55, 59, 64],
  7: [35, 40, 45, 50, 55, 59, 64],
};

// Interval semitones from root for each chord quality
const CHORD_INTERVALS: Record<string, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
};

// Voicing data duplicated from component for isolated testing
interface Inversion {
  name: string;
  positions: number[][];
  intervals: string[];
}

interface StringSet {
  label: string;
  inversions: Inversion[];
  sevenStringOnly?: boolean;
}

const TRIAD_VOICINGS: Record<string, { name: string; stringSets: StringSet[] }> = {
  major: {
    name: 'Major Triad',
    stringSets: [
      { label: 'D-G-B', inversions: [
        { name: 'Root Position', positions: [[2, 2], [3, 1], [4, 0]], intervals: ['R', '3', '5'] },
        { name: '1st Inversion', positions: [[2, 2], [3, 0], [4, 1]], intervals: ['3', '5', 'R'] },
        { name: '2nd Inversion', positions: [[2, 0], [3, 0], [4, 0]], intervals: ['5', 'R', '3'] },
      ]},
      { label: 'G-B-E', inversions: [
        { name: 'Root Position', positions: [[3, 2], [4, 2], [5, 0]], intervals: ['R', '3', '5'] },
        { name: '1st Inversion', positions: [[3, 1], [4, 0], [5, 0]], intervals: ['3', '5', 'R'] },
        { name: '2nd Inversion', positions: [[3, 0], [4, 1], [5, 0]], intervals: ['5', 'R', '3'] },
      ]},
      { label: 'A-D-G', inversions: [
        { name: 'Root Position', positions: [[1, 2], [2, 1], [3, -1]], intervals: ['R', '3', '5'] },
        { name: '1st Inversion', positions: [[1, 2], [2, 0], [3, 0]], intervals: ['3', '5', 'R'] },
        { name: '2nd Inversion', positions: [[1, 0], [2, 0], [3, -1]], intervals: ['5', 'R', '3'] },
      ]},
      { label: 'E-A-D', inversions: [
        { name: 'Root Position', positions: [[0, 2], [1, 1], [2, -1]], intervals: ['R', '3', '5'] },
        { name: '1st Inversion', positions: [[0, 2], [1, 0], [2, 0]], intervals: ['3', '5', 'R'] },
        { name: '2nd Inversion', positions: [[0, 0], [1, 0], [2, -1]], intervals: ['5', 'R', '3'] },
      ]},
      { label: 'B-E-A', sevenStringOnly: true, inversions: [
        { name: 'Root Position', positions: [[0, 2], [1, 1], [2, -1]], intervals: ['R', '3', '5'] },
        { name: '1st Inversion', positions: [[0, 2], [1, 0], [2, 0]], intervals: ['3', '5', 'R'] },
        { name: '2nd Inversion', positions: [[0, 0], [1, 0], [2, -1]], intervals: ['5', 'R', '3'] },
      ]},
    ],
  },
  minor: {
    name: 'Minor Triad',
    stringSets: [
      { label: 'D-G-B', inversions: [
        { name: 'Root Position', positions: [[2, 2], [3, 0], [4, 0]], intervals: ['R', 'b3', '5'] },
        { name: '1st Inversion', positions: [[2, 1], [3, 0], [4, 1]], intervals: ['b3', '5', 'R'] },
        { name: '2nd Inversion', positions: [[2, 1], [3, 1], [4, 0]], intervals: ['5', 'R', 'b3'] },
      ]},
      { label: 'G-B-E', inversions: [
        { name: 'Root Position', positions: [[3, 2], [4, 1], [5, 0]], intervals: ['R', 'b3', '5'] },
        { name: '1st Inversion', positions: [[3, 1], [4, 1], [5, 1]], intervals: ['b3', '5', 'R'] },
        { name: '2nd Inversion', positions: [[3, 0], [4, 1], [5, -1]], intervals: ['5', 'R', 'b3'] },
      ]},
      { label: 'A-D-G', inversions: [
        { name: 'Root Position', positions: [[1, 2], [2, 0], [3, -1]], intervals: ['R', 'b3', '5'] },
        { name: '1st Inversion', positions: [[1, 1], [2, 0], [3, 0]], intervals: ['b3', '5', 'R'] },
        { name: '2nd Inversion', positions: [[1, 0], [2, 0], [3, -2]], intervals: ['5', 'R', 'b3'] },
      ]},
      { label: 'E-A-D', inversions: [
        { name: 'Root Position', positions: [[0, 2], [1, 0], [2, -1]], intervals: ['R', 'b3', '5'] },
        { name: '1st Inversion', positions: [[0, 1], [1, 0], [2, 0]], intervals: ['b3', '5', 'R'] },
        { name: '2nd Inversion', positions: [[0, 0], [1, 0], [2, -2]], intervals: ['5', 'R', 'b3'] },
      ]},
      { label: 'B-E-A', sevenStringOnly: true, inversions: [
        { name: 'Root Position', positions: [[0, 2], [1, 0], [2, -1]], intervals: ['R', 'b3', '5'] },
        { name: '1st Inversion', positions: [[0, 1], [1, 0], [2, 0]], intervals: ['b3', '5', 'R'] },
        { name: '2nd Inversion', positions: [[0, 0], [1, 0], [2, -2]], intervals: ['5', 'R', 'b3'] },
      ]},
    ],
  },
  diminished: {
    name: 'Diminished Triad',
    stringSets: [
      { label: 'D-G-B', inversions: [
        { name: 'Root Position', positions: [[2, 2], [3, 0], [4, -1]], intervals: ['R', 'b3', 'b5'] },
        { name: '1st Inversion', positions: [[2, 1], [3, -1], [4, 1]], intervals: ['b3', 'b5', 'R'] },
        { name: '2nd Inversion', positions: [[2, 0], [3, 1], [4, 0]], intervals: ['b5', 'R', 'b3'] },
      ]},
      { label: 'G-B-E', inversions: [
        { name: 'Root Position', positions: [[3, 2], [4, 1], [5, -1]], intervals: ['R', 'b3', 'b5'] },
        { name: '1st Inversion', positions: [[3, 1], [4, 0], [5, 1]], intervals: ['b3', 'b5', 'R'] },
        { name: '2nd Inversion', positions: [[3, 0], [4, 2], [5, 0]], intervals: ['b5', 'R', 'b3'] },
      ]},
      { label: 'A-D-G', inversions: [
        { name: 'Root Position', positions: [[1, 2], [2, 0], [3, -2]], intervals: ['R', 'b3', 'b5'] },
        { name: '1st Inversion', positions: [[1, 1], [2, -1], [3, 0]], intervals: ['b3', 'b5', 'R'] },
        { name: '2nd Inversion', positions: [[1, 0], [2, 1], [3, -1]], intervals: ['b5', 'R', 'b3'] },
      ]},
      { label: 'E-A-D', inversions: [
        { name: 'Root Position', positions: [[0, 2], [1, 0], [2, -2]], intervals: ['R', 'b3', 'b5'] },
        { name: '1st Inversion', positions: [[0, 1], [1, -1], [2, 0]], intervals: ['b3', 'b5', 'R'] },
        { name: '2nd Inversion', positions: [[0, 0], [1, 1], [2, -1]], intervals: ['b5', 'R', 'b3'] },
      ]},
    ],
  },
  augmented: {
    name: 'Augmented Triad',
    stringSets: [
      { label: 'D-G-B', inversions: [
        { name: 'Root Position', positions: [[2, 2], [3, 1], [4, 1]], intervals: ['R', '3', '#5'] },
        { name: '1st Inversion', positions: [[2, 1], [3, 0], [4, 0]], intervals: ['3', '#5', 'R'] },
        { name: '2nd Inversion', positions: [[2, 0], [3, -1], [4, -1]], intervals: ['#5', 'R', '3'] },
      ]},
      { label: 'G-B-E', inversions: [
        { name: 'Root Position', positions: [[3, 2], [4, 2], [5, 1]], intervals: ['R', '3', '#5'] },
        { name: '1st Inversion', positions: [[3, 1], [4, 1], [5, 0]], intervals: ['3', '#5', 'R'] },
        { name: '2nd Inversion', positions: [[3, 0], [4, 0], [5, -1]], intervals: ['#5', 'R', '3'] },
      ]},
      { label: 'A-D-G', inversions: [
        { name: 'Root Position', positions: [[1, 2], [2, 1], [3, 0]], intervals: ['R', '3', '#5'] },
        { name: '1st Inversion', positions: [[1, 1], [2, 0], [3, -1]], intervals: ['3', '#5', 'R'] },
        { name: '2nd Inversion', positions: [[1, 0], [2, -1], [3, -2]], intervals: ['#5', 'R', '3'] },
      ]},
      { label: 'E-A-D', inversions: [
        { name: 'Root Position', positions: [[0, 2], [1, 1], [2, 0]], intervals: ['R', '3', '#5'] },
        { name: '1st Inversion', positions: [[0, 1], [1, 0], [2, -1]], intervals: ['3', '#5', 'R'] },
        { name: '2nd Inversion', positions: [[0, 0], [1, -1], [2, -2]], intervals: ['#5', 'R', '3'] },
      ]},
    ],
  },
};

// Map interval labels to semitones from root
const INTERVAL_SEMITONES: Record<string, number> = {
  'R': 0,
  'b3': 3, '3': 4,
  'b5': 6, '5': 7, '#5': 8,
};

/**
 * For a given voicing (positions + intervals) on a given string set,
 * verify that the actual semitone gaps between notes match the expected
 * chord quality. Uses rootFret=5 as a reference.
 */
function verifyVoicingIntervals(
  inversion: Inversion,
  openStringMidi: number[],
  chordType: string,
  _stringSetLabel: string,
  stringOffset: number = 0,
) {
  const rootFret = 5;
  const expectedIntervals = CHORD_INTERVALS[chordType];

  // Compute actual MIDI values
  const midis = inversion.positions.map(([s, f]) => openStringMidi[s + stringOffset] + rootFret + f);

  // Find the root note (interval label 'R')
  const rootIdx = inversion.intervals.indexOf('R');
  const rootMidi = midis[rootIdx];

  // Collect pitch classes relative to root
  const actualPCs = midis.map(m => ((m - rootMidi) % 12 + 12) % 12).sort((a, b) => a - b);

  // The expected pitch classes are 0 + the chord intervals
  const expectedPCs = [...expectedIntervals].sort((a, b) => a - b);

  expect(actualPCs).toEqual(expectedPCs);

  // Also verify that each labeled interval matches its actual semitones from root
  inversion.intervals.forEach((label, i) => {
    const expectedST = INTERVAL_SEMITONES[label];
    expect(expectedST).toBeDefined();
    const actualST = ((midis[i] - rootMidi) % 12 + 12) % 12;
    expect(actualST).toBe(expectedST);
  });
}

// --------------------------------------------------------------------------
// computeRootFret — mirror of the function in ChordVoicingExercise
// --------------------------------------------------------------------------

function computeRootFret(
  key: string,
  inversion: Inversion,
  openStringMidi: number[],
  stringOffset: number,
): number {
  const rootIdx = inversion.intervals.indexOf('R');
  const [baseString, fretOffset] = inversion.positions[rootIdx];
  const stringIdx = baseString + stringOffset;
  const openMidi = openStringMidi[stringIdx];

  const keyPC = KEYS_SHARP.indexOf(normalizeNoteName(key));
  const openPC = openMidi % 12;
  const semitonesFromOpen = ((keyPC - openPC) % 12 + 12) % 12;

  let rootFret = semitonesFromOpen - fretOffset;

  const minOffset = Math.min(...inversion.positions.map(p => p[1]));
  const minRootFret = Math.max(1, -minOffset);

  while (rootFret < minRootFret) rootFret += 12;
  while (rootFret > 14) rootFret -= 12;

  return rootFret;
}

// ==========================================================================
// 1. Triad voicing interval math
// ==========================================================================

describe('Triad voicing intervals', () => {
  const open6 = OPEN_STRING_MIDI[6];
  const open7 = OPEN_STRING_MIDI[7];

  for (const [chordType, data] of Object.entries(TRIAD_VOICINGS)) {
    describe(`${data.name}`, () => {
      for (const ss of data.stringSets) {
        const offset = ss.sevenStringOnly ? 0 : 0; // 6-string base
        const midi = ss.sevenStringOnly ? open7 : open6;

        describe(`on ${ss.label}`, () => {
          for (const inv of ss.inversions) {
            it(`${inv.name} produces correct ${chordType} intervals`, () => {
              verifyVoicingIntervals(inv, midi, chordType, ss.label, offset);
            });
          }
        });
      }
    });
  }

  describe('7-string offset (+1)', () => {
    // On 7-string, non-sevenStringOnly sets get +1 offset
    for (const [chordType, data] of Object.entries(TRIAD_VOICINGS)) {
      for (const ss of data.stringSets) {
        if (ss.sevenStringOnly) continue;
        for (const inv of ss.inversions) {
          it(`${chordType} ${ss.label} ${inv.name} works with 7-string offset`, () => {
            verifyVoicingIntervals(inv, open7, chordType, ss.label, 1);
          });
        }
      }
    }
  });
});

// ==========================================================================
// 2. computeRootFret — key-to-position mapping
// ==========================================================================

describe('computeRootFret', () => {
  const open6 = OPEN_STRING_MIDI[6];

  it('places root note on correct pitch for C major on D-G-B', () => {
    const inv = TRIAD_VOICINGS.major.stringSets[0].inversions[0]; // D-G-B root pos
    const rf = computeRootFret('C', inv, open6, 0);

    // Root is at [2, 2] = D string fret rf+2
    const rootMidi = open6[2] + rf + 2;
    expect(rootMidi % 12).toBe(0); // C
  });

  it('places root note on correct pitch for A major on A-D-G', () => {
    const inv = TRIAD_VOICINGS.major.stringSets[2].inversions[0]; // A-D-G root pos
    const rf = computeRootFret('A', inv, open6, 0);

    const rootMidi = open6[1] + rf + 2; // Root at [1, 2]
    expect(rootMidi % 12).toBe(9); // A
  });

  it('returns rootFret >= 1 (avoids open position for movable shapes)', () => {
    for (const key of ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Db', 'Eb', 'F#', 'Ab', 'Bb']) {
      for (const [, data] of Object.entries(TRIAD_VOICINGS)) {
        for (const ss of data.stringSets) {
          if (ss.sevenStringOnly) continue;
          for (const inv of ss.inversions) {
            const rf = computeRootFret(key, inv, open6, 0);
            expect(rf).toBeGreaterThanOrEqual(1);
          }
        }
      }
    }
  });

  it('all positions stay within 0-22 fret range', () => {
    for (const key of ['C', 'D', 'E', 'F', 'G', 'A', 'B']) {
      for (const [, data] of Object.entries(TRIAD_VOICINGS)) {
        for (const ss of data.stringSets) {
          if (ss.sevenStringOnly) continue;
          for (const inv of ss.inversions) {
            const rf = computeRootFret(key, inv, open6, 0);
            for (const [, fretOffset] of inv.positions) {
              const fret = rf + fretOffset;
              expect(fret).toBeGreaterThanOrEqual(0);
              expect(fret).toBeLessThanOrEqual(22);
            }
          }
        }
      }
    }
  });

  it('produces the correct root note for every key', () => {
    const inv = TRIAD_VOICINGS.major.stringSets[0].inversions[0]; // D-G-B root pos
    const [rootString, rootOffset] = inv.positions[0]; // R is first

    for (const key of ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']) {
      const rf = computeRootFret(key, inv, open6, 0);
      const rootMidi = open6[rootString] + rf + rootOffset;
      const expectedPC = KEYS_SHARP.indexOf(normalizeNoteName(key));
      expect(rootMidi % 12).toBe(expectedPC);
    }
  });
});

// ==========================================================================
// 3. buildProgressionChords — theory correctness
// ==========================================================================

describe('buildProgressionChords', () => {
  it('builds I-IV-V in C correctly', () => {
    const chords = buildProgressionChords('C', [1, 4, 5]);
    expect(chords).toHaveLength(3);

    expect(chords[0].root).toBe('C');
    expect(chords[0].intervals).toEqual([0, 4, 7]); // major

    expect(chords[1].root).toBe('F');
    expect(chords[1].intervals).toEqual([0, 4, 7]); // major

    expect(chords[2].root).toBe('G');
    expect(chords[2].intervals).toEqual([0, 4, 7]); // major
  });

  it('builds I-V-vi-IV in G correctly', () => {
    const chords = buildProgressionChords('G', [1, 5, 6, 4]);
    expect(chords[0].root).toBe('G');   // I
    expect(chords[1].root).toBe('D');   // V
    expect(chords[2].root).toBe('E');   // vi (minor)
    expect(chords[2].intervals).toEqual([0, 3, 7]);
    expect(chords[3].root).toBe('C');   // IV
  });

  it('handles minor ii chord correctly', () => {
    const chords = buildProgressionChords('C', [2]);
    expect(chords[0].root).toBe('D');
    expect(chords[0].intervals).toEqual([0, 3, 7]); // minor
  });

  it('handles diminished vii chord correctly', () => {
    const chords = buildProgressionChords('C', [7]);
    expect(chords[0].root).toBe('B');
    expect(chords[0].intervals).toEqual([0, 3, 6]); // diminished
  });

  it('handles borrowed bVII chord', () => {
    const chords = buildProgressionChords('C', ['b7']);
    expect(chords[0].root).toBe('A#');  // Bb enharmonic
    expect(chords[0].intervals).toEqual([0, 4, 7]); // major
  });

  it('handles borrowed iv chord (minor IV)', () => {
    const chords = buildProgressionChords('C', ['4m']);
    expect(chords[0].root).toBe('F');
    expect(chords[0].intervals).toEqual([0, 3, 7]); // minor
  });

  it('builds ii-V-I in multiple keys', () => {
    for (const key of ['C', 'G', 'D', 'F', 'Bb']) {
      const chords = buildProgressionChords(key, [2, 5, 1]);
      expect(chords).toHaveLength(3);
      // ii is minor
      expect(chords[0].intervals).toEqual([0, 3, 7]);
      // V is major
      expect(chords[1].intervals).toEqual([0, 4, 7]);
      // I is major
      expect(chords[2].intervals).toEqual([0, 4, 7]);
    }
  });

  it('returns correct roots for all 7 diatonic degrees in C', () => {
    const expectedRoots = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    for (let deg = 1; deg <= 7; deg++) {
      const chords = buildProgressionChords('C', [deg]);
      expect(chords[0].root).toBe(expectedRoots[deg - 1]);
    }
  });

  it('wraps around chromatic scale correctly for sharp keys', () => {
    // In key of A, the V chord root should be E
    const chords = buildProgressionChords('A', [5]);
    expect(chords[0].root).toBe('E');
    expect(chords[0].intervals).toEqual([0, 4, 7]);
  });
});

// ==========================================================================
// 4. stopAllNotes export
// ==========================================================================

describe('stopAllNotes', () => {
  it('is exported from audioEngine', async () => {
    const audioEngine = await import('../lib/audioEngine');
    expect(typeof audioEngine.stopAllNotes).toBe('function');
  });

  it('does not throw when called before audio is initialized', async () => {
    const { stopAllNotes } = await import('../lib/audioEngine');
    expect(() => stopAllNotes()).not.toThrow();
  });
});
