export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export type Note = {
  name: string;
  octave: number;
  midi?: number;
};

export type FretPosition = {
  string: number;
  fret: number;
  note?: Note;
};

export type Tuning = {
  name: string;
  notes: string[]; // e.g., ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
};

export type GuitarConfig = {
  stringCount: 6 | 7;
  tuning: Tuning;
  fretCount: number;
};

export type DisplayMode = 'notes' | 'intervals' | 'degrees';

export type FretboardState = {
  highlightedPositions: FretPosition[];
  rootNote: Note | null;
  displayMode: DisplayMode;
  showAllNotes: boolean;
};

// Standard tunings
export const STANDARD_TUNINGS: Record<string, Tuning> = {
  'standard-6': {
    name: 'Standard 6-String',
    notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
  },
  'standard-7': {
    name: 'Standard 7-String',
    notes: ['B1', 'E2', 'A2', 'D3', 'G3', 'B3', 'E4']
  },
  'drop-d-6': {
    name: 'Drop D 6-String',
    notes: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4']
  },
  'drop-a-7': {
    name: 'Drop A 7-String',
    notes: ['A1', 'E2', 'A2', 'D3', 'G3', 'B3', 'E4']
  }
};

export const NOTE_NAMES: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Map of enharmonic equivalents (flats to sharps)
const ENHARMONIC_MAP: Record<string, NoteName> = {
  'Db': 'C#',
  'Eb': 'D#',
  'Fb': 'E',
  'Gb': 'F#',
  'Ab': 'G#',
  'Bb': 'A#',
  'Cb': 'B',
  'E#': 'F',
  'B#': 'C',
};

/**
 * Normalize a note name to use sharps instead of flats
 * This ensures consistent comparison regardless of enharmonic spelling
 * @param note - Note name (e.g., 'Db', 'C#', 'D')
 * @returns Normalized note name using sharps
 */
export function normalizeNoteName(note: string): NoteName {
  // Remove octave number if present
  const noteName = note.replace(/\d+$/, '');
  
  // Check if it's an enharmonic that needs conversion
  if (noteName in ENHARMONIC_MAP) {
    return ENHARMONIC_MAP[noteName];
  }
  
  // Already in our standard format or natural note
  return noteName as NoteName;
}

/**
 * Check if two notes are enharmonically equivalent
 * @param note1 - First note name
 * @param note2 - Second note name
 * @returns true if notes are the same pitch
 */
export function areNotesEqual(note1: string, note2: string): boolean {
  return normalizeNoteName(note1) === normalizeNoteName(note2);
}