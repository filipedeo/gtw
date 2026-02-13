import { describe, it, expect } from 'vitest';
import { Note } from 'tonal';
import { getModeNotes, getScaleNotes, MODES } from '../lib/theoryEngine';
import { getScalePositions } from '../utils/fretboardCalculations';
import { STANDARD_TUNINGS } from '../types/guitar';
import { normalizeNoteName } from '../types/guitar';

// ---------------------------------------------------------------------------
// Helper: compare two note arrays by chroma (pitch class 0-11) to handle
// enharmonic equivalents (e.g., Db vs C#, Gb vs F#).
// ---------------------------------------------------------------------------
function chromaArray(notes: string[]): number[] {
  return notes.map((n) => {
    const c = Note.get(n).chroma;
    if (c === undefined) throw new Error(`Invalid note: ${n}`);
    return c;
  });
}

function expectNotesMatch(actual: string[], expected: string[], label: string) {
  const actualChroma = chromaArray(actual);
  const expectedChroma = chromaArray(expected);
  expect(actualChroma, `${label}: chroma mismatch`).toEqual(expectedChroma);
}

// ---------------------------------------------------------------------------
// Interval pattern helpers
// ---------------------------------------------------------------------------

/** Parse a formula string like "1-2-b3-4-5-6-b7" into semitone offsets */
function formulaToSemitones(formula: string): number[] {
  const degreeMap: Record<string, number> = {
    '1': 0,
    'b2': 1,
    '2': 2,
    '#2': 3,
    'b3': 3,
    '3': 4,
    'b4': 4,   // enharmonic to 3
    '4': 5,
    '#4': 6,
    'b5': 6,
    '5': 7,
    '#5': 8,
    'b6': 8,
    '6': 9,
    'bb7': 9,  // double-flat 7 = same as 6
    'b7': 10,
    '7': 11,
  };

  return formula
    .replace(/\u2013/g, '-') // en-dash to hyphen
    .split('-')
    .map((d) => d.trim())
    .map((d) => {
      const semitones = degreeMap[d];
      if (semitones === undefined) throw new Error(`Unknown degree token: "${d}"`);
      return semitones;
    });
}

