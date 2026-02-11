import { Note, Scale, Chord, Interval, Key } from 'tonal';

// Note utilities
export function getNoteInfo(noteName: string) {
  return Note.get(noteName);
}

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

export function getScaleInfo(root: string, scaleName: string) {
  return Scale.get(`${root} ${scaleName}`);
}

export function getAllScaleNames(): string[] {
  return Scale.names();
}

// Mode utilities
export const MODES = [
  { name: 'ionian', displayName: 'Ionian (Major)', characteristicNote: 'M7' },
  { name: 'dorian', displayName: 'Dorian', characteristicNote: '6' },
  { name: 'phrygian', displayName: 'Phrygian', characteristicNote: 'b2' },
  { name: 'lydian', displayName: 'Lydian', characteristicNote: '#4' },
  { name: 'mixolydian', displayName: 'Mixolydian', characteristicNote: 'b7' },
  { name: 'aeolian', displayName: 'Aeolian (Natural Minor)', characteristicNote: 'b6' },
  { name: 'locrian', displayName: 'Locrian', characteristicNote: 'b5' },
];

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

export function getAllChordNames(): string[] {
  // Return common chord types
  return [
    'maj', 'min', 'dim', 'aug', '7', 'maj7', 'min7', 'dim7',
    'sus2', 'sus4', 'add9', '6', 'min6', '9', 'maj9', 'min9',
    '11', '13', 'maj13', 'min11', '7sus4', '7b5', '7#5'
  ];
}

// Interval utilities
export function getInterval(note1: string, note2: string): string {
  return Interval.distance(note1, note2);
}

export function getIntervalSemitones(interval: string): number {
  return Interval.semitones(interval) || 0;
}

export function getAllIntervals(): string[] {
  return ['1P', 'm2', 'M2', 'm3', 'M3', '4P', 'A4', '5P', 'm6', 'M6', 'm7', 'M7', '8P'];
}

export const INTERVAL_NAMES: Record<string, string> = {
  '1P': 'Unison',
  'm2': 'Minor 2nd',
  'M2': 'Major 2nd',
  'm3': 'Minor 3rd',
  'M3': 'Major 3rd',
  '4P': 'Perfect 4th',
  'A4': 'Tritone',
  'd5': 'Tritone',
  '5P': 'Perfect 5th',
  'm6': 'Minor 6th',
  'M6': 'Major 6th',
  'm7': 'Minor 7th',
  'M7': 'Major 7th',
  '8P': 'Octave',
};

// Key utilities
export function getKeyInfo(keyName: string) {
  return Key.majorKey(keyName);
}

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
    // Borrowed chords: "b7" = flat 7th major, "4m" = 4th minor
    if (degree === 'b7') {
      const noteIndex = (rootIndex + 10) % 12;
      return { root: NOTE_NAMES[noteIndex], intervals: [0, 4, 7] };
    }
    if (degree === '4m') {
      const noteIndex = (rootIndex + 5) % 12;
      return { root: NOTE_NAMES[noteIndex], intervals: [0, 3, 7] };
    }
    // Fallback: treat as degree 1
    return { root: NOTE_NAMES[rootIndex], intervals: [0, 4, 7] };
  });
}