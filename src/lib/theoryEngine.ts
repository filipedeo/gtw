import { Note, Scale, Chord, Interval, Key } from 'tonal';

// Note utilities
export function transposeNote(note: string, interval: string): string {
  return Note.transpose(note, interval);
}

export function getNoteFromMidi(midi: number): string {
  return Note.fromMidi(midi);
}

export function getMidiFromNote(note: string): number | null {
  return Note.midi(note);
}

// Scale utilities
export function getScaleNotes(root: string, scaleName: string): string[] {
  return Scale.get(`${root} ${scaleName}`).notes;
}

// Mode utilities
// Note: characteristicDegree uses 0-based array indexing into the scale notes.
// e.g., degree 6 = the 7th scale degree (index 6 in a 0-based array of 7 notes)
// This is the index of the note that gives each mode its distinctive sound.
export const MODES = [
  // === Major Scale Modes (Diatonic) ===
  { name: 'ionian', displayName: 'Ionian (Major)', characteristicNote: 'M7', characteristicDegree: 6, category: 'major' },
  { name: 'dorian', displayName: 'Dorian', characteristicNote: '6', characteristicDegree: 5, category: 'major' },
  { name: 'phrygian', displayName: 'Phrygian', characteristicNote: 'b2', characteristicDegree: 1, category: 'major' },
  { name: 'lydian', displayName: 'Lydian', characteristicNote: '#4', characteristicDegree: 3, category: 'major' },
  { name: 'mixolydian', displayName: 'Mixolydian', characteristicNote: 'b7', characteristicDegree: 6, category: 'major' },
  { name: 'aeolian', displayName: 'Aeolian (Natural Minor)', characteristicNote: 'b6', characteristicDegree: 5, category: 'major' },
  { name: 'locrian', displayName: 'Locrian', characteristicNote: 'b5', characteristicDegree: 4, category: 'major' },
  
  // === Harmonic Minor & Its Modes ===
  { name: 'harmonic minor', displayName: 'Harmonic Minor', characteristicNote: 'M7 + b6', characteristicDegree: 6, category: 'harmonic-minor' },
  { name: 'locrian 6', displayName: 'Locrian #6', characteristicNote: '#6', characteristicDegree: 5, category: 'harmonic-minor' },
  { name: 'ionian #5', displayName: 'Ionian #5', characteristicNote: '#5', characteristicDegree: 4, category: 'harmonic-minor' },
  { name: 'dorian #4', displayName: 'Dorian #4 (Romanian)', characteristicNote: '#4', characteristicDegree: 3, category: 'harmonic-minor' },
  { name: 'phrygian dominant', displayName: 'Phrygian Dominant', characteristicNote: 'M3 + b2', characteristicDegree: 2, category: 'harmonic-minor' },
  { name: 'lydian #9', displayName: 'Lydian #9 (Lydian #2)', characteristicNote: '#2', characteristicDegree: 1, category: 'harmonic-minor' },
  { name: 'ultralocrian', displayName: 'Ultralocrian (dim7)', characteristicNote: 'bb7', characteristicDegree: 6, category: 'harmonic-minor' },
  
  // === Melodic Minor & Its Modes ===
  { name: 'melodic minor', displayName: 'Melodic Minor', characteristicNote: 'M6 & M7', characteristicDegree: 5, category: 'melodic-minor' },
  { name: 'dorian b2', displayName: 'Dorian b2 (Phrygian #6)', characteristicNote: 'b2 + M6', characteristicDegree: 1, category: 'melodic-minor' },
  { name: 'lydian augmented', displayName: 'Lydian Augmented', characteristicNote: '#4 + #5', characteristicDegree: 4, category: 'melodic-minor' },
  { name: 'lydian dominant', displayName: 'Lydian Dominant', characteristicNote: '#4 + b7', characteristicDegree: 3, category: 'melodic-minor' },
  { name: 'mixolydian b6', displayName: 'Mixolydian b6 (Hindu)', characteristicNote: 'b6 + b7', characteristicDegree: 5, category: 'melodic-minor' },
  { name: 'locrian #2', displayName: 'Locrian #2 (Half-Diminished)', characteristicNote: 'M2 + b5', characteristicDegree: 1, category: 'melodic-minor' },
  { name: 'altered', displayName: 'Altered (Super Locrian)', characteristicNote: 'b2 b3 b4 b5 b6 b7', characteristicDegree: 3, category: 'melodic-minor' },
  
  // === Symmetric Scales ===
  { name: 'whole tone', displayName: 'Whole Tone', characteristicNote: 'all whole steps', characteristicDegree: 2, category: 'symmetric' },
  { name: 'diminished', displayName: 'Diminished (Half-Whole)', characteristicNote: 'H-W pattern', characteristicDegree: 1, category: 'symmetric' },
  { name: 'whole-half diminished', displayName: 'Diminished (Whole-Half)', characteristicNote: 'W-H pattern', characteristicDegree: 1, category: 'symmetric' },
  
  // === Other Scales ===
  { name: 'blues', displayName: 'Blues', characteristicNote: 'b5 (blue note)', characteristicDegree: 3, category: 'other' },
];

