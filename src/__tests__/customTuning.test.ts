import { describe, it, expect } from 'vitest';
import {
  STANDARD_TUNINGS,
  CUSTOM_TUNING_NAME,
  makeCustomTuning,
  findStandardTuningKey,
} from '../types/guitar';
import { getNoteAtPosition } from '../utils/fretboardCalculations';
import { Note } from 'tonal';

describe('Alternate tunings (A-7)', () => {
  it('registers DADGAD as a 6-string guitar tuning', () => {
    const t = STANDARD_TUNINGS['dadgad-6'];
    expect(t).toBeDefined();
    expect(t.notes).toEqual(['D2', 'A2', 'D3', 'G3', 'A3', 'D4']);
    expect(t.notes).toHaveLength(6);
  });

  it('registers Open G as a 6-string guitar tuning', () => {
    const t = STANDARD_TUNINGS['open-g-6'];
    expect(t).toBeDefined();
    expect(t.notes).toEqual(['D2', 'G2', 'D3', 'G3', 'B3', 'D4']);
    expect(t.notes).toHaveLength(6);
  });

  it('new tunings match the 6-string guitar selector filter', () => {
    for (const key of ['dadgad-6', 'open-g-6']) {
      expect(key.includes('-6')).toBe(true);
      expect(key.startsWith('bass-')).toBe(false);
    }
  });

  it('computes correct open + fretted notes for DADGAD', () => {
    const t = STANDARD_TUNINGS['dadgad-6'];
    // Open strings (fret 0) return the tuning note verbatim.
    expect(getNoteAtPosition({ string: 0, fret: 0 }, t, 6)).toBe('D2');
    expect(getNoteAtPosition({ string: 5, fret: 0 }, t, 6)).toBe('D4');
    // Fretted notes add semitones: low D + 2 = E2, + 5 = G2.
    expect(getNoteAtPosition({ string: 0, fret: 2 }, t, 6)).toBe('E2');
    expect(getNoteAtPosition({ string: 0, fret: 5 }, t, 6)).toBe('G2');
    // 2nd string (A2) + 3 semitones = C3.
    expect(getNoteAtPosition({ string: 1, fret: 3 }, t, 6)).toBe('C3');
  });
});

describe('Custom tuning helpers (A-7)', () => {
  it('makeCustomTuning names the tuning Custom and copies notes', () => {
    const notes = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
    const t = makeCustomTuning(notes);
    expect(t.name).toBe(CUSTOM_TUNING_NAME);
    expect(t.notes).toEqual(notes);
    // Must be a copy, not the same reference (edits shouldn't mutate the source).
    expect(t.notes).not.toBe(notes);
  });

  it('findStandardTuningKey resolves standard tunings and rejects custom ones', () => {
    expect(findStandardTuningKey(STANDARD_TUNINGS['standard-6'])).toBe('standard-6');
    expect(findStandardTuningKey(STANDARD_TUNINGS['dadgad-6'])).toBe('dadgad-6');
    expect(findStandardTuningKey(STANDARD_TUNINGS['open-g-6'])).toBe('open-g-6');
    expect(findStandardTuningKey(makeCustomTuning(['C2', 'G2', 'C3', 'G3', 'C4', 'E4']))).toBeUndefined();
  });

  it('computes correct notes for an arbitrary custom tuning', () => {
    // Open C tuning: C-G-C-G-C-E
    const t = makeCustomTuning(['C2', 'G2', 'C3', 'G3', 'C4', 'E4']);
    expect(getNoteAtPosition({ string: 0, fret: 0 }, t, 6)).toBe('C2');
    expect(getNoteAtPosition({ string: 0, fret: 12 }, t, 6)).toBe('C3');
    expect(getNoteAtPosition({ string: 5, fret: 1 }, t, 6)).toBe('F4');
  });
});

describe('Additional alternate tunings (Open D, Eb standard, 8-string)', () => {
  it('registers Open D and derives correct open + fretted notes', () => {
    const t = STANDARD_TUNINGS['open-d-6'];
    expect(t).toBeDefined();
    expect(t.notes).toEqual(['D2', 'A2', 'D3', 'F#3', 'A3', 'D4']);
    expect(t.notes).toHaveLength(6);
    // Open strings return verbatim.
    expect(getNoteAtPosition({ string: 0, fret: 0 }, t, 6)).toBe('D2');
    expect(getNoteAtPosition({ string: 5, fret: 0 }, t, 6)).toBe('D4');
    // 3rd string is F#3; +3 semitones = A3.
    expect(getNoteAtPosition({ string: 3, fret: 3 }, t, 6)).toBe('A3');
    // Low D + 12 = D3 (octave).
    expect(getNoteAtPosition({ string: 0, fret: 12 }, t, 6)).toBe('D3');
  });

  it('registers Eb standard (half-step down) with flat spelling and derives notes', () => {
    const t = STANDARD_TUNINGS['eb-standard-6'];
    expect(t).toBeDefined();
    expect(t.notes).toEqual(['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4']);
    expect(t.notes).toHaveLength(6);
    // Open strings return the tuning note verbatim (flats preserved).
    expect(getNoteAtPosition({ string: 0, fret: 0 }, t, 6)).toBe('Eb2');
    expect(getNoteAtPosition({ string: 5, fret: 0 }, t, 6)).toBe('Eb4');
    // Every string sits one semitone below standard EADGBE.
    // Eb2 + 1 = E2 (standard low E), Ab2 + 1 = A2, Bb3 + 1 = B3.
    expect(getNoteAtPosition({ string: 0, fret: 1 }, t, 6)).toBe('E2');
    expect(getNoteAtPosition({ string: 1, fret: 1 }, t, 6)).toBe('A2');
    expect(getNoteAtPosition({ string: 4, fret: 1 }, t, 6)).toBe('B3');
  });

  it('registers Standard 8-string and derives notes across all eight strings', () => {
    const t = STANDARD_TUNINGS['standard-8'];
    expect(t).toBeDefined();
    expect(t.notes).toEqual(['F#1', 'B1', 'E2', 'A2', 'D3', 'G3', 'B3', 'E4']);
    expect(t.notes).toHaveLength(8);
    // Low extended strings.
    expect(getNoteAtPosition({ string: 0, fret: 0 }, t, 8)).toBe('F#1');
    expect(getNoteAtPosition({ string: 1, fret: 0 }, t, 8)).toBe('B1');
    // The top six strings mirror standard tuning.
    expect(getNoteAtPosition({ string: 2, fret: 0 }, t, 8)).toBe('E2');
    expect(getNoteAtPosition({ string: 7, fret: 0 }, t, 8)).toBe('E4');
    // Fretted: F#1 + 12 = one octave up (same pitch class). Compare by MIDI so
    // the assertion is robust to enharmonic spelling (tonal may return Gb2).
    expect(Note.midi(getNoteAtPosition({ string: 0, fret: 12 }, t, 8)))
      .toBe(Note.midi('F#2'));
  });

  it('findStandardTuningKey resolves the new presets', () => {
    expect(findStandardTuningKey(STANDARD_TUNINGS['open-d-6'])).toBe('open-d-6');
    expect(findStandardTuningKey(STANDARD_TUNINGS['eb-standard-6'])).toBe('eb-standard-6');
    expect(findStandardTuningKey(STANDARD_TUNINGS['standard-8'])).toBe('standard-8');
  });
});
