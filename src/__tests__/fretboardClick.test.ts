import { describe, it, expect } from 'vitest';
import { getNoteAtPosition } from '../utils/fretboardCalculations';
import { STANDARD_TUNINGS } from '../types/guitar';

/**
 * Test the complete click-to-note flow for the fretboard
 * 
 * This tests the critical path:
 * 1. User clicks at a Y position on the canvas
 * 2. Y position is converted to a visual row
 * 3. Visual row is converted to a string index
 * 4. String index is used to look up the note from tuning array
 * 5. The note is played
 * 
 * The fretboard orientation is:
 * - Visual row 0 (top) = high E string (thinnest)
 * - Visual row 5 (bottom) = low E string (thickest)
 * 
 * The tuning array is:
 * - Index 0 = low E (E2)
 * - Index 5 = high E (E4)
 */

const STANDARD_6_TUNING = STANDARD_TUNINGS['standard-6'];
const STRING_COUNT = 6;

// These functions mirror the Fretboard component logic
const visualRowToStringIndex = (visualRow: number, stringCount: number) => stringCount - 1 - visualRow;
const stringIndexToVisualRow = (stringIndex: number, stringCount: number) => stringCount - 1 - stringIndex;

describe('Fretboard Click Detection', () => {
  describe('Visual Row to String Index Conversion', () => {
    it('visual row 0 (top) should map to string index 5 (high E)', () => {
      expect(visualRowToStringIndex(0, 6)).toBe(5);
    });

    it('visual row 5 (bottom) should map to string index 0 (low E)', () => {
      expect(visualRowToStringIndex(5, 6)).toBe(0);
    });
  });

  describe('Click on Top String (Visual Row 0) - High E', () => {
    it('clicking visual row 0, fret 0 should give E4 (high E open)', () => {
      const visualRow = 0;
      const fret = 0;
      const stringIndex = visualRowToStringIndex(visualRow, STRING_COUNT);
      
      expect(stringIndex).toBe(5);
      
      const note = getNoteAtPosition({ string: stringIndex, fret }, STANDARD_6_TUNING, STRING_COUNT);
      expect(note).toBe('E4');
    });

    it('clicking visual row 0, fret 1 should give F4', () => {
      const visualRow = 0;
      const fret = 1;
      const stringIndex = visualRowToStringIndex(visualRow, STRING_COUNT);
      const note = getNoteAtPosition({ string: stringIndex, fret }, STANDARD_6_TUNING, STRING_COUNT);
      expect(note).toBe('F4');
    });

    it('clicking visual row 0, fret 5 should give A4', () => {
      const visualRow = 0;
      const fret = 5;
      const stringIndex = visualRowToStringIndex(visualRow, STRING_COUNT);
      const note = getNoteAtPosition({ string: stringIndex, fret }, STANDARD_6_TUNING, STRING_COUNT);
      expect(note).toBe('A4');
    });
  });

  describe('Click on Bottom String (Visual Row 5) - Low E', () => {
    it('clicking visual row 5, fret 0 should give E2 (low E open)', () => {
      const visualRow = 5;
      const fret = 0;
      const stringIndex = visualRowToStringIndex(visualRow, STRING_COUNT);
      
      expect(stringIndex).toBe(0);
      
      const note = getNoteAtPosition({ string: stringIndex, fret }, STANDARD_6_TUNING, STRING_COUNT);
      expect(note).toBe('E2');
    });

    it('clicking visual row 5, fret 5 should give A2', () => {
      const visualRow = 5;
      const fret = 5;
      const stringIndex = visualRowToStringIndex(visualRow, STRING_COUNT);
      const note = getNoteAtPosition({ string: stringIndex, fret }, STANDARD_6_TUNING, STRING_COUNT);
      expect(note).toBe('A2');
    });
  });

  describe('Click on Middle Strings', () => {
    it('clicking visual row 1 (B string), fret 0 should give B3', () => {
      const visualRow = 1;
      const fret = 0;
      const stringIndex = visualRowToStringIndex(visualRow, STRING_COUNT);
      
      expect(stringIndex).toBe(4);
      expect(STANDARD_6_TUNING.notes[4]).toBe('B3');
      
      const note = getNoteAtPosition({ string: stringIndex, fret }, STANDARD_6_TUNING, STRING_COUNT);
      expect(note).toBe('B3');
    });

    it('clicking visual row 2 (G string), fret 0 should give G3', () => {
      const visualRow = 2;
      const fret = 0;
      const stringIndex = visualRowToStringIndex(visualRow, STRING_COUNT);
      
      expect(stringIndex).toBe(3);
      expect(STANDARD_6_TUNING.notes[3]).toBe('G3');
      
      const note = getNoteAtPosition({ string: stringIndex, fret }, STANDARD_6_TUNING, STRING_COUNT);
      expect(note).toBe('G3');
    });

    it('clicking visual row 3 (D string), fret 0 should give D3', () => {
      const visualRow = 3;
      const fret = 0;
      const stringIndex = visualRowToStringIndex(visualRow, STRING_COUNT);
      
      expect(stringIndex).toBe(2);
      expect(STANDARD_6_TUNING.notes[2]).toBe('D3');
      
      const note = getNoteAtPosition({ string: stringIndex, fret }, STANDARD_6_TUNING, STRING_COUNT);
      expect(note).toBe('D3');
    });

    it('clicking visual row 4 (A string), fret 0 should give A2', () => {
      const visualRow = 4;
      const fret = 0;
      const stringIndex = visualRowToStringIndex(visualRow, STRING_COUNT);
      
      expect(stringIndex).toBe(1);
      expect(STANDARD_6_TUNING.notes[1]).toBe('A2');
      
      const note = getNoteAtPosition({ string: stringIndex, fret }, STANDARD_6_TUNING, STRING_COUNT);
      expect(note).toBe('A2');
    });
  });

  describe('7-String Guitar', () => {
    const STANDARD_7_TUNING = STANDARD_TUNINGS['standard-7'];
    const STRING_COUNT_7 = 7;

    it('visual row 0 (top) should be high E (E4)', () => {
      const visualRow = 0;
      const stringIndex = visualRowToStringIndex(visualRow, STRING_COUNT_7);
      
      expect(stringIndex).toBe(6);
      expect(STANDARD_7_TUNING.notes[6]).toBe('E4');
      
      const note = getNoteAtPosition({ string: stringIndex, fret: 0 }, STANDARD_7_TUNING, STRING_COUNT_7);
      expect(note).toBe('E4');
    });

    it('visual row 6 (bottom) should be low B (B1)', () => {
      const visualRow = 6;
      const stringIndex = visualRowToStringIndex(visualRow, STRING_COUNT_7);
      
      expect(stringIndex).toBe(0);
      expect(STANDARD_7_TUNING.notes[0]).toBe('B1');
      
      const note = getNoteAtPosition({ string: stringIndex, fret: 0 }, STANDARD_7_TUNING, STRING_COUNT_7);
      expect(note).toBe('B1');
    });
  });
});

describe('Simulated Canvas Click Coordinates', () => {
  // Constants matching Fretboard.tsx
  const STRING_SPACING = 32;
  const PADDING_Y = 45;
  const PADDING_X = 50;
  const NUT_WIDTH = 10;
  const FRET_WIDTH = 50; // Approximate

  /**
   * Simulate the click handler logic from Fretboard.tsx
   */
  function simulateClick(clickY: number, clickX: number, stringCount: number) {
    // This mirrors the logic in handleCanvasClick
    const visualRow = Math.round((clickY - PADDING_Y) / STRING_SPACING);
    const string = visualRowToStringIndex(visualRow, stringCount);
    
    let fret = 0;
    if (clickX > PADDING_X + NUT_WIDTH) {
      fret = Math.floor((clickX - PADDING_X - NUT_WIDTH) / FRET_WIDTH) + 1;
    }
    
    return { string, fret, visualRow };
  }

  it('clicking at Y=45 (PADDING_Y) should hit visual row 0 (high E)', () => {
    const result = simulateClick(45, 100, 6);
    expect(result.visualRow).toBe(0);
    expect(result.string).toBe(5); // high E
  });

  it('clicking at Y=45+32 should hit visual row 1 (B string)', () => {
    const result = simulateClick(45 + 32, 100, 6);
    expect(result.visualRow).toBe(1);
    expect(result.string).toBe(4); // B string
  });

  it('clicking at Y=45+160 (5*32) should hit visual row 5 (low E)', () => {
    const result = simulateClick(45 + 160, 100, 6);
    expect(result.visualRow).toBe(5);
    expect(result.string).toBe(0); // low E
  });

  it('clicking between strings should round to nearest', () => {
    // Click at Y = 45 + 16 (halfway between row 0 and row 1)
    const result = simulateClick(45 + 16, 100, 6);
    expect(result.visualRow).toBe(1); // Math.round(0.5) = 1
    expect(result.string).toBe(4);
  });

  it('clicking at fret 0 area should give fret 0', () => {
    const result = simulateClick(45, 55, 6); // X=55 is within nut area
    expect(result.fret).toBe(0);
  });

  it('clicking at fret 1 area should give fret 1', () => {
    // X = PADDING_X + NUT_WIDTH + some offset into fret 1
    const result = simulateClick(45, 50 + 10 + 25, 6); // X=85, middle of fret 1
    expect(result.fret).toBe(1);
  });

  it('clicking at fret 5 area should give fret 5', () => {
    // X = PADDING_X + NUT_WIDTH + 4.5 * FRET_WIDTH (middle of fret 5)
    const result = simulateClick(45, 50 + 10 + 4 * 50 + 25, 6);
    expect(result.fret).toBe(5);
  });
});

describe('DrawNote Position Calculation', () => {
  const STRING_SPACING = 32;
  const PADDING_Y = 45;

  /**
   * Calculate Y position for drawing a note
   * This mirrors the logic in drawNote function
   */
  function calculateNoteY(stringIndex: number, stringCount: number) {
    const visualRow = stringIndexToVisualRow(stringIndex, stringCount);
    return PADDING_Y + visualRow * STRING_SPACING;
  }

  it('string index 5 (high E) should draw at Y=45 (top)', () => {
    const y = calculateNoteY(5, 6);
    expect(y).toBe(45);
  });

  it('string index 0 (low E) should draw at Y=45+160 (bottom)', () => {
    const y = calculateNoteY(0, 6);
    expect(y).toBe(45 + 5 * 32); // 205
  });

  it('string index 4 (B string) should draw at Y=45+32', () => {
    const y = calculateNoteY(4, 6);
    expect(y).toBe(45 + 32);
  });
});
