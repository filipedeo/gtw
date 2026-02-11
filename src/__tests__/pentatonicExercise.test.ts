import { describe, it, expect } from 'vitest';
import { Note } from 'tonal';
import { getScaleNotes } from '../lib/theoryEngine';
import { getNoteAtPosition } from '../utils/fretboardCalculations';
import { STANDARD_TUNINGS } from '../types/guitar';

/**
 * Tests for pentatonic box logic.
 *
 * Replicate the core algorithm from PentatonicExercise.tsx:
 * - getPentatonicBox: compute 2-notes-per-string boxes
 * - getExtensionPositions: find the 2 diatonic notes that complete a mode
 */

const tuning = STANDARD_TUNINGS['standard-6'];
const stringCount = 6;

function chromas(notes: string[]): number[] {
  return notes.map(n => Note.get(n).chroma).filter((c): c is number => c !== undefined);
}

/**
 * Simplified pentatonic box builder (mirrors PentatonicExercise logic).
 */
function getPentatonicBox(
  key: string,
  scaleType: 'minor' | 'major',
  boxIndex: number,
): { string: number; fret: number }[] {
  const scaleName = scaleType === 'minor' ? 'minor pentatonic' : 'major pentatonic';
  const scaleNotes = getScaleNotes(key, scaleName);
  if (!scaleNotes || scaleNotes.length === 0) return [];

  const scaleChromas = chromas(scaleNotes);
  const rootChroma = scaleChromas[0];

  // Scan lowest string for pentatonic notes
  const lowFrets: { fret: number; chroma: number }[] = [];
  for (let f = 0; f <= 22; f++) {
    const note = getNoteAtPosition({ string: 0, fret: f }, tuning, stringCount);
    const ch = Note.get(note).chroma;
    if (ch !== undefined && scaleChromas.includes(ch)) {
      lowFrets.push({ fret: f, chroma: ch });
    }
  }

  const rootIdx = lowFrets.findIndex(f => f.chroma === rootChroma);
  if (rootIdx === -1) return [];

  const startIdx = rootIdx + boxIndex;
  if (startIdx >= lowFrets.length) return [];

  let startFret = lowFrets[startIdx].fret;
  if (startFret > 12) startFret -= 12;

  const positions: { string: number; fret: number }[] = [];

  for (let s = 0; s < stringCount; s++) {
    const frets: number[] = [];
    for (let f = 0; f <= 22; f++) {
      const note = getNoteAtPosition({ string: s, fret: f }, tuning, stringCount);
      const ch = Note.get(note).chroma;
      if (ch !== undefined && scaleChromas.includes(ch)) {
        frets.push(f);
      }
    }

    let bestPair: number[] = [];
    let bestScore = Infinity;

    for (let i = 0; i < frets.length - 1; i++) {
      const pair = [frets[i], frets[i + 1]];
      if (pair[0] >= startFret - 1 && pair[1] <= startFret + 4) {
        const score = Math.abs(pair[0] - startFret);
        if (score < bestScore) {
          bestScore = score;
          bestPair = pair;
        }
      }
    }

    if (bestPair.length === 0) {
      for (let i = 0; i < frets.length - 1; i++) {
        const pair = [frets[i], frets[i + 1]];
        if (pair[1] - pair[0] <= 5) {
          const center = (pair[0] + pair[1]) / 2;
          const score = Math.abs(center - (startFret + 1.5));
          if (score < bestScore) {
            bestScore = score;
            bestPair = pair;
          }
        }
      }
    }

    bestPair.forEach(f => positions.push({ string: s, fret: f }));
  }

  return positions;
}

// ---------------------------------------------------------------------------
// Pentatonic box tests
// ---------------------------------------------------------------------------
describe('Pentatonic boxes', () => {
  describe('A minor pentatonic', () => {
    for (let box = 0; box < 5; box++) {
      it(`box ${box + 1} produces notes in A minor pentatonic scale`, () => {
        const positions = getPentatonicBox('A', 'minor', box);
        expect(positions.length).toBeGreaterThan(0);

        const scaleChromas = chromas(getScaleNotes('A', 'minor pentatonic'));

        for (const pos of positions) {
          const note = getNoteAtPosition(pos, tuning, stringCount);
          const ch = Note.get(note).chroma;
          expect(ch).toBeDefined();
          expect(scaleChromas).toContain(ch!);
        }
      });
    }

    it('each box has 2 notes per string (12 total)', () => {
      for (let box = 0; box < 5; box++) {
        const positions = getPentatonicBox('A', 'minor', box);
        expect(positions).toHaveLength(12);

        // Check 2 per string
        for (let s = 0; s < stringCount; s++) {
          const onString = positions.filter(p => p.string === s);
          expect(onString).toHaveLength(2);
        }
      }
    });
  });

  describe('C major pentatonic', () => {
    it('shares same pitch classes as A minor pentatonic', () => {
      const aminorCh = new Set(chromas(getScaleNotes('A', 'minor pentatonic')));
      const cmajorCh = new Set(chromas(getScaleNotes('C', 'major pentatonic')));

      expect(aminorCh).toEqual(cmajorCh);
    });

    for (let box = 0; box < 5; box++) {
      it(`box ${box + 1} all notes in C major pentatonic`, () => {
        const positions = getPentatonicBox('C', 'major', box);
        expect(positions.length).toBeGreaterThan(0);

        const scaleChromas = chromas(getScaleNotes('C', 'major pentatonic'));

        for (const pos of positions) {
          const note = getNoteAtPosition(pos, tuning, stringCount);
          const ch = Note.get(note).chroma;
          expect(scaleChromas).toContain(ch!);
        }
      });
    }
  });

  describe('E minor pentatonic', () => {
    it('box 1 produces correct notes', () => {
      const positions = getPentatonicBox('E', 'minor', 0);
      expect(positions.length).toBeGreaterThan(0);

      const scaleChromas = chromas(getScaleNotes('E', 'minor pentatonic'));

      for (const pos of positions) {
        const note = getNoteAtPosition(pos, tuning, stringCount);
        const ch = Note.get(note).chroma;
        expect(scaleChromas).toContain(ch!);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Extension notes
// ---------------------------------------------------------------------------
describe('Extension notes', () => {
  it('A minor pentatonic extended by exactly 2 pitch classes', () => {
    const pentCh = chromas(getScaleNotes('A', 'minor pentatonic'));
    const fullCh = chromas(getScaleNotes('A', 'aeolian'));
    const extensionCh = fullCh.filter(c => !pentCh.includes(c));

    // Minor pentatonic is missing 2nd and 6th → 2 extension notes
    expect(extensionCh).toHaveLength(2);
  });

  it('C major pentatonic extended by exactly 2 pitch classes', () => {
    const pentCh = chromas(getScaleNotes('C', 'major pentatonic'));
    const fullCh = chromas(getScaleNotes('C', 'major'));
    const extensionCh = fullCh.filter(c => !pentCh.includes(c));

    // Major pentatonic is missing 4th and 7th → 2 extension notes
    expect(extensionCh).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Transposition
// ---------------------------------------------------------------------------
describe('Transposition', () => {
  it('G minor pentatonic box 1 produces G minor pent notes', () => {
    const positions = getPentatonicBox('G', 'minor', 0);
    expect(positions.length).toBeGreaterThan(0);

    const scaleChromas = chromas(getScaleNotes('G', 'minor pentatonic'));
    for (const pos of positions) {
      const note = getNoteAtPosition(pos, tuning, stringCount);
      const ch = Note.get(note).chroma;
      expect(scaleChromas).toContain(ch!);
    }
  });

  it('all 5 keys produce valid boxes', () => {
    for (const key of ['A', 'C', 'E', 'G', 'D']) {
      const positions = getPentatonicBox(key, 'minor', 0);
      expect(positions.length).toBeGreaterThanOrEqual(10);
    }
  });
});
