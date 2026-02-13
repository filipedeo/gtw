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
// e.g., degree 3 = the 4th scale degree (index 3 in a 0-based array of 7 notes)
// This is the index of the note that gives each mode its distinctive sound.
export interface ModeInfo {
  name: string;
  displayName: string;
  characteristicNote: string;
  characteristicDegree: number;
  category: string;
  formula: string;
  description: string;
}

export const MODES: ModeInfo[] = [
  // === Major Scale Modes (Diatonic) ===
  { name: 'ionian', displayName: 'Ionian (Major)', characteristicNote: 'Perfect 4th (P4)', characteristicDegree: 3, category: 'major',
    formula: '1–2–3–4–5–6–7', description: 'The modern Major scale. Bright, stable, and happy.' },
  { name: 'dorian', displayName: 'Dorian', characteristicNote: 'Major 6th (M6)', characteristicDegree: 5, category: 'major',
    formula: '1–2–b3–4–5–6–b7', description: 'A minor mode used in jazz and folk. Melancholic yet hopeful.' },
  { name: 'phrygian', displayName: 'Phrygian', characteristicNote: 'Minor 2nd (b2)', characteristicDegree: 1, category: 'major',
    formula: '1–b2–b3–4–5–b6–b7', description: 'A dark, exotic minor mode common in Spanish and Flamenco music.' },
  { name: 'lydian', displayName: 'Lydian', characteristicNote: 'Augmented 4th (#4)', characteristicDegree: 3, category: 'major',
    formula: '1–2–3–#4–5–6–7', description: 'A bright, floating, dreamy major mode often used in film scores.' },
  { name: 'mixolydian', displayName: 'Mixolydian', characteristicNote: 'Minor 7th (b7)', characteristicDegree: 6, category: 'major',
    formula: '1–2–3–4–5–6–b7', description: 'A major mode with a bluesy/rock feel. Used by the Grateful Dead and Lynyrd Skynyrd.' },
  { name: 'aeolian', displayName: 'Aeolian (Natural Minor)', characteristicNote: 'Minor 6th (b6)', characteristicDegree: 5, category: 'major',
    formula: '1–2–b3–4–5–b6–b7', description: 'The natural minor scale. Melancholic and sad.' },
  { name: 'locrian', displayName: 'Locrian', characteristicNote: 'Diminished 5th (b5)', characteristicDegree: 4, category: 'major',
    formula: '1–b2–b3–4–b5–b6–b7', description: 'A diminished, highly unstable, and dark mode.' },

  // === Harmonic Minor & Its Modes ===
  { name: 'harmonic minor', displayName: 'Harmonic Minor', characteristicNote: 'Major 7th + Minor 6th', characteristicDegree: 6, category: 'harmonic-minor',
    formula: '1–2–b3–4–5–b6–7', description: 'Minor scale with a raised 7th. Dramatic, Middle-Eastern flavor.' },
  { name: 'locrian 6', displayName: 'Locrian #6', characteristicNote: 'Natural 6th (#6)', characteristicDegree: 5, category: 'harmonic-minor',
    formula: '1–b2–b3–4–b5–6–b7', description: 'Locrian with a raised 6th. Less dark than standard Locrian.' },
  { name: 'ionian #5', displayName: 'Ionian #5', characteristicNote: 'Augmented 5th (#5)', characteristicDegree: 4, category: 'harmonic-minor',
    formula: '1–2–3–4–#5–6–7', description: 'Major scale with an augmented 5th. Mysterious and tense.' },
  { name: 'dorian #4', displayName: 'Dorian #4 (Romanian)', characteristicNote: 'Augmented 4th (#4)', characteristicDegree: 3, category: 'harmonic-minor',
    formula: '1–2–b3–#4–5–6–b7', description: 'Dorian with a raised 4th. Used in Romanian and Klezmer music.' },
  { name: 'phrygian dominant', displayName: 'Phrygian Dominant', characteristicNote: 'Major 3rd + Minor 2nd', characteristicDegree: 2, category: 'harmonic-minor',
    formula: '1–b2–3–4–5–b6–b7', description: 'Phrygian with a major 3rd. Quintessential Middle-Eastern/Spanish sound.' },
  { name: 'lydian #9', displayName: 'Lydian #9 (Lydian #2)', characteristicNote: 'Augmented 2nd (#2)', characteristicDegree: 1, category: 'harmonic-minor',
    formula: '1–#2–3–#4–5–6–7', description: 'Lydian with a raised 2nd. Exotic and bright.' },
  { name: 'ultralocrian', displayName: 'Ultralocrian (dim7)', characteristicNote: 'Diminished 7th (bb7)', characteristicDegree: 6, category: 'harmonic-minor',
    formula: '1–b2–b3–b4–b5–b6–bb7', description: 'The darkest mode. Fully diminished quality.' },

  // === Melodic Minor & Its Modes ===
  { name: 'melodic minor', displayName: 'Melodic Minor', characteristicNote: 'Major 6th + Major 7th', characteristicDegree: 5, category: 'melodic-minor',
    formula: '1–2–b3–4–5–6–7', description: 'Minor scale with raised 6th and 7th. Jazz minor. Smooth and sophisticated.' },
  { name: 'dorian b2', displayName: 'Dorian b2 (Phrygian #6)', characteristicNote: 'Minor 2nd + Major 6th', characteristicDegree: 1, category: 'melodic-minor',
    formula: '1–b2–b3–4–5–6–b7', description: 'Dorian with a lowered 2nd. Used over sus(b9) chords.' },
  { name: 'lydian augmented', displayName: 'Lydian Augmented', characteristicNote: '#4 + #5', characteristicDegree: 4, category: 'melodic-minor',
    formula: '1–2–3–#4–#5–6–7', description: 'Lydian with an augmented 5th. Ethereal and expansive.' },
  { name: 'lydian dominant', displayName: 'Lydian Dominant', characteristicNote: '#4 + b7', characteristicDegree: 3, category: 'melodic-minor',
    formula: '1–2–3–#4–5–6–b7', description: 'Lydian with a flat 7th. The "Simpsons theme" sound. Over dominant 7#11 chords.' },
  { name: 'mixolydian b6', displayName: 'Mixolydian b6 (Hindu)', characteristicNote: 'Minor 6th + Minor 7th', characteristicDegree: 5, category: 'melodic-minor',
    formula: '1–2–3–4–5–b6–b7', description: 'Mixolydian with a flat 6th. Bittersweet and dramatic.' },
  { name: 'locrian #2', displayName: 'Locrian #2 (Half-Diminished)', characteristicNote: 'Major 2nd + Diminished 5th', characteristicDegree: 1, category: 'melodic-minor',
    formula: '1–2–b3–4–b5–b6–b7', description: 'Locrian with a natural 2nd. Standard choice over half-diminished chords.' },
  { name: 'altered', displayName: 'Altered (Super Locrian)', characteristicNote: 'All altered tensions', characteristicDegree: 3, category: 'melodic-minor',
    formula: '1–b2–b3–b4–b5–b6–b7', description: 'Every note is altered. The go-to scale for altered dominant chords in jazz.' },

  // === Symmetric Scales ===
  { name: 'whole tone', displayName: 'Whole Tone', characteristicNote: 'All whole steps', characteristicDegree: 2, category: 'symmetric',
    formula: '1–2–3–#4–#5–b7', description: 'All whole-step intervals. Dreamy, ambiguous, floating quality.' },
  { name: 'half-whole diminished', displayName: 'Diminished (Half-Whole)', characteristicNote: 'H-W alternating pattern', characteristicDegree: 1, category: 'symmetric',
    formula: '1–b2–b3–3–#4–5–6–b7', description: '8-note scale alternating half and whole steps. Used over diminished chords.' },
  { name: 'diminished', displayName: 'Diminished (Whole-Half)', characteristicNote: 'W-H alternating pattern', characteristicDegree: 1, category: 'symmetric',
    formula: '1–2–b3–4–b5–b6–6–7', description: '8-note scale alternating whole and half steps. Used over dominant 7(b9) chords.' },

  // === Other Scales ===
  { name: 'blues', displayName: 'Blues', characteristicNote: 'Blue note (b5)', characteristicDegree: 3, category: 'other',
    formula: '1–b3–4–b5–5–b7', description: 'Minor pentatonic with an added b5 "blue note". The foundation of blues music.' },
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
    if (degree === '1M') {
      // Major tonic (e.g., V/IV = I as dominant function)
      return { root: NOTE_NAMES[rootIndex], intervals: [0, 4, 7] };
    }
    if (degree === '2dim') {
      // Diminished triad on 2nd degree (e.g., iiø7 in minor ii-V-i)
      const noteIndex = (rootIndex + 2) % 12;
      return { root: NOTE_NAMES[noteIndex], intervals: [0, 3, 6] };
    }
    if (degree === '2M') {
      // Major chord on 2nd degree (e.g., V/V secondary dominant)
      const noteIndex = (rootIndex + 2) % 12;
      return { root: NOTE_NAMES[noteIndex], intervals: [0, 4, 7] };
    }
    if (degree === '3M') {
      // Major chord on 3rd degree (e.g., chromatic III in "Creep")
      const noteIndex = (rootIndex + 4) % 12;
      return { root: NOTE_NAMES[noteIndex], intervals: [0, 4, 7] };
    }
    if (degree === 'b6') {
      // Major chord on flat 6th degree (e.g., bVI in Andalusian cadence)
      const noteIndex = (rootIndex + 8) % 12;
      return { root: NOTE_NAMES[noteIndex], intervals: [0, 4, 7] };
    }
    if (degree === '6M') {
      // Major chord on 6th degree (e.g., V/ii secondary dominant)
      const noteIndex = (rootIndex + 9) % 12;
      return { root: NOTE_NAMES[noteIndex], intervals: [0, 4, 7] };
    }
    // Fallback: treat as degree 1
    return { root: NOTE_NAMES[rootIndex], intervals: [0, 4, 7] };
  });
}