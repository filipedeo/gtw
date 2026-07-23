import { describe, it, expect } from 'vitest';
import {
  CIRCLE_OF_FIFTHS,
  ORDER_OF_SHARPS,
  ORDER_OF_FLATS,
  getKeyByMajor,
  getKeyByMinor,
  getAccidentalNotes,
  keySignatureLabel,
  relativeMinorOf,
  relativeMajorOf,
  neighborKey,
} from '../lib/circleOfFifths';

describe('circle of fifths data', () => {
  it('contains the 15 standard keys, one per position -7..+7', () => {
    expect(CIRCLE_OF_FIFTHS).toHaveLength(15);
    const positions = CIRCLE_OF_FIFTHS.map((k) => k.position).sort((a, b) => a - b);
    expect(positions).toEqual([-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('has unique major tonics and relative minors', () => {
    const majors = new Set(CIRCLE_OF_FIFTHS.map((k) => k.major));
    const minors = new Set(CIRCLE_OF_FIFTHS.map((k) => k.relativeMinor));
    expect(majors.size).toBe(15);
    expect(minors.size).toBe(15);
  });

  it('accidental count equals abs(position) and matches type direction', () => {
    for (const k of CIRCLE_OF_FIFTHS) {
      expect(k.accidentals).toBe(Math.abs(k.position));
      if (k.position === 0) expect(k.type).toBe('none');
      else if (k.position > 0) expect(k.type).toBe('sharp');
      else expect(k.type).toBe('flat');
    }
  });
});

describe('getAccidentalNotes', () => {
  it('returns the sharps in order for sharp keys', () => {
    expect(getAccidentalNotes('C')).toEqual([]);
    expect(getAccidentalNotes('G')).toEqual(['F#']);
    expect(getAccidentalNotes('D')).toEqual(['F#', 'C#']);
    expect(getAccidentalNotes('A')).toEqual(['F#', 'C#', 'G#']);
    expect(getAccidentalNotes('C#')).toEqual([...ORDER_OF_SHARPS]);
  });

  it('returns the flats in order for flat keys', () => {
    expect(getAccidentalNotes('F')).toEqual(['Bb']);
    expect(getAccidentalNotes('Bb')).toEqual(['Bb', 'Eb']);
    expect(getAccidentalNotes('Eb')).toEqual(['Bb', 'Eb', 'Ab']);
    expect(getAccidentalNotes('Cb')).toEqual([...ORDER_OF_FLATS]);
  });

  it('returns [] for an unknown key', () => {
    expect(getAccidentalNotes('H')).toEqual([]);
  });
});

describe('keySignatureLabel', () => {
  it('formats singular, plural, and none correctly', () => {
    expect(keySignatureLabel('C')).toBe('no sharps or flats');
    expect(keySignatureLabel('G')).toBe('1 sharp');
    expect(keySignatureLabel('D')).toBe('2 sharps');
    expect(keySignatureLabel('F')).toBe('1 flat');
    expect(keySignatureLabel('Eb')).toBe('3 flats');
  });
});

describe('relative key helpers', () => {
  it('maps majors to their relative minor', () => {
    expect(relativeMinorOf('C')).toBe('Am');
    expect(relativeMinorOf('G')).toBe('Em');
    expect(relativeMinorOf('Eb')).toBe('Cm');
    expect(relativeMinorOf('A')).toBe('F#m');
  });

  it('maps minors back to their relative major (accepts "Am" or "A")', () => {
    expect(relativeMajorOf('Am')).toBe('C');
    expect(relativeMajorOf('A')).toBe('C');
    expect(relativeMajorOf('Em')).toBe('G');
    expect(relativeMajorOf('Cm')).toBe('Eb');
  });

  it('relativeMajorOf is the inverse of relativeMinorOf for every key', () => {
    for (const k of CIRCLE_OF_FIFTHS) {
      const minor = relativeMinorOf(k.major)!;
      expect(relativeMajorOf(minor)).toBe(k.major);
    }
  });

  it('getKeyByMinor tolerates the trailing m', () => {
    expect(getKeyByMinor('Em')?.major).toBe('G');
    expect(getKeyByMinor('E')?.major).toBe('G');
  });
});

describe('neighborKey', () => {
  it('moves up a fifth clockwise (adds a sharp)', () => {
    expect(neighborKey('C', 'clockwise')).toBe('G');
    expect(neighborKey('G', 'clockwise')).toBe('D');
    expect(neighborKey('F', 'clockwise')).toBe('C');
  });

  it('moves down a fifth counter-clockwise (adds a flat)', () => {
    expect(neighborKey('C', 'counterclockwise')).toBe('F');
    expect(neighborKey('D', 'counterclockwise')).toBe('G');
    expect(neighborKey('Bb', 'counterclockwise')).toBe('Eb');
  });

  it('returns undefined past the ends of the circle', () => {
    expect(neighborKey('C#', 'clockwise')).toBeUndefined();
    expect(neighborKey('Cb', 'counterclockwise')).toBeUndefined();
  });

  it('getKeyByMajor returns undefined for unknown keys', () => {
    expect(getKeyByMajor('H')).toBeUndefined();
  });
});
