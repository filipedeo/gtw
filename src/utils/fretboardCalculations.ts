import { FretPosition, Tuning, NOTE_NAMES } from '../types/guitar';
import { Note } from 'tonal';

/**
 * Get the note at a specific fret position
 */
export function getNoteAtPosition(
  position: FretPosition, 
  tuning: Tuning, 
  stringCount: number
): string {
  const { string, fret } = position;
  
  // Get the open string note (strings are 0-indexed from high to low in our system)
  const openStringNote = tuning.notes[stringCount - 1 - string];
  if (!openStringNote) return '';
  
  // Transpose by the number of frets
  const transposed = Note.transpose(openStringNote, `${fret}m2`.replace('0m2', '1P'));
  
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

/**
 * Get all notes for a given scale in a specific position range
 */
export function getAllNotesForScale(
  root: string,
  scaleType: string,
  tuning: Tuning,
  stringCount: number,
  startFret: number = 0,
  endFret: number = 12
): FretPosition[] {
  // This would use tonal.js to get scale notes
  // For now, return empty array - will be implemented with theoryEngine
  return [];
}