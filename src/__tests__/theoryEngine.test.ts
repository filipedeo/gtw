import { describe, it, expect } from 'vitest';
import {
  transposeNote,
  getNoteFromMidi,
  getMidiFromNote,
  getScaleNotes,
  getModeNotes,
  getChordNotes,
  getChordInfo,
  detectChord,
  getInterval,
  getIntervalSemitones,
  simplifyNoteName,
  enharmonicNote,
  MODES,
  getKeyChords,
} from '../lib/theoryEngine';

// ---------------------------------------------------------------------------
// transposeNote
// ---------------------------------------------------------------------------
describe('transposeNote', () => {
  it('C4 + M3 = E4', () => {
    expect(transposeNote('C4', 'M3')).toBe('E4');
  });

  it('C4 + P5 = G4', () => {
    expect(transposeNote('C4', 'P5')).toBe('G4');
  });

  it('Db4 + P5 = Ab4', () => {
    expect(transposeNote('Db4', 'P5')).toBe('Ab4');
  });

  it('B3 + m2 = C4 (wrapping)', () => {
    expect(transposeNote('B3', 'm2')).toBe('C4');
  });

  it('G4 + M3 = B4', () => {
    expect(transposeNote('G4', 'M3')).toBe('B4');
  });

  it('A4 + P8 = A5 (octave)', () => {
    expect(transposeNote('A4', 'P8')).toBe('A5');
  });
});

