import { describe, it, expect } from 'vitest';
import { getPentatonicBox } from '../components/PentatonicExercise';
import { CAGED_SHAPES, KEYS } from '../lib/cagedPatterns';
import { Tuning } from '../types/guitar';

const STANDARD_TUNING: Tuning = {
  name: 'Standard 6-String',
  notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
};
const STRING_COUNT = 6;

describe('Pentatonic all-shapes toggle', () => {
  it('getPentatonicBox produces positions for all 5 boxes', () => {
    for (let box = 0; box < 5; box++) {
      const positions = getPentatonicBox('A', 'minor', box, STANDARD_TUNING, STRING_COUNT);
      expect(positions.length).toBeGreaterThan(0);
    }
  });

  it('5 boxes produce distinct position sets (not all identical)', () => {
    const boxes = [];
    for (let box = 0; box < 5; box++) {
      boxes.push(getPentatonicBox('A', 'minor', box, STANDARD_TUNING, STRING_COUNT));
    }

    // Serialize each box to a string key for easy comparison
    const serialized = boxes.map(positions =>
      positions
        .map(p => `${p.string}-${p.fret}`)
        .sort()
        .join('|'),
    );

    // At least some boxes should differ from each other
    const unique = new Set(serialized);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('all 5 boxes combined cover a wider fret range than any single box', () => {
    const allFrets: number[] = [];
    const singleBoxFrets: number[][] = [];

    for (let box = 0; box < 5; box++) {
      const positions = getPentatonicBox('A', 'minor', box, STANDARD_TUNING, STRING_COUNT);
      const frets = positions.map(p => p.fret);
      singleBoxFrets.push(frets);
      allFrets.push(...frets);
    }

    const combinedMin = Math.min(...allFrets);
    const combinedMax = Math.max(...allFrets);
    const combinedRange = combinedMax - combinedMin;

    // Each single box should have a smaller range than the combined
    for (let box = 0; box < 5; box++) {
      const boxMin = Math.min(...singleBoxFrets[box]);
      const boxMax = Math.max(...singleBoxFrets[box]);
      const boxRange = boxMax - boxMin;
      expect(combinedRange).toBeGreaterThan(boxRange);
    }
  });

  it('works for major pentatonic as well', () => {
    const allFrets: number[] = [];
    for (let box = 0; box < 5; box++) {
      const positions = getPentatonicBox('C', 'major', box, STANDARD_TUNING, STRING_COUNT);
      expect(positions.length).toBeGreaterThan(0);
      allFrets.push(...positions.map(p => p.fret));
    }

    const range = Math.max(...allFrets) - Math.min(...allFrets);
    // All 5 boxes combined should span a meaningful fret range
    expect(range).toBeGreaterThanOrEqual(8);
  });

  it('each box has notes on every string (2 notes per string)', () => {
    for (let box = 0; box < 5; box++) {
      const positions = getPentatonicBox('A', 'minor', box, STANDARD_TUNING, STRING_COUNT);
      // Each of 6 strings should have exactly 2 pentatonic notes
      for (let s = 0; s < STRING_COUNT; s++) {
        const stringPositions = positions.filter(p => p.string === s);
        expect(stringPositions.length).toBe(2);
      }
    }
  });
});

describe('CAGED all-shapes toggle', () => {
  /**
   * Compute chord/scale positions for a given CAGED shape, key, and scale type.
   * Mirrors the logic in CAGEDExercise component.
   */
  function getCAGEDPositions(
    shape: string,
    key: string,
    scaleType: 'major' | 'minor',
  ): { chord: { string: number; fret: number }[]; scale: { string: number; fret: number }[] } {
    const shapeData = CAGED_SHAPES[shape];
    const keyIndex = KEYS.indexOf(key);
    const baseKeyIndex = KEYS.indexOf(shapeData.baseKey);
    const semitones = (keyIndex - baseKeyIndex + 12) % 12;

    let baseFret = 0;
    if (shape === 'C') baseFret = 3;
    if (shape === 'G') baseFret = 3;
    const rootFret = baseFret + semitones;

    const chordData = scaleType === 'minor' ? shapeData.minorChordPositions : shapeData.chordPositions;
    const scaleData = scaleType === 'minor' ? shapeData.minorScalePattern : shapeData.scalePattern;

    const chord = chordData
      .map(pos => ({ string: pos.string, fret: rootFret + pos.fretOffset }))
      .filter(p => p.fret >= 0 && p.fret <= 22);

    const scale = scaleData
      .map(([string, fretOffset]) => ({ string, fret: rootFret + fretOffset }))
      .filter(p => p.fret >= 0 && p.fret <= 22);

    return { chord, scale };
  }

  it('all 5 CAGED shapes produce positions', () => {
    for (const shape of ['C', 'A', 'G', 'E', 'D']) {
      const { chord, scale } = getCAGEDPositions(shape, 'C', 'major');
      expect(chord.length).toBeGreaterThan(0);
      expect(scale.length).toBeGreaterThan(0);
    }
  });

  it('5 shapes combined cover a wider fret range than any single shape (chord)', () => {
    const allFrets: number[] = [];
    const singleShapeFrets: number[][] = [];

    for (const shape of ['C', 'A', 'G', 'E', 'D']) {
      const { chord } = getCAGEDPositions(shape, 'C', 'major');
      const frets = chord.map(p => p.fret);
      singleShapeFrets.push(frets);
      allFrets.push(...frets);
    }

    const combinedMin = Math.min(...allFrets);
    const combinedMax = Math.max(...allFrets);
    const combinedRange = combinedMax - combinedMin;

    for (const shapeFrets of singleShapeFrets) {
      const shapeMin = Math.min(...shapeFrets);
      const shapeMax = Math.max(...shapeFrets);
      const shapeRange = shapeMax - shapeMin;
      expect(combinedRange).toBeGreaterThan(shapeRange);
    }
  });

  it('5 shapes combined cover a wider fret range than any single shape (scale)', () => {
    const allFrets: number[] = [];
    const singleShapeFrets: number[][] = [];

    for (const shape of ['C', 'A', 'G', 'E', 'D']) {
      const { scale } = getCAGEDPositions(shape, 'C', 'major');
      const frets = scale.map(p => p.fret);
      singleShapeFrets.push(frets);
      allFrets.push(...frets);
    }

    const combinedMin = Math.min(...allFrets);
    const combinedMax = Math.max(...allFrets);
    const combinedRange = combinedMax - combinedMin;

    for (const shapeFrets of singleShapeFrets) {
      const shapeMin = Math.min(...shapeFrets);
      const shapeMax = Math.max(...shapeFrets);
      const shapeRange = shapeMax - shapeMin;
      expect(combinedRange).toBeGreaterThan(shapeRange);
    }
  });

  it('works for minor scale type', () => {
    const allFrets: number[] = [];
    for (const shape of ['C', 'A', 'G', 'E', 'D']) {
      const { chord, scale } = getCAGEDPositions(shape, 'A', 'minor');
      expect(chord.length).toBeGreaterThan(0);
      expect(scale.length).toBeGreaterThan(0);
      allFrets.push(...scale.map(p => p.fret));
    }

    const range = Math.max(...allFrets) - Math.min(...allFrets);
    expect(range).toBeGreaterThanOrEqual(8);
  });

  it('shapes produce distinct position sets', () => {
    const serialized: string[] = [];
    for (const shape of ['C', 'A', 'G', 'E', 'D']) {
      const { chord } = getCAGEDPositions(shape, 'C', 'major');
      const key = chord
        .map(p => `${p.string}-${p.fret}`)
        .sort()
        .join('|');
      serialized.push(key);
    }

    const unique = new Set(serialized);
    expect(unique.size).toBe(5);
  });

  it('transposing to different keys shifts fret positions', () => {
    const cInC = getCAGEDPositions('E', 'C', 'major');
    const cInD = getCAGEDPositions('E', 'D', 'major');

    // D is 2 semitones above C, so all frets should shift by +2
    const cFrets = cInC.chord.map(p => p.fret).sort((a, b) => a - b);
    const dFrets = cInD.chord.map(p => p.fret).sort((a, b) => a - b);

    expect(cFrets.length).toBe(dFrets.length);
    for (let i = 0; i < cFrets.length; i++) {
      expect(dFrets[i]).toBe(cFrets[i] + 2);
    }
  });
});
