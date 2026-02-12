import { FretPosition, Tuning } from '../types/guitar';
import { Note } from 'tonal';

/**
 * Get the note at a specific fret position
 */
export function getNoteAtPosition(
  position: FretPosition, 
  tuning: Tuning, 
  _stringCount: number
): string {
  const { string, fret } = position;
  
  // Get the open string note
  // String index directly maps to tuning array: index 0 = low E (tuning[0]), index 5 = high E (tuning[5])
  // The Fretboard component handles visual row conversion separately
  const openStringNote = tuning.notes[string];
  if (!openStringNote) return '';
  
  // For fret 0, return the open string note
  if (fret === 0) return openStringNote;
  
  // Calculate the note by adding semitones
  const noteInfo = Note.get(openStringNote);
  if (!noteInfo.midi) return '';
  
  const newMidi = noteInfo.midi + fret;
  const newNote = Note.fromMidi(newMidi);
  
  return newNote;
}

/**
 * Get all positions for a specific note on the fretboard
 */
export function getPositionsForNote(
  noteName: string,
  tuning: Tuning,
  stringCount: number,
  maxFret: number = 22
): FretPosition[] {
  const positions: FretPosition[] = [];
  const targetPitch = Note.get(noteName).chroma;
  
  if (targetPitch === undefined) return positions;
  
  for (let string = 0; string < stringCount; string++) {
    for (let fret = 0; fret <= maxFret; fret++) {
      const note = getNoteAtPosition({ string, fret }, tuning, stringCount);
      const notePitch = Note.get(note).chroma;
      
      if (notePitch === targetPitch) {
        positions.push({ string, fret });
      }
    }
  }
  
  return positions;
}

/**
 * Get all positions for notes in a scale
 */
export function getScalePositions(
  scaleNotes: string[],
  tuning: Tuning,
  stringCount: number,
  maxFret: number = 12
): FretPosition[] {
  const positions: FretPosition[] = [];
  const scaleChromas = scaleNotes.map(n => Note.get(n).chroma);
  
  for (let string = 0; string < stringCount; string++) {
    for (let fret = 0; fret <= maxFret; fret++) {
      const note = getNoteAtPosition({ string, fret }, tuning, stringCount);
      const noteChroma = Note.get(note).chroma;
      
      if (noteChroma !== undefined && scaleChromas.includes(noteChroma)) {
        positions.push({ string, fret, note: { name: note.replace(/\d/, ''), octave: parseInt(note.match(/\d/)?.[0] || '3') } });
      }
    }
  }
  
  return positions;
}

/**
 * Get the interval between two positions
 */
export function getIntervalBetweenPositions(
  pos1: FretPosition,
  pos2: FretPosition,
  tuning: Tuning,
  stringCount: number
): string {
  const note1 = getNoteAtPosition(pos1, tuning, stringCount);
  const note2 = getNoteAtPosition(pos2, tuning, stringCount);
  
  const midi1 = Note.midi(note1);
  const midi2 = Note.midi(note2);
  
  if (midi1 === null || midi2 === null) return '';
  
  const semitones = Math.abs(midi2 - midi1) % 12;
  const intervalNames = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
  
  return intervalNames[semitones];
}

/**
 * Generate a random fret position within constraints
 */
export function getRandomPosition(
  stringCount: number,
  maxFret: number = 12,
  minFret: number = 0
): FretPosition {
  const string = Math.floor(Math.random() * stringCount);
  const fret = Math.floor(Math.random() * (maxFret - minFret + 1)) + minFret;
  
  return { string, fret };
}

