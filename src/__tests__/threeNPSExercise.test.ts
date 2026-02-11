import { describe, it, expect } from 'vitest';
import { getModeNotes, MODES } from '../lib/theoryEngine';
import { getNoteAtPosition } from '../utils/fretboardCalculations';
import { STANDARD_TUNINGS, normalizeNoteName } from '../types/guitar';

/**
 * Tests for 3-notes-per-string scale pattern logic.
 *
 * Mirrors the getThreeNPSPositions algorithm from ThreeNPSExercise.tsx.
 */

const tuning = STANDARD_TUNINGS['standard-6'];
const stringCount = 6;

function getThreeNPSPositions(
  key: string,
  modeName: string,
  startFret: number
): { string: number; fret: number }[] {
  const scaleNotes = getModeNotes(normalizeNoteName(key), modeName);
  if (!scaleNotes || scaleNotes.length === 0) return [];

  const normalizedScaleNotes = scaleNotes.map(n => normalizeNoteName(n));

  const positions: { string: number; fret: number }[] = [];
  let targetFret = startFret;

  for (let string = 0; string < stringCount; string++) {
    const scaleFrets: number[] = [];
    for (let fret = 0; fret <= 22; fret++) {
      const pos = { string, fret };
      const note = getNoteAtPosition(pos, tuning, stringCount);
      const noteName = normalizeNoteName(note.replace(/\d/, ''));
      if (normalizedScaleNotes.includes(noteName)) {
        scaleFrets.push(fret);
      }
    }

    let bestGroup: number[] = [];
    let bestDistance = Infinity;

    for (let i = 0; i <= scaleFrets.length - 3; i++) {
      const group = [scaleFrets[i], scaleFrets[i + 1], scaleFrets[i + 2]];
      if (group[2] - group[0] <= 5) {
        const center = (group[0] + group[2]) / 2;
        const dist = Math.abs(center - targetFret - 2);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestGroup = group;
        }
      }
    }

    if (bestGroup.length === 3) {
      bestGroup.forEach(fret => positions.push({ string, fret }));
      targetFret = Math.max(targetFret, bestGroup[0]);
    }
  }

  return positions;
}

// ---------------------------------------------------------------------------
// 3NPS pattern tests
// ---------------------------------------------------------------------------
describe('3NPS patterns', () => {
  describe('each string has exactly 3 notes', () => {
    for (const mode of MODES) {
      it(`${mode.displayName} in C`, () => {
        const positions = getThreeNPSPositions('C', mode.name, 0);
        expect(positions.length).toBeGreaterThan(0);

        for (let s = 0; s < stringCount; s++) {
          const onString = positions.filter(p => p.string === s);
          expect(onString).toHaveLength(3);
        }
      });
    }
  });

  describe('all notes belong to the correct scale', () => {
    for (const mode of MODES) {
      it(`${mode.displayName} in C`, () => {
        const positions = getThreeNPSPositions('C', mode.name, 0);
        const scaleNotes = getModeNotes('C', mode.name).map(n => normalizeNoteName(n));

        for (const pos of positions) {
          const note = getNoteAtPosition(pos, tuning, stringCount);
          const noteName = normalizeNoteName(note.replace(/\d/, ''));
          expect(scaleNotes).toContain(noteName);
        }
      });
    }
  });

  describe('max 5-fret span per string', () => {
    for (const mode of MODES) {
      it(`${mode.displayName} in C`, () => {
        const positions = getThreeNPSPositions('C', mode.name, 0);

        for (let s = 0; s < stringCount; s++) {
          const frets = positions.filter(p => p.string === s).map(p => p.fret);
          if (frets.length === 3) {
            const span = Math.max(...frets) - Math.min(...frets);
            expect(span).toBeLessThanOrEqual(5);
          }
        }
      });
    }
  });

  it('produces 18 total positions for 6-string guitar', () => {
    const positions = getThreeNPSPositions('C', 'ionian', 0);
    expect(positions).toHaveLength(18);
  });

  it('different start frets produce different patterns', () => {
    const pos0 = getThreeNPSPositions('C', 'ionian', 0);
    const pos5 = getThreeNPSPositions('C', 'ionian', 5);

    // At least some frets should differ
    const frets0 = pos0.map(p => `${p.string}-${p.fret}`).sort();
    const frets5 = pos5.map(p => `${p.string}-${p.fret}`).sort();
    expect(frets0).not.toEqual(frets5);
  });

  describe('transposition', () => {
    it('G ionian produces G major scale notes', () => {
      const positions = getThreeNPSPositions('G', 'ionian', 3);
      const scaleNotes = getModeNotes('G', 'ionian').map(n => normalizeNoteName(n));

      for (const pos of positions) {
        const note = getNoteAtPosition(pos, tuning, stringCount);
        const noteName = normalizeNoteName(note.replace(/\d/, ''));
        expect(scaleNotes).toContain(noteName);
      }
    });

    it('A dorian produces A dorian notes', () => {
      const positions = getThreeNPSPositions('A', 'dorian', 5);
      const scaleNotes = getModeNotes('A', 'dorian').map(n => normalizeNoteName(n));

      for (const pos of positions) {
        const note = getNoteAtPosition(pos, tuning, stringCount);
        const noteName = normalizeNoteName(note.replace(/\d/, ''));
        expect(scaleNotes).toContain(noteName);
      }
    });
  });
});