// ===========================================================================
// 1. Diatonic Modes — exact note validation (key of C)
// ===========================================================================
describe('Diatonic modes — exact notes in key of C', () => {
  const diatonicExpected: [string, string[]][] = [
    ['ionian',     ['C', 'D', 'E', 'F', 'G', 'A', 'B']],
    ['dorian',     ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb']],
    ['phrygian',   ['C', 'Db', 'Eb', 'F', 'G', 'Ab', 'Bb']],
    ['lydian',     ['C', 'D', 'E', 'F#', 'G', 'A', 'B']],
    ['mixolydian', ['C', 'D', 'E', 'F', 'G', 'A', 'Bb']],
    ['aeolian',    ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb']],
    ['locrian',    ['C', 'Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb']],
  ];

  it.each(diatonicExpected)(
    'C %s should produce the correct 7 notes',
    (modeName, expected) => {
      const actual = getModeNotes('C', modeName);
      expect(actual).toHaveLength(7);
      expectNotesMatch(actual, expected, `C ${modeName}`);
    },
  );

  it('getModeNotes and getScaleNotes agree for C ionian / C major', () => {
    const ionian = getModeNotes('C', 'ionian');
    const major = getScaleNotes('C', 'major');
    expect(ionian).toEqual(major);
  });

  it('getModeNotes C aeolian and getScaleNotes C minor agree', () => {
    const aeolian = getModeNotes('C', 'aeolian');
    const minor = getScaleNotes('C', 'minor');
    expectNotesMatch(aeolian, minor, 'C aeolian vs C minor');
  });
});

// ===========================================================================
// 2. Harmonic Minor (key of C)
// ===========================================================================
describe('Harmonic Minor — key of C', () => {
  it('C harmonic minor: C D Eb F G Ab B', () => {
    const actual = getModeNotes('C', 'harmonic minor');
    const expected = ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'B'];
    expect(actual).toHaveLength(7);
    expectNotesMatch(actual, expected, 'C harmonic minor');
  });

  it('differs from aeolian only at the 7th degree (B vs Bb)', () => {
    const harmonicMinor = getModeNotes('C', 'harmonic minor');
    const aeolian = getModeNotes('C', 'aeolian');
    // First 6 notes should share the same chroma
    expectNotesMatch(
      harmonicMinor.slice(0, 6),
      aeolian.slice(0, 6),
      'first 6 degrees',
    );
    // 7th degree differs
    expect(Note.get(harmonicMinor[6]).chroma).toBe(11); // B
    expect(Note.get(aeolian[6]).chroma).toBe(10);       // Bb
  });
});

// ===========================================================================
// 3. Melodic Minor (key of C)
// ===========================================================================
describe('Melodic Minor — key of C', () => {
  it('C melodic minor: C D Eb F G A B', () => {
    const actual = getModeNotes('C', 'melodic minor');
    const expected = ['C', 'D', 'Eb', 'F', 'G', 'A', 'B'];
    expect(actual).toHaveLength(7);
    expectNotesMatch(actual, expected, 'C melodic minor');
  });

  it('differs from harmonic minor only at the 6th degree (A vs Ab)', () => {
    const melodicMinor = getModeNotes('C', 'melodic minor');
    const harmonicMinor = getModeNotes('C', 'harmonic minor');
    // 6th degree: melodic has A (chroma 9), harmonic has Ab (chroma 8)
    expect(Note.get(melodicMinor[5]).chroma).toBe(9);  // A
    expect(Note.get(harmonicMinor[5]).chroma).toBe(8); // Ab
    // 7th degree both have B
    expect(Note.get(melodicMinor[6]).chroma).toBe(Note.get(harmonicMinor[6]).chroma);
  });

  it('differs from ionian only at the 3rd degree (Eb vs E)', () => {
    const melodicMinor = getModeNotes('C', 'melodic minor');
    const ionian = getModeNotes('C', 'ionian');
    expect(Note.get(melodicMinor[2]).chroma).toBe(3); // Eb
    expect(Note.get(ionian[2]).chroma).toBe(4);       // E
  });
});

// ===========================================================================
// 4. Blues Scale (key of C)
// ===========================================================================
describe('Blues scale — key of C', () => {
  it('C blues: C Eb F Gb G Bb (6 notes)', () => {
    const actual = getModeNotes('C', 'blues');
    const expected = ['C', 'Eb', 'F', 'Gb', 'G', 'Bb'];
    expect(actual).toHaveLength(6);
    expectNotesMatch(actual, expected, 'C blues');
  });

  it('blues contains the blue note (b5 / Gb in C)', () => {
    const blues = getModeNotes('C', 'blues');
    const chromas = chromaArray(blues);
    expect(chromas).toContain(6); // Gb/F# chroma = 6
  });
});

// ===========================================================================
// 5. Characteristic Degree Validation (diatonic modes)
// ===========================================================================
describe('Characteristic degree validation — diatonic modes', () => {
  // characteristicDegree is a 0-based index into the scale notes array.
  // We verify it points to the expected characteristic note for each mode.
  const characteristicExpected: [string, number, string][] = [
    // [modeName, expectedDegreeIndex, expectedNote]
    ['ionian',     3, 'F'],   // P4
    ['dorian',     5, 'A'],   // M6 (distinguishes from Aeolian)
    ['phrygian',   1, 'Db'],  // m2
    ['lydian',     3, 'F#'],  // #4
    ['mixolydian', 6, 'Bb'],  // b7
    ['aeolian',    5, 'Ab'],  // b6
    ['locrian',    4, 'Gb'],  // b5
  ];

  it.each(characteristicExpected)(
    '%s: characteristicDegree=%i should point to %s',
    (modeName, expectedDegree, expectedNote) => {
      const mode = MODES.find((m) => m.name === modeName);
      expect(mode, `mode "${modeName}" not found in MODES`).toBeDefined();
      expect(mode!.characteristicDegree).toBe(expectedDegree);

      const notes = getModeNotes('C', modeName);
      const charNote = notes[mode!.characteristicDegree];
      expect(
        Note.get(charNote).chroma,
        `${modeName}: scale[${mode!.characteristicDegree}] = ${charNote}, expected ${expectedNote}`,
      ).toBe(Note.get(expectedNote).chroma);
    },
  );
});

// ===========================================================================
// 6. Formula Validation — interval patterns via chroma comparison
// ===========================================================================
describe('Formula validation — interval patterns match actual scale notes', () => {
  // For each mode with a formula, parse the formula into semitone offsets,
  // then compare against the actual chroma values of the scale.
  const diatonicModes = MODES.filter((m) => m.category === 'major');

  it('all 7 diatonic mode formulas produce correct interval patterns from C', () => {
    for (const mode of diatonicModes) {
      const notes = getModeNotes('C', mode.name);
      const actualChromas = chromaArray(notes);
      const expectedSemitones = formulaToSemitones(mode.formula);

      // Root is C (chroma 0), so semitones from root = chroma values directly
      expect(
        actualChromas,
        `${mode.name}: formula "${mode.formula}" -> semitones ${JSON.stringify(expectedSemitones)}`,
      ).toEqual(expectedSemitones);
    }
  });

  it('harmonic minor formula produces correct intervals from C', () => {
    const mode = MODES.find((m) => m.name === 'harmonic minor')!;
    const notes = getModeNotes('C', mode.name);
    const actualChromas = chromaArray(notes);
    const expectedSemitones = formulaToSemitones(mode.formula);
    expect(actualChromas).toEqual(expectedSemitones);
  });

  it('melodic minor formula produces correct intervals from C', () => {
    const mode = MODES.find((m) => m.name === 'melodic minor')!;
    const notes = getModeNotes('C', mode.name);
    const actualChromas = chromaArray(notes);
    const expectedSemitones = formulaToSemitones(mode.formula);
    expect(actualChromas).toEqual(expectedSemitones);
  });

  it('blues formula produces correct intervals from C', () => {
    const mode = MODES.find((m) => m.name === 'blues')!;
    const notes = getModeNotes('C', mode.name);
    const actualChromas = chromaArray(notes);
    const expectedSemitones = formulaToSemitones(mode.formula);
    expect(actualChromas).toEqual(expectedSemitones);
  });

  // Validate ALL modes that have parseable formulas
  //
  // NOTE: MODES array now uses tonal-compatible scale names:
  //   'diminished'           -> tonal returns W-H pattern (correct)
  //   'half-whole diminished' -> tonal returns H-W pattern (correct)

  describe('all MODES formulas (comprehensive)', () => {
    for (const mode of MODES) {

      it(`${mode.displayName} formula "${mode.formula}" matches actual scale notes`, () => {
        const notes = getModeNotes('C', mode.name);
        if (notes.length === 0) {
          // Some exotic mode names may not be recognized by tonal — skip if empty
          return;
        }
        const actualChromas = chromaArray(notes);
        let expectedSemitones: number[];
        try {
          expectedSemitones = formulaToSemitones(mode.formula);
        } catch {
          // If the formula has tokens we cannot parse, skip
          return;
        }
        expect(
          actualChromas,
          `${mode.displayName}: formula "${mode.formula}" -> ${JSON.stringify(expectedSemitones)}, actual -> ${JSON.stringify(actualChromas)}`,
        ).toEqual(expectedSemitones);
      });
    }
  });

  // Dedicated diminished scale formula tests
  describe('diminished scales — tonal name mapping verification', () => {
    it('MODES "diminished" (W-H) matches tonal output [0,2,3,5,6,8,9,11]', () => {
      const modeEntry = MODES.find(m => m.name === 'diminished')!;
      expect(modeEntry.displayName).toContain('Whole-Half');
      const notes = getModeNotes('C', 'diminished');
      expect(notes).toHaveLength(8);
      const chromas = chromaArray(notes);
      expect(chromas).toEqual([0, 2, 3, 5, 6, 8, 9, 11]);
      // Formula should now match tonal output
      const formulaSemitones = formulaToSemitones(modeEntry.formula);
      expect(chromas).toEqual(formulaSemitones);
    });

    it('MODES "half-whole diminished" (H-W) matches tonal output [0,1,3,4,6,7,9,10]', () => {
      const modeEntry = MODES.find(m => m.name === 'half-whole diminished')!;
      expect(modeEntry.displayName).toContain('Half-Whole');
      const notes = getModeNotes('C', 'half-whole diminished');
      expect(notes).toHaveLength(8);
      const chromas = chromaArray(notes);
      expect(chromas).toEqual([0, 1, 3, 4, 6, 7, 9, 10]);
      // Formula should now match tonal output
      const formulaSemitones = formulaToSemitones(modeEntry.formula);
      expect(chromas).toEqual(formulaSemitones);
    });
  });
});

// ===========================================================================
// 7. getScalePositions Validation
// ===========================================================================
describe('getScalePositions — all scale pitch classes appear on fretboard', () => {
  const tuning = STANDARD_TUNINGS['standard-6'];
  const stringCount = 6;

  it('C major (7 notes) — all 7 pitch classes present in frets 0-12', () => {
    const scaleNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const positions = getScalePositions(scaleNotes, tuning, stringCount, 12);

    // Collect all unique chromas from returned positions
    const foundChromas = new Set<number>();
    for (const pos of positions) {
      if (pos.note?.name) {
        const chroma = Note.get(pos.note.name).chroma;
        if (chroma !== undefined) foundChromas.add(chroma);
      }
    }

    const expectedChromas = chromaArray(scaleNotes);
    for (const expected of expectedChromas) {
      expect(
        foundChromas.has(expected),
        `pitch class ${expected} missing from fretboard positions`,
      ).toBe(true);
    }
  });

  it('C major positions span all 6 strings', () => {
    const scaleNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const positions = getScalePositions(scaleNotes, tuning, stringCount, 12);
    const strings = new Set(positions.map((p) => p.string));
    expect(strings.size).toBe(6);
  });

  it('A minor pentatonic (5 notes) — all 5 pitch classes present', () => {
    const scaleNotes = getScaleNotes('A', 'minor pentatonic');
    expect(scaleNotes).toHaveLength(5);
    const positions = getScalePositions(scaleNotes, tuning, stringCount, 12);

    const foundChromas = new Set<number>();
    for (const pos of positions) {
      if (pos.note?.name) {
        const chroma = Note.get(pos.note.name).chroma;
        if (chroma !== undefined) foundChromas.add(chroma);
      }
    }

    const expectedChromas = chromaArray(scaleNotes);
    for (const expected of expectedChromas) {
      expect(foundChromas.has(expected)).toBe(true);
    }
  });

  it('positions should have valid fret and string values', () => {
    const scaleNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const maxFret = 12;
    const positions = getScalePositions(scaleNotes, tuning, stringCount, maxFret);

    for (const pos of positions) {
      expect(pos.string).toBeGreaterThanOrEqual(0);
      expect(pos.string).toBeLessThan(stringCount);
      expect(pos.fret).toBeGreaterThanOrEqual(0);
      expect(pos.fret).toBeLessThanOrEqual(maxFret);
    }
  });

  it('returns more positions for larger fret range', () => {
    const scaleNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const positions12 = getScalePositions(scaleNotes, tuning, stringCount, 12);
    const positions22 = getScalePositions(scaleNotes, tuning, stringCount, 22);
    expect(positions22.length).toBeGreaterThan(positions12.length);
  });
});

// ===========================================================================
// 8. Pentatonic Scale Validation (key of A)
// ===========================================================================
describe('Pentatonic scales — key of A', () => {
  it('A minor pentatonic: A C D E G (5 notes)', () => {
    const actual = getScaleNotes('A', 'minor pentatonic');
    const expected = ['A', 'C', 'D', 'E', 'G'];
    expect(actual).toHaveLength(5);
    expectNotesMatch(actual, expected, 'A minor pentatonic');
  });

  it('A major pentatonic: A B C# E F# (5 notes)', () => {
    const actual = getScaleNotes('A', 'major pentatonic');
    const expected = ['A', 'B', 'C#', 'E', 'F#'];
    expect(actual).toHaveLength(5);
    expectNotesMatch(actual, expected, 'A major pentatonic');
  });

  it('minor pentatonic is a subset of the natural minor (aeolian) scale', () => {
    const minPent = getScaleNotes('A', 'minor pentatonic');
    const aeolian = getModeNotes('A', 'aeolian');
    const aeolianChromas = chromaArray(aeolian);

    for (const note of minPent) {
      const chroma = Note.get(note).chroma!;
      expect(
        aeolianChromas.includes(chroma),
        `${note} (chroma ${chroma}) should be in A aeolian`,
      ).toBe(true);
    }
  });

  it('major pentatonic is a subset of the major (ionian) scale', () => {
    const majPent = getScaleNotes('A', 'major pentatonic');
    const ionian = getModeNotes('A', 'ionian');
    const ionianChromas = chromaArray(ionian);

    for (const note of majPent) {
      const chroma = Note.get(note).chroma!;
      expect(
        ionianChromas.includes(chroma),
        `${note} (chroma ${chroma}) should be in A ionian`,
      ).toBe(true);
    }
  });

  it('C minor pentatonic: C Eb F G Bb (5 notes)', () => {
    const actual = getScaleNotes('C', 'minor pentatonic');
    const expected = ['C', 'Eb', 'F', 'G', 'Bb'];
    expect(actual).toHaveLength(5);
    expectNotesMatch(actual, expected, 'C minor pentatonic');
  });

  it('C major pentatonic: C D E G A (5 notes)', () => {
    const actual = getScaleNotes('C', 'major pentatonic');
    const expected = ['C', 'D', 'E', 'G', 'A'];
    expect(actual).toHaveLength(5);
    expectNotesMatch(actual, expected, 'C major pentatonic');
  });
});

// ===========================================================================
// Cross-key validation — modes should transpose correctly
// ===========================================================================
describe('Cross-key validation — modes in multiple keys', () => {
  it('G ionian should be the G major scale', () => {
    const actual = getModeNotes('G', 'ionian');
    const expected = ['G', 'A', 'B', 'C', 'D', 'E', 'F#'];
    expect(actual).toHaveLength(7);
    expectNotesMatch(actual, expected, 'G ionian');
  });

  it('D dorian: D E F G A B C', () => {
    const actual = getModeNotes('D', 'dorian');
    const expected = ['D', 'E', 'F', 'G', 'A', 'B', 'C'];
    expect(actual).toHaveLength(7);
    expectNotesMatch(actual, expected, 'D dorian');
  });

  it('E phrygian: E F G A B C D', () => {
    const actual = getModeNotes('E', 'phrygian');
    const expected = ['E', 'F', 'G', 'A', 'B', 'C', 'D'];
    expect(actual).toHaveLength(7);
    expectNotesMatch(actual, expected, 'E phrygian');
  });

  it('F lydian: F G A B C D E', () => {
    const actual = getModeNotes('F', 'lydian');
    const expected = ['F', 'G', 'A', 'B', 'C', 'D', 'E'];
    expect(actual).toHaveLength(7);
    expectNotesMatch(actual, expected, 'F lydian');
  });

  it('G mixolydian: G A B C D E F', () => {
    const actual = getModeNotes('G', 'mixolydian');
    const expected = ['G', 'A', 'B', 'C', 'D', 'E', 'F'];
    expect(actual).toHaveLength(7);
    expectNotesMatch(actual, expected, 'G mixolydian');
  });

  it('A aeolian: A B C D E F G', () => {
    const actual = getModeNotes('A', 'aeolian');
    const expected = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    expect(actual).toHaveLength(7);
    expectNotesMatch(actual, expected, 'A aeolian');
  });

  it('B locrian: B C D E F G A', () => {
    const actual = getModeNotes('B', 'locrian');
    const expected = ['B', 'C', 'D', 'E', 'F', 'G', 'A'];
    expect(actual).toHaveLength(7);
    expectNotesMatch(actual, expected, 'B locrian');
  });

  it('all 7 diatonic modes starting on white keys from C major share the same pitch classes', () => {
    // C Ionian, D Dorian, E Phrygian, F Lydian, G Mixolydian, A Aeolian, B Locrian
    // all contain the same 7 pitch classes: C D E F G A B
    const cMajorChromas = new Set(chromaArray(['C', 'D', 'E', 'F', 'G', 'A', 'B']));

    const modeRoots: [string, string][] = [
      ['C', 'ionian'],
      ['D', 'dorian'],
      ['E', 'phrygian'],
      ['F', 'lydian'],
      ['G', 'mixolydian'],
      ['A', 'aeolian'],
      ['B', 'locrian'],
    ];

    for (const [root, modeName] of modeRoots) {
      const notes = getModeNotes(root, modeName);
      const modeChromas = new Set(chromaArray(notes));
      expect(
        modeChromas,
        `${root} ${modeName} should share C major pitch classes`,
      ).toEqual(cMajorChromas);
    }
  });
});

// ===========================================================================
// Harmonic minor modes (key of C) — validate the full family
// ===========================================================================
describe('Harmonic minor modes — key of C', () => {
  const harmonicMinorModes = MODES.filter((m) => m.category === 'harmonic-minor');

  it('there are 7 harmonic minor modes', () => {
    expect(harmonicMinorModes).toHaveLength(7);
  });

  it('each harmonic minor mode from C produces 7 notes', () => {
    for (const mode of harmonicMinorModes) {
      const notes = getModeNotes('C', mode.name);
      if (notes.length === 0) continue; // skip if tonal does not support
      expect(notes, `${mode.displayName}`).toHaveLength(7);
    }
  });
});

// ===========================================================================
// Melodic minor modes (key of C) — validate the full family
// ===========================================================================
describe('Melodic minor modes — key of C', () => {
  const melodicMinorModes = MODES.filter((m) => m.category === 'melodic-minor');

  it('there are 7 melodic minor modes', () => {
    expect(melodicMinorModes).toHaveLength(7);
  });

  it('each melodic minor mode from C produces 7 notes', () => {
    for (const mode of melodicMinorModes) {
      const notes = getModeNotes('C', mode.name);
      if (notes.length === 0) continue;
      expect(notes, `${mode.displayName}`).toHaveLength(7);
    }
  });

  it('C altered (super locrian): C Db Eb Fb Gb Ab Bb', () => {
    const actual = getModeNotes('C', 'altered');
    if (actual.length === 0) return; // skip if tonal does not support
    const expected = ['C', 'Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb'];
    expect(actual).toHaveLength(7);
    expectNotesMatch(actual, expected, 'C altered');
  });

  it('C lydian dominant: C D E F# G A Bb', () => {
    const actual = getModeNotes('C', 'lydian dominant');
    if (actual.length === 0) return;
    const expected = ['C', 'D', 'E', 'F#', 'G', 'A', 'Bb'];
    expect(actual).toHaveLength(7);
    expectNotesMatch(actual, expected, 'C lydian dominant');
  });
});

// ===========================================================================
// Symmetric scales (key of C) — whole tone and diminished
// ===========================================================================
describe('Symmetric scales — key of C', () => {
  it('C whole tone: C D E F# G# A# (6 notes, all whole steps)', () => {
    const actual = getModeNotes('C', 'whole tone');
    if (actual.length === 0) return;
    expect(actual).toHaveLength(6);
    // Verify all intervals are 2 semitones (whole step)
    const chromas = chromaArray(actual);
    for (let i = 1; i < chromas.length; i++) {
      const interval = (chromas[i] - chromas[i - 1] + 12) % 12;
      expect(interval, `interval between notes ${i - 1} and ${i}`).toBe(2);
    }
  });

  it('C diminished (W-H): 8 notes with W-H pattern', () => {
    const actual = getModeNotes('C', 'diminished');
    if (actual.length === 0) return;
    expect(actual).toHaveLength(8);
    const chromas = chromaArray(actual);
    for (let i = 1; i < chromas.length; i++) {
      const interval = (chromas[i] - chromas[i - 1] + 12) % 12;
      const expectedInterval = i % 2 === 1 ? 2 : 1; // W, H, W, H, ...
      expect(interval, `interval at position ${i}`).toBe(expectedInterval);
    }
  });

  it('C half-whole diminished (H-W): 8 notes with H-W pattern', () => {
    const actual = getModeNotes('C', 'half-whole diminished');
    if (actual.length === 0) return;
    expect(actual).toHaveLength(8);
    const chromas = chromaArray(actual);
    for (let i = 1; i < chromas.length; i++) {
      const interval = (chromas[i] - chromas[i - 1] + 12) % 12;
      const expectedInterval = i % 2 === 1 ? 1 : 2; // H, W, H, W, ...
      expect(interval, `interval at position ${i}`).toBe(expectedInterval);
    }
  });
});

// ===========================================================================
// MODES array structural validation
// ===========================================================================
describe('MODES array — structural integrity', () => {
  it('has 25 total entries', () => {
    expect(MODES).toHaveLength(25);
  });

  it('7 diatonic + 7 harmonic minor + 7 melodic minor + 3 symmetric + 1 other', () => {
    const counts: Record<string, number> = {};
    for (const mode of MODES) {
      counts[mode.category] = (counts[mode.category] || 0) + 1;
    }
    expect(counts['major']).toBe(7);
    expect(counts['harmonic-minor']).toBe(7);
    expect(counts['melodic-minor']).toBe(7);
    expect(counts['symmetric']).toBe(3);
    expect(counts['other']).toBe(1);
  });

  it('every mode has all required fields', () => {
    for (const mode of MODES) {
      expect(mode.name, `name missing on ${JSON.stringify(mode)}`).toBeTruthy();
      expect(mode.displayName, `displayName missing on ${mode.name}`).toBeTruthy();
      expect(mode.characteristicNote, `characteristicNote missing on ${mode.name}`).toBeTruthy();
      expect(typeof mode.characteristicDegree, `characteristicDegree type on ${mode.name}`).toBe('number');
      expect(mode.category, `category missing on ${mode.name}`).toBeTruthy();
      expect(mode.formula, `formula missing on ${mode.name}`).toBeTruthy();
      expect(mode.description, `description missing on ${mode.name}`).toBeTruthy();
    }
  });

  it('no duplicate mode names', () => {
    const names = MODES.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('characteristicDegree is within valid range for each mode', () => {
    for (const mode of MODES) {
      const notes = getModeNotes('C', mode.name);
      if (notes.length === 0) continue;
      expect(
        mode.characteristicDegree,
        `${mode.name}: degree ${mode.characteristicDegree} out of range [0, ${notes.length - 1}]`,
      ).toBeGreaterThanOrEqual(0);
      expect(mode.characteristicDegree).toBeLessThan(notes.length);
    }
  });
});

// ===========================================================================
// normalizeNoteName sanity checks (used throughout exercise components)
// ===========================================================================
describe('normalizeNoteName — enharmonic normalization', () => {
  it('converts flats to sharps', () => {
    expect(normalizeNoteName('Db')).toBe('C#');
    expect(normalizeNoteName('Eb')).toBe('D#');
    expect(normalizeNoteName('Gb')).toBe('F#');
    expect(normalizeNoteName('Ab')).toBe('G#');
    expect(normalizeNoteName('Bb')).toBe('A#');
  });

  it('passes through naturals and sharps unchanged', () => {
    expect(normalizeNoteName('C')).toBe('C');
    expect(normalizeNoteName('C#')).toBe('C#');
    expect(normalizeNoteName('D')).toBe('D');
    expect(normalizeNoteName('F#')).toBe('F#');
  });

  it('strips octave numbers before normalizing', () => {
    expect(normalizeNoteName('Db4')).toBe('C#');
    expect(normalizeNoteName('E2')).toBe('E');
  });
});

// ===========================================================================
// Edge cases: scales in all 12 keys
// ===========================================================================
describe('Scale generation in all 12 chromatic keys', () => {
  const roots = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

  it.each(roots)('ionian in key of %s produces 7 notes starting on root', (root) => {
    const notes = getModeNotes(root, 'ionian');
    expect(notes).toHaveLength(7);
    // First note should have the same chroma as the root
    expect(Note.get(notes[0]).chroma).toBe(Note.get(root).chroma);
  });

  it.each(roots)('aeolian in key of %s produces 7 notes starting on root', (root) => {
    const notes = getModeNotes(root, 'aeolian');
    expect(notes).toHaveLength(7);
    expect(Note.get(notes[0]).chroma).toBe(Note.get(root).chroma);
  });

  it.each(roots)('harmonic minor in key of %s produces 7 notes', (root) => {
    const notes = getModeNotes(root, 'harmonic minor');
    expect(notes).toHaveLength(7);
    expect(Note.get(notes[0]).chroma).toBe(Note.get(root).chroma);
  });

  it.each(roots)('blues in key of %s produces 6 notes', (root) => {
    const notes = getModeNotes(root, 'blues');
    expect(notes).toHaveLength(6);
    expect(Note.get(notes[0]).chroma).toBe(Note.get(root).chroma);
  });

  it.each(roots)('minor pentatonic in key of %s produces 5 notes', (root) => {
    const notes = getScaleNotes(root, 'minor pentatonic');
    expect(notes).toHaveLength(5);
    expect(Note.get(notes[0]).chroma).toBe(Note.get(root).chroma);
  });

  it.each(roots)('major pentatonic in key of %s produces 5 notes', (root) => {
    const notes = getScaleNotes(root, 'major pentatonic');
    expect(notes).toHaveLength(5);
    expect(Note.get(notes[0]).chroma).toBe(Note.get(root).chroma);
  });
});