// ---------------------------------------------------------------------------
// getNoteFromMidi / getMidiFromNote
// ---------------------------------------------------------------------------
describe('getNoteFromMidi / getMidiFromNote', () => {
  it('C4 = MIDI 60', () => {
    expect(getMidiFromNote('C4')).toBe(60);
  });

  it('A4 = MIDI 69', () => {
    expect(getMidiFromNote('A4')).toBe(69);
  });

  it('MIDI 60 round-trips back to C4', () => {
    const note = getNoteFromMidi(60);
    expect(getMidiFromNote(note)).toBe(60);
  });

  it('MIDI 69 round-trips back to A4', () => {
    const note = getNoteFromMidi(69);
    expect(getMidiFromNote(note)).toBe(69);
  });

  it('MIDI 0 produces a valid note', () => {
    const note = getNoteFromMidi(0);
    expect(note).toBeTruthy();
  });

  it('MIDI 127 produces a valid note', () => {
    const note = getNoteFromMidi(127);
    expect(note).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// getScaleNotes
// ---------------------------------------------------------------------------
describe('getScaleNotes', () => {
  it('C major has 7 notes: C D E F G A B', () => {
    const notes = getScaleNotes('C', 'major');
    expect(notes).toHaveLength(7);
    expect(notes).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  });

  it('A minor pentatonic has 5 notes', () => {
    const notes = getScaleNotes('A', 'minor pentatonic');
    expect(notes).toHaveLength(5);
  });

  it('D dorian has 7 notes', () => {
    const notes = getScaleNotes('D', 'dorian');
    expect(notes).toHaveLength(7);
  });

  it('G major starts with G', () => {
    const notes = getScaleNotes('G', 'major');
    expect(notes[0]).toBe('G');
  });

  it('C minor pentatonic contains C, Eb, F, G, Bb', () => {
    const notes = getScaleNotes('C', 'minor pentatonic');
    expect(notes).toHaveLength(5);
    // Check that the pitch classes match
    const expected = ['C', 'Eb', 'F', 'G', 'Bb'];
    expect(notes).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// getModeNotes
// ---------------------------------------------------------------------------
describe('getModeNotes', () => {
  it('C ionian = C major scale', () => {
    const ionian = getModeNotes('C', 'ionian');
    const major = getScaleNotes('C', 'major');
    expect(ionian).toEqual(major);
  });

  it('all 7 diatonic modes from C have 7 notes', () => {
    const diatonicModes = MODES.slice(0, 7);
    for (const mode of diatonicModes) {
      const notes = getModeNotes('C', mode.name);
      expect(notes).toHaveLength(7);
    }
  });

  it('harmonic minor and melodic minor have 7 notes, blues has 6', () => {
    expect(getModeNotes('C', 'harmonic minor')).toHaveLength(7);
    expect(getModeNotes('C', 'melodic minor')).toHaveLength(7);
    expect(getModeNotes('C', 'blues')).toHaveLength(6);
  });

  it('C dorian contains Eb and A (b3 and natural 6)', () => {
    const notes = getModeNotes('C', 'dorian');
    expect(notes).toContain('Eb');
    expect(notes).toContain('A');
  });

  it('C phrygian contains Db (b2)', () => {
    const notes = getModeNotes('C', 'phrygian');
    expect(notes).toContain('Db');
  });

  it('C lydian contains F# (#4)', () => {
    const notes = getModeNotes('C', 'lydian');
    expect(notes).toContain('F#');
  });

  it('C mixolydian contains Bb (b7)', () => {
    const notes = getModeNotes('C', 'mixolydian');
    expect(notes).toContain('Bb');
  });

  it('C aeolian contains Ab (b6)', () => {
    const notes = getModeNotes('C', 'aeolian');
    expect(notes).toContain('Ab');
  });

  it('C locrian contains Db and Gb (b2 and b5)', () => {
    const notes = getModeNotes('C', 'locrian');
    expect(notes).toContain('Db');
    expect(notes).toContain('Gb');
  });

  it('C harmonic minor has raised 7th (B) vs aeolian (Bb)', () => {
    const harmonicMinor = getModeNotes('C', 'harmonic minor');
    const aeolian = getModeNotes('C', 'aeolian');
    expect(harmonicMinor).toHaveLength(7);
    // Harmonic minor has B (raised 7th), aeolian has Bb
    expect(harmonicMinor).toContain('B');
    expect(aeolian).toContain('Bb');
    expect(aeolian).not.toContain('B');
    // Both share the b6 (Ab)
    expect(harmonicMinor).toContain('Ab');
    expect(aeolian).toContain('Ab');
  });

  it('C melodic minor has raised 6th (A) and raised 7th (B) vs aeolian', () => {
    const melodicMinor = getModeNotes('C', 'melodic minor');
    const aeolian = getModeNotes('C', 'aeolian');
    expect(melodicMinor).toHaveLength(7);
    // Melodic minor has A (raised 6th) and B (raised 7th)
    expect(melodicMinor).toContain('A');
    expect(melodicMinor).toContain('B');
    // Aeolian has Ab and Bb
    expect(aeolian).toContain('Ab');
    expect(aeolian).toContain('Bb');
    // Both share the b3 (Eb)
    expect(melodicMinor).toContain('Eb');
    expect(aeolian).toContain('Eb');
  });
});

// ---------------------------------------------------------------------------
// getChordNotes / getChordInfo
// ---------------------------------------------------------------------------
describe('getChordNotes / getChordInfo', () => {
  it('Cmaj has notes C, E, G', () => {
    const notes = getChordNotes('Cmaj');
    expect(notes).toEqual(['C', 'E', 'G']);
  });

  it('Am has notes A, C, E', () => {
    const notes = getChordNotes('Am');
    expect(notes).toEqual(['A', 'C', 'E']);
  });

  it('G7 has 4 notes', () => {
    const notes = getChordNotes('G7');
    expect(notes).toHaveLength(4);
  });

  it('Bdim has notes B, D, F', () => {
    const notes = getChordNotes('Bdim');
    expect(notes).toEqual(['B', 'D', 'F']);
  });

  it('getChordInfo returns name and intervals', () => {
    const info = getChordInfo('Cmaj');
    expect(info.name).toBe('C major');
    expect(info.intervals).toEqual(['1P', '3M', '5P']);
  });
});

// ---------------------------------------------------------------------------
// detectChord
// ---------------------------------------------------------------------------
describe('detectChord', () => {
  it('C, E, G detected as C major', () => {
    const results = detectChord(['C', 'E', 'G']);
    expect(results[0]).toBe('CM');
  });

  it('A, C, E detected as Am', () => {
    const results = detectChord(['A', 'C', 'E']);
    expect(results[0]).toBe('Am');
  });
});

// ---------------------------------------------------------------------------
// getInterval / getIntervalSemitones
// ---------------------------------------------------------------------------
describe('getInterval / getIntervalSemitones', () => {
  it('C to E = 3M', () => {
    expect(getInterval('C', 'E')).toBe('3M');
  });

  it('C to G = 5P', () => {
    expect(getInterval('C', 'G')).toBe('5P');
  });

  it('C to Eb = 3m', () => {
    expect(getInterval('C', 'Eb')).toBe('3m');
  });

  it('M3 = 4 semitones', () => {
    expect(getIntervalSemitones('M3')).toBe(4);
  });

  it('P5 = 7 semitones', () => {
    expect(getIntervalSemitones('P5')).toBe(7);
  });

  it('m3 = 3 semitones', () => {
    expect(getIntervalSemitones('m3')).toBe(3);
  });

  it('P8 = 12 semitones', () => {
    expect(getIntervalSemitones('P8')).toBe(12);
  });

  it('m2 = 1 semitone', () => {
    expect(getIntervalSemitones('m2')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// simplifyNoteName / enharmonicNote
// ---------------------------------------------------------------------------
describe('simplifyNoteName / enharmonicNote', () => {
  it('Dbb simplifies to C', () => {
    expect(simplifyNoteName('Dbb')).toBe('C');
  });

  it('E# simplifies to F', () => {
    expect(simplifyNoteName('E#')).toBe('F');
  });

  it('B# simplifies to C', () => {
    expect(simplifyNoteName('B#')).toBe('C');
  });

  it('Cb simplifies to B', () => {
    expect(simplifyNoteName('Cb')).toBe('B');
  });

  it('C# enharmonic is Db', () => {
    expect(enharmonicNote('C#')).toBe('Db');
  });

  it('Db enharmonic is C#', () => {
    expect(enharmonicNote('Db')).toBe('C#');
  });

  it('F# enharmonic is Gb', () => {
    expect(enharmonicNote('F#')).toBe('Gb');
  });
});

// ---------------------------------------------------------------------------
// MODES constant
// ---------------------------------------------------------------------------
describe('MODES constant', () => {
  it('has 25 entries (7 diatonic + 7 harmonic minor + 7 melodic minor + 3 symmetric + 1 other)', () => {
    expect(MODES).toHaveLength(25);
  });

  it('first mode is ionian', () => {
    expect(MODES[0].name).toBe('ionian');
  });

  it('last mode is locrian', () => {
    expect(MODES[6].name).toBe('locrian');
  });

  it('dorian has characteristic note 6', () => {
    const dorian = MODES.find(m => m.name === 'dorian');
    expect(dorian?.characteristicNote).toBe('6');
  });

  it('phrygian has characteristic note b2', () => {
    const phrygian = MODES.find(m => m.name === 'phrygian');
    expect(phrygian?.characteristicNote).toBe('b2');
  });

  it('lydian has characteristic note #4', () => {
    const lydian = MODES.find(m => m.name === 'lydian');
    expect(lydian?.characteristicNote).toBe('#4');
  });

  it('mixolydian has characteristic note b7', () => {
    const mixo = MODES.find(m => m.name === 'mixolydian');
    expect(mixo?.characteristicNote).toBe('b7');
  });

  it('aeolian has characteristic note b6', () => {
    const aeolian = MODES.find(m => m.name === 'aeolian');
    expect(aeolian?.characteristicNote).toBe('b6');
  });

  it('locrian has characteristic note b5', () => {
    const locrian = MODES.find(m => m.name === 'locrian');
    expect(locrian?.characteristicNote).toBe('b5');
  });

  it('each mode has name, displayName, and characteristicNote', () => {
    for (const mode of MODES) {
      expect(mode.name).toBeTruthy();
      expect(mode.displayName).toBeTruthy();
      expect(mode.characteristicNote).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// getKeyChords
// ---------------------------------------------------------------------------
describe('getKeyChords', () => {
  it('C major has 7 diatonic chords', () => {
    const chords = getKeyChords('C');
    expect(chords).toHaveLength(7);
  });

  it('C major diatonic chords include Cmaj and Am variants', () => {
    const chords = getKeyChords('C');
    const hasC = chords.some(c => c.startsWith('C'));
    const hasAm = chords.some(c => c.startsWith('A'));
    expect(hasC).toBe(true);
    expect(hasAm).toBe(true);
  });

  it('G major has 7 diatonic chords', () => {
    const chords = getKeyChords('G');
    expect(chords).toHaveLength(7);
  });
});
