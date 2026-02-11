import { describe, it, expect } from 'vitest';
import { getNoteAtPosition, getPositionsForNote, getIntervalBetweenPositions, getRandomPosition } from '../utils/fretboardCalculations';
import { STANDARD_TUNINGS, Tuning } from '../types/guitar';
import { Note } from 'tonal';

/**
 * Helper function to calculate the expected note from a tuning's open string + semitones.
 * This makes tests tuning-relative rather than hard-coded.
 * 
 * String indexing convention (follows standard guitar diagram orientation):
 * - string 0 = tuning.notes[0] = lowest pitch string (low E in standard tuning)
 * - string 5 = tuning.notes[5] = highest pitch string (high E in standard 6-string)
 * 
 * @param tuning - The tuning configuration
 * @param string - String index (0 = lowest pitch string, directly maps to tuning.notes)
 * @param semitones - Number of semitones above the open string (fret number)
 * @returns The expected note name with octave (e.g., 'E4')
 */
function calculateExpectedNote(tuning: Tuning, string: number, semitones: number): string {
  const openStringNote = tuning.notes[string];
  if (!openStringNote) return '';
  
  const noteInfo = Note.get(openStringNote);
  if (!noteInfo.midi) return '';
  
  return Note.fromMidi(noteInfo.midi + semitones);
}

/**
 * Helper to get just the note name without octave
 */
function getNoteName(noteWithOctave: string): string {
  return noteWithOctave.replace(/\d+$/, '');
}

/**
 * Helper to get the octave from a note
 */
function getOctave(noteWithOctave: string): number {
  const match = noteWithOctave.match(/\d+$/);
  return match ? parseInt(match[0]) : 0;
}

describe('getNoteAtPosition', () => {
  describe('String indexing convention verification', () => {
    const tuning = STANDARD_TUNINGS['standard-6'];
    const stringCount = 6;

    it('string 0 should map to tuning.notes[0] (lowest pitch - low E)', () => {
      const note = getNoteAtPosition({ string: 0, fret: 0 }, tuning, stringCount);
      expect(note).toBe(tuning.notes[0]);
      expect(note).toBe('E2');
    });

    it('string 5 should map to tuning.notes[5] (highest pitch - high E)', () => {
      const note = getNoteAtPosition({ string: 5, fret: 0 }, tuning, stringCount);
      expect(note).toBe(tuning.notes[5]);
      expect(note).toBe('E4');
    });

    it('string index should directly map to tuning array index', () => {
      // Verify the mapping: string i -> tuning.notes[i]
      for (let string = 0; string < stringCount; string++) {
        const note = getNoteAtPosition({ string, fret: 0 }, tuning, stringCount);
        expect(note).toBe(tuning.notes[string]);
      }
    });
  });

  describe('6-string standard tuning - all strings comprehensive', () => {
    const tuning = STANDARD_TUNINGS['standard-6'];
    const stringCount = 6;

    // String mapping for standard tuning (visual diagram orientation):
    // string 0 (low E)  -> tuning[0] -> E2
    // string 1 (A)      -> tuning[1] -> A2
    // string 2 (D)      -> tuning[2] -> D3
    // string 3 (G)      -> tuning[3] -> G3
    // string 4 (B)      -> tuning[4] -> B3
    // string 5 (high E) -> tuning[5] -> E4

    describe('open strings (fret 0) - tuning relative', () => {
      it.each([
        [0, 'E2'], // low E
        [1, 'A2'], // A
        [2, 'D3'], // D
        [3, 'G3'], // G
        [4, 'B3'], // B
        [5, 'E4'], // high E
      ])('string %i at fret 0 should return %s', (string, expected) => {
        const note = getNoteAtPosition({ string, fret: 0 }, tuning, stringCount);
        expect(note).toBe(expected);
        // Also verify it matches our tuning-relative calculation
        expect(note).toBe(calculateExpectedNote(tuning, string, 0));
      });
    });

    describe('fret 1 on each string', () => {
      it.each([
        [0, 1, 'F2'],  // E2 + 1 semitone = F2
        [1, 1, 'Bb2'], // A2 + 1 semitone = Bb2 (tonal uses flats)
        [2, 1, 'Eb3'], // D3 + 1 semitone = Eb3
        [3, 1, 'Ab3'], // G3 + 1 semitone = Ab3
        [4, 1, 'C4'],  // B3 + 1 semitone = C4
        [5, 1, 'F4'],  // E4 + 1 semitone = F4
      ])('string %i at fret %i should return %s', (string, fret, expected) => {
        const note = getNoteAtPosition({ string, fret }, tuning, stringCount);
        expect(note).toBe(expected);
        expect(note).toBe(calculateExpectedNote(tuning, string, fret));
      });
    });

    describe('fret 3 on each string', () => {
      it.each([
        [0, 3, 'G2'],  // E2 + 3 semitones = G2
        [1, 3, 'C3'],  // A2 + 3 semitones = C3
        [2, 3, 'F3'],  // D3 + 3 semitones = F3
        [3, 3, 'Bb3'], // G3 + 3 semitones = Bb3
        [4, 3, 'D4'],  // B3 + 3 semitones = D4
        [5, 3, 'G4'],  // E4 + 3 semitones = G4
      ])('string %i at fret %i should return %s', (string, fret, expected) => {
        const note = getNoteAtPosition({ string, fret }, tuning, stringCount);
        expect(note).toBe(expected);
        expect(note).toBe(calculateExpectedNote(tuning, string, fret));
      });
    });

    describe('fret 5 on each string', () => {
      it.each([
        [0, 5, 'A2'],  // E2 + 5 semitones = A2
        [1, 5, 'D3'],  // A2 + 5 semitones = D3
        [2, 5, 'G3'],  // D3 + 5 semitones = G3
        [3, 5, 'C4'],  // G3 + 5 semitones = C4
        [4, 5, 'E4'],  // B3 + 5 semitones = E4
        [5, 5, 'A4'],  // E4 + 5 semitones = A4
      ])('string %i at fret %i should return %s', (string, fret, expected) => {
        const note = getNoteAtPosition({ string, fret }, tuning, stringCount);
        expect(note).toBe(expected);
        expect(note).toBe(calculateExpectedNote(tuning, string, fret));
      });
    });

    describe('fret 7 on each string', () => {
      it.each([
        [0, 7, 'B2'],  // E2 + 7 semitones = B2
        [1, 7, 'E3'],  // A2 + 7 semitones = E3
        [2, 7, 'A3'],  // D3 + 7 semitones = A3
        [3, 7, 'D4'],  // G3 + 7 semitones = D4
        [4, 7, 'Gb4'], // B3 + 7 semitones = Gb4 (tonal uses flats)
        [5, 7, 'B4'],  // E4 + 7 semitones = B4
      ])('string %i at fret %i should return %s', (string, fret, expected) => {
        const note = getNoteAtPosition({ string, fret }, tuning, stringCount);
        expect(note).toBe(expected);
        expect(note).toBe(calculateExpectedNote(tuning, string, fret));
      });
    });

    describe('fret 12 - octave above open (all strings)', () => {
      it.each([0, 1, 2, 3, 4, 5])('string %i at fret 12 should be same note as open, octave higher', (string) => {
        const openNote = getNoteAtPosition({ string, fret: 0 }, tuning, stringCount);
        const fret12Note = getNoteAtPosition({ string, fret: 12 }, tuning, stringCount);
        
        // Same note name
        expect(getNoteName(fret12Note)).toBe(getNoteName(openNote));
        // One octave higher
        expect(getOctave(fret12Note)).toBe(getOctave(openNote) + 1);
        // Verify with tuning-relative calculation
        expect(fret12Note).toBe(calculateExpectedNote(tuning, string, 12));
      });

      it.each([
        [0, 'E3'],  // E2 + 12 = E3
        [1, 'A3'],  // A2 + 12 = A3
        [2, 'D4'],  // D3 + 12 = D4
        [3, 'G4'],  // G3 + 12 = G4
        [4, 'B4'],  // B3 + 12 = B4
        [5, 'E5'],  // E4 + 12 = E5
      ])('string %i at fret 12 should return %s', (string, expected) => {
        const note = getNoteAtPosition({ string, fret: 12 }, tuning, stringCount);
        expect(note).toBe(expected);
      });
    });

    describe('fret 24 - two octaves above open (all strings)', () => {
      it.each([0, 1, 2, 3, 4, 5])('string %i at fret 24 should be same note as open, two octaves higher', (string) => {
        const openNote = getNoteAtPosition({ string, fret: 0 }, tuning, stringCount);
        const fret24Note = getNoteAtPosition({ string, fret: 24 }, tuning, stringCount);
        
        // Same note name
        expect(getNoteName(fret24Note)).toBe(getNoteName(openNote));
        // Two octaves higher
        expect(getOctave(fret24Note)).toBe(getOctave(openNote) + 2);
      });
    });
  });

  describe('7-string standard tuning - comprehensive', () => {
    const tuning = STANDARD_TUNINGS['standard-7'];
    const stringCount = 7;

    // String mapping for 7-string:
    // string 0 (low B)  -> tuning[0] -> B1
    // string 1 (low E)  -> tuning[1] -> E2
    // string 2 (A)      -> tuning[2] -> A2
    // string 3 (D)      -> tuning[3] -> D3
    // string 4 (G)      -> tuning[4] -> G3
    // string 5 (B)      -> tuning[5] -> B3
    // string 6 (high E) -> tuning[6] -> E4

    describe('open strings (fret 0)', () => {
      it.each([
        [0, 'B1'], // low B (7-string specific)
        [1, 'E2'], // low E
        [2, 'A2'], // A
        [3, 'D3'], // D
        [4, 'G3'], // G
        [5, 'B3'], // B
        [6, 'E4'], // high E
      ])('string %i at fret 0 should return %s', (string, expected) => {
        const note = getNoteAtPosition({ string, fret: 0 }, tuning, stringCount);
        expect(note).toBe(expected);
        expect(note).toBe(calculateExpectedNote(tuning, string, 0));
      });
    });

    describe('fret 5 on each string', () => {
      it.each([
        [0, 5, 'E2'],  // B1 + 5 = E2
        [1, 5, 'A2'],  // E2 + 5 = A2
        [2, 5, 'D3'],  // A2 + 5 = D3
        [3, 5, 'G3'],  // D3 + 5 = G3
        [4, 5, 'C4'],  // G3 + 5 = C4
        [5, 5, 'E4'],  // B3 + 5 = E4
        [6, 5, 'A4'],  // E4 + 5 = A4
      ])('string %i at fret %i should return %s', (string, fret, expected) => {
        const note = getNoteAtPosition({ string, fret }, tuning, stringCount);
        expect(note).toBe(expected);
        expect(note).toBe(calculateExpectedNote(tuning, string, fret));
      });
    });

    describe('fret 7 on each string', () => {
      it.each([
        [0, 7, 'Gb2'], // B1 + 7 = Gb2 (tonal uses flats)
        [1, 7, 'B2'],  // E2 + 7 = B2
        [2, 7, 'E3'],  // A2 + 7 = E3
        [3, 7, 'A3'],  // D3 + 7 = A3
        [4, 7, 'D4'],  // G3 + 7 = D4
        [5, 7, 'Gb4'], // B3 + 7 = Gb4 (tonal uses flats)
        [6, 7, 'B4'],  // E4 + 7 = B4
      ])('string %i at fret %i should return %s', (string, fret, expected) => {
        const note = getNoteAtPosition({ string, fret }, tuning, stringCount);
        expect(note).toBe(expected);
        expect(note).toBe(calculateExpectedNote(tuning, string, fret));
      });
    });

    describe('fret 12 - octave above open (all 7 strings)', () => {
      it.each([0, 1, 2, 3, 4, 5, 6])('string %i at fret 12 should be same note as open, octave higher', (string) => {
        const openNote = getNoteAtPosition({ string, fret: 0 }, tuning, stringCount);
        const fret12Note = getNoteAtPosition({ string, fret: 12 }, tuning, stringCount);
        
        expect(getNoteName(fret12Note)).toBe(getNoteName(openNote));
        expect(getOctave(fret12Note)).toBe(getOctave(openNote) + 1);
        expect(fret12Note).toBe(calculateExpectedNote(tuning, string, 12));
      });

      it.each([
        [0, 'B2'],  // B1 + 12 = B2
        [1, 'E3'],  // E2 + 12 = E3
        [2, 'A3'],  // A2 + 12 = A3
        [3, 'D4'],  // D3 + 12 = D4
        [4, 'G4'],  // G3 + 12 = G4
        [5, 'B4'],  // B3 + 12 = B4
        [6, 'E5'],  // E4 + 12 = E5
      ])('string %i at fret 12 should return %s', (string, expected) => {
        const note = getNoteAtPosition({ string, fret: 12 }, tuning, stringCount);
        expect(note).toBe(expected);
      });
    });

    describe('low B string specific tests', () => {
      it('should handle the extended range of the 7th string (low B)', () => {
        // Test various frets on the low B string (string 0)
        expect(getNoteAtPosition({ string: 0, fret: 0 }, tuning, stringCount)).toBe('B1');
        expect(getNoteAtPosition({ string: 0, fret: 2 }, tuning, stringCount)).toBe('Db2'); // tonal uses flats
        expect(getNoteAtPosition({ string: 0, fret: 5 }, tuning, stringCount)).toBe('E2');
        expect(getNoteAtPosition({ string: 0, fret: 10 }, tuning, stringCount)).toBe('A2');
        expect(getNoteAtPosition({ string: 0, fret: 12 }, tuning, stringCount)).toBe('B2');
      });
    });
  });

  describe('Drop D tuning', () => {
    const tuning = STANDARD_TUNINGS['drop-d-6'];
    const stringCount = 6;

    describe('open strings verify tuning difference', () => {
      it('should return D2 for string 0 (low D) open - different from standard', () => {
        const note = getNoteAtPosition({ string: 0, fret: 0 }, tuning, stringCount);
        expect(note).toBe('D2');
        expect(note).toBe(tuning.notes[0]);
      });

      it('other strings should match standard tuning', () => {
        expect(getNoteAtPosition({ string: 1, fret: 0 }, tuning, stringCount)).toBe('A2');
        expect(getNoteAtPosition({ string: 2, fret: 0 }, tuning, stringCount)).toBe('D3');
        expect(getNoteAtPosition({ string: 3, fret: 0 }, tuning, stringCount)).toBe('G3');
        expect(getNoteAtPosition({ string: 4, fret: 0 }, tuning, stringCount)).toBe('B3');
        expect(getNoteAtPosition({ string: 5, fret: 0 }, tuning, stringCount)).toBe('E4');
      });
    });

    describe('fret positions on dropped string', () => {
      it.each([
        [0, 0, 'D2'],  // D2 open
        [0, 2, 'E2'],  // D2 + 2 = E2 (matches standard open low E)
        [0, 5, 'G2'],  // D2 + 5 = G2
        [0, 7, 'A2'],  // D2 + 7 = A2
        [0, 12, 'D3'], // D2 + 12 = D3
      ])('string %i at fret %i should return %s', (string, fret, expected) => {
        const note = getNoteAtPosition({ string, fret }, tuning, stringCount);
        expect(note).toBe(expected);
        expect(note).toBe(calculateExpectedNote(tuning, string, fret));
      });
    });
  });

  describe('Drop A 7-string tuning', () => {
    const tuning = STANDARD_TUNINGS['drop-a-7'];
    const stringCount = 7;

    describe('open strings verify tuning', () => {
      it('should return A1 for string 0 (lowest) open', () => {
        const note = getNoteAtPosition({ string: 0, fret: 0 }, tuning, stringCount);
        expect(note).toBe('A1');
        expect(note).toBe(tuning.notes[0]);
      });

      it.each([
        [0, 'A1'],
        [1, 'E2'],
        [2, 'A2'],
        [3, 'D3'],
        [4, 'G3'],
        [5, 'B3'],
        [6, 'E4'],
      ])('string %i should be %s', (string, expected) => {
        const note = getNoteAtPosition({ string, fret: 0 }, tuning, stringCount);
        expect(note).toBe(expected);
      });
    });
  });

  describe('edge cases', () => {
    const tuning = STANDARD_TUNINGS['standard-6'];
    const stringCount = 6;

    it('should return empty string for string index >= stringCount', () => {
      expect(getNoteAtPosition({ string: 6, fret: 0 }, tuning, stringCount)).toBe('');
      expect(getNoteAtPosition({ string: 10, fret: 0 }, tuning, stringCount)).toBe('');
      expect(getNoteAtPosition({ string: 100, fret: 0 }, tuning, stringCount)).toBe('');
    });

    it('should return empty string for negative string index', () => {
      expect(getNoteAtPosition({ string: -1, fret: 0 }, tuning, stringCount)).toBe('');
      expect(getNoteAtPosition({ string: -5, fret: 0 }, tuning, stringCount)).toBe('');
    });

    it('should handle very high frets', () => {
      // String 0 (E2) + 22 semitones = D4
      expect(getNoteAtPosition({ string: 0, fret: 22 }, tuning, stringCount)).toBe('D4');
      
      // String 5 (E4) + 22 semitones = D6
      expect(getNoteAtPosition({ string: 5, fret: 22 }, tuning, stringCount)).toBe('D6');
      
      // String 2 (D3) + 22 semitones = C5
      expect(getNoteAtPosition({ string: 2, fret: 22 }, tuning, stringCount)).toBe('C5');
    });

    it('should handle fret 0 as same as open string', () => {
      for (let string = 0; string < stringCount; string++) {
        const note = getNoteAtPosition({ string, fret: 0 }, tuning, stringCount);
        expect(note).toBe(tuning.notes[string]);
      }
    });
  });

  describe('tuning-relative calculations - dynamic tests', () => {
    const tunings = [
      { key: 'standard-6', stringCount: 6 },
      { key: 'standard-7', stringCount: 7 },
      { key: 'drop-d-6', stringCount: 6 },
      { key: 'drop-a-7', stringCount: 7 },
    ];

    tunings.forEach(({ key, stringCount }) => {
      const tuning = STANDARD_TUNINGS[key];

      describe(`${tuning.name}`, () => {
        it('all open strings should match tuning array directly', () => {
          for (let string = 0; string < stringCount; string++) {
            const note = getNoteAtPosition({ string, fret: 0 }, tuning, stringCount);
            expect(note).toBe(tuning.notes[string]);
          }
        });

        it('fret 12 should always be octave above open', () => {
          for (let string = 0; string < stringCount; string++) {
            const openNote = getNoteAtPosition({ string, fret: 0 }, tuning, stringCount);
            const fret12Note = getNoteAtPosition({ string, fret: 12 }, tuning, stringCount);
            
            expect(getNoteName(fret12Note)).toBe(getNoteName(openNote));
            expect(getOctave(fret12Note)).toBe(getOctave(openNote) + 1);
          }
        });

        it('chromatic sequence should progress correctly on each string', () => {
          for (let string = 0; string < stringCount; string++) {
            for (let fret = 0; fret < 12; fret++) {
              const note = getNoteAtPosition({ string, fret }, tuning, stringCount);
              const expected = calculateExpectedNote(tuning, string, fret);
              expect(note).toBe(expected);
            }
          }
        });
      });
    });
  });
});

describe('getPositionsForNote', () => {
  const tuning = STANDARD_TUNINGS['standard-6'];
  const stringCount = 6;

  it('should find E on all strings at appropriate frets', () => {
    const positions = getPositionsForNote('E', tuning, stringCount, 12);
    
    // E should appear at (with string 0 = low E):
    // String 0 (E2): fret 0, 12
    // String 1 (A2): fret 7
    // String 2 (D3): fret 2
    // String 3 (G3): fret 9
    // String 4 (B3): fret 5
    // String 5 (E4): fret 0, 12
    
    expect(positions).toContainEqual({ string: 0, fret: 0 });
    expect(positions).toContainEqual({ string: 0, fret: 12 });
    expect(positions).toContainEqual({ string: 1, fret: 7 });
    expect(positions).toContainEqual({ string: 2, fret: 2 });
    expect(positions).toContainEqual({ string: 3, fret: 9 });
    expect(positions).toContainEqual({ string: 4, fret: 5 });
    expect(positions).toContainEqual({ string: 5, fret: 0 });
    expect(positions).toContainEqual({ string: 5, fret: 12 });
  });

  it('should find A on all strings', () => {
    const positions = getPositionsForNote('A', tuning, stringCount, 12);
    
    // A should appear at (with string 0 = low E):
    // String 0 (E2): fret 5
    // String 1 (A2): fret 0, 12
    // String 2 (D3): fret 7
    // String 3 (G3): fret 2
    // String 4 (B3): fret 10
    // String 5 (E4): fret 5
    
    expect(positions).toContainEqual({ string: 0, fret: 5 });
    expect(positions).toContainEqual({ string: 1, fret: 0 });
    expect(positions).toContainEqual({ string: 1, fret: 12 });
    expect(positions).toContainEqual({ string: 2, fret: 7 });
    expect(positions).toContainEqual({ string: 3, fret: 2 });
    expect(positions).toContainEqual({ string: 4, fret: 10 });
    expect(positions).toContainEqual({ string: 5, fret: 5 });
  });

  it('should return empty array for invalid note', () => {
    const positions = getPositionsForNote('X', tuning, stringCount);
    expect(positions).toEqual([]);
  });
});

describe('getIntervalBetweenPositions', () => {
  const tuning = STANDARD_TUNINGS['standard-6'];
  const stringCount = 6;

  it('should return root (R) for same position', () => {
    const interval = getIntervalBetweenPositions(
      { string: 0, fret: 0 },
      { string: 0, fret: 0 },
      tuning,
      stringCount
    );
    expect(interval).toBe('R');
  });

  it('should return correct intervals across frets', () => {
    // E2 to A2 = perfect fourth (5 semitones)
    const interval1 = getIntervalBetweenPositions(
      { string: 0, fret: 0 },  // E2
      { string: 0, fret: 5 },  // A2
      tuning,
      stringCount
    );
    expect(interval1).toBe('4');

    // E2 to B2 = perfect fifth (7 semitones)
    const interval2 = getIntervalBetweenPositions(
      { string: 0, fret: 0 },  // E2
      { string: 0, fret: 7 },  // B2
      tuning,
      stringCount
    );
    expect(interval2).toBe('5');
  });

  it('should handle octave intervals', () => {
    // E2 to E3 (fret 12) = octave = 0 semitones (mod 12) = R
    const interval = getIntervalBetweenPositions(
      { string: 0, fret: 0 },   // E2
      { string: 0, fret: 12 },  // E3
      tuning,
      stringCount
    );
    expect(interval).toBe('R');
  });
});

describe('getRandomPosition', () => {
  it('should return position within valid range', () => {
    const stringCount = 6;
    const maxFret = 12;
    const minFret = 0;

    for (let i = 0; i < 100; i++) {
      const pos = getRandomPosition(stringCount, maxFret, minFret);
      expect(pos.string).toBeGreaterThanOrEqual(0);
      expect(pos.string).toBeLessThan(stringCount);
      expect(pos.fret).toBeGreaterThanOrEqual(minFret);
      expect(pos.fret).toBeLessThanOrEqual(maxFret);
    }
  });

  it('should respect minFret constraint', () => {
    const stringCount = 6;
    const maxFret = 12;
    const minFret = 5;

    for (let i = 0; i < 100; i++) {
      const pos = getRandomPosition(stringCount, maxFret, minFret);
      expect(pos.fret).toBeGreaterThanOrEqual(minFret);
    }
  });

  it('should work for 7-string guitar', () => {
    const stringCount = 7;
    
    for (let i = 0; i < 100; i++) {
      const pos = getRandomPosition(stringCount);
      expect(pos.string).toBeGreaterThanOrEqual(0);
      expect(pos.string).toBeLessThan(stringCount);
    }
  });
});