/** Get modes filtered by category */
export function getModesByCategory(category: string) {
  return MODES.filter(m => m.category === category);
}

export function getModeNotes(root: string, modeName: string): string[] {
  return Scale.get(`${root} ${modeName}`).notes;
}

// Chord utilities
export function getChordNotes(chordName: string): string[] {
  return Chord.get(chordName).notes;
}

export function getChordInfo(chordName: string) {
  return Chord.get(chordName);
}

export function detectChord(notes: string[]): string[] {
  return Chord.detect(notes);
}

// Interval utilities
export function getInterval(note1: string, note2: string): string {
  return Interval.distance(note1, note2);
}

export function getIntervalSemitones(interval: string): number {
  return Interval.semitones(interval) || 0;
}

// Key utilities
export function getKeyChords(keyName: string): string[] {
  const key = Key.majorKey(keyName);
  return [...key.chords];
}

// Note name utilities
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
/** Flat note names for display in flat-key contexts */
export const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function simplifyNoteName(note: string): string {
  const simplified = Note.simplify(note);
  return simplified || note;
}

export function enharmonicNote(note: string): string {
  return Note.enharmonic(note);
}

// Chord progression utilities

export interface Progression {
  numerals: string[];           // ["I", "V", "vi", "IV"]
  degrees: (number | string)[]; // [1, 5, 6, 4] — string for borrowed ("b7", "4m")
  name?: string;                // e.g. "Axis of Awesome"
}

/** Quality (semitone intervals from root) for each diatonic degree in a major key */
const DEGREE_INTERVALS: Record<number, number[]> = {
  1: [0, 4, 7],  // major
  2: [0, 3, 7],  // minor
  3: [0, 3, 7],  // minor
  4: [0, 4, 7],  // major
  5: [0, 4, 7],  // major
  6: [0, 3, 7],  // minor
  7: [0, 3, 6],  // diminished
};

/** Semitone offsets of each scale degree from the tonic (index 0 unused, 1-7) */
const MAJOR_SCALE_SEMITONES = [0, 0, 2, 4, 5, 7, 9, 11];

export function buildProgressionChords(
  key: string,
  degrees: (number | string)[]
): Array<{ root: string; intervals: number[] }> {
  const rootIndex = NOTE_NAMES.indexOf(key) !== -1
    ? NOTE_NAMES.indexOf(key)
    : NOTE_NAMES_FLAT.indexOf(key);

  return degrees.map((degree) => {
    if (typeof degree === 'number') {
      // Diatonic degree 1-7
      const semitoneOffset = MAJOR_SCALE_SEMITONES[degree];
      const noteIndex = (rootIndex + semitoneOffset) % 12;
      return { root: NOTE_NAMES[noteIndex], intervals: DEGREE_INTERVALS[degree] };
    }
    // Borrowed/altered chords:
    // "b7" = flat 7th major (bVII from Mixolydian/parallel minor)
    // "4m" = 4th minor (iv borrowed from parallel minor)
    // "5M" = 5th major (V dominant in minor key - raised 3rd)
    // "1m" = 1st minor (i in minor key)
    if (degree === 'b7') {
      const noteIndex = (rootIndex + 10) % 12;
      return { root: NOTE_NAMES[noteIndex], intervals: [0, 4, 7] };
    }
    if (degree === '4m') {
      const noteIndex = (rootIndex + 5) % 12;
      return { root: NOTE_NAMES[noteIndex], intervals: [0, 3, 7] };
    }
    if (degree === '5M') {
      // Dominant V chord (major) - used in minor keys for stronger resolution
      const noteIndex = (rootIndex + 7) % 12;
      return { root: NOTE_NAMES[noteIndex], intervals: [0, 4, 7] };
    }
    if (degree === '1m') {
      // Minor tonic
      return { root: NOTE_NAMES[rootIndex], intervals: [0, 3, 7] };
    }
    // Fallback: treat as degree 1
    return { root: NOTE_NAMES[rootIndex], intervals: [0, 4, 7] };
  });
}