import { describe, it, expect } from 'vitest';
import { degreeForNote } from '../utils/degreeLabels';

describe('degreeForNote', () => {
  it('labels diatonic degrees relative to the root', () => {
    expect(degreeForNote('C', null, 'C', 'intervals')).toBe('R');
    expect(degreeForNote('C', { root: 'C', name: 'major' }, 'E', 'intervals')).toBe('3');
    expect(degreeForNote('C', { root: 'C', name: 'major' }, 'G', 'intervals')).toBe('5');
  });

  it('uses key-aware spelling, not naive chromatic (Lydian #4, not b5)', () => {
    // Chroma interval 6 is "b5" chromatically, but F# in C Lydian is the #4.
    expect(degreeForNote('C', { root: 'C', name: 'lydian' }, 'F#', 'intervals')).toBe('#4');
  });

  it('labels minor-key colour tones by their flat degree', () => {
    expect(degreeForNote('A', { root: 'A', name: 'minor' }, 'C', 'intervals')).toBe('b3');
    expect(degreeForNote('A', { root: 'A', name: 'minor' }, 'G', 'intervals')).toBe('b7');
  });

  it('degrees mode uses unicode accidentals', () => {
    expect(degreeForNote('C', { root: 'C', name: 'major' }, 'E')).toBe('3');
    expect(degreeForNote('A', { root: 'A', name: 'minor' }, 'C')).toBe('\u266d3'); // ♭3
  });

  it('resolves an enharmonic edge without a degenerate label (F# major leading tone E#)', () => {
    expect(degreeForNote('F#', { root: 'F#', name: 'major' }, 'E#', 'intervals')).toBe('7');
  });

  it('strips octave digits from the note name', () => {
    expect(degreeForNote('C', { root: 'C', name: 'major' }, 'E4', 'intervals')).toBe('3');
    expect(degreeForNote('C', { root: 'C', name: 'major' }, 'G2', 'intervals')).toBe('5');
  });

  it('returns null when the root or note is unresolvable', () => {
    expect(degreeForNote(null, null, 'C')).toBeNull();
    expect(degreeForNote('C', null, 'H')).toBeNull();
  });
});
