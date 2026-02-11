import { Note } from 'tonal';
import { GuitarConfig, Tuning } from '../types/guitar';

export class TheoryEngine {
    static getNoteFromFret(guitarConfig: GuitarConfig, stringNumber: number, fret: number): Note {
        const tuning: Tuning = guitarConfig.tuning.find(t => t.stringNumber === stringNumber)!;
        const baseNote = Note.get(tuning.note.name + tuning.note.octave);
        return Note.transpose(baseNote, fret);
    }

    static generateScale(rootNote: string, scaleType: string): Note[] {
        return Note.scale(rootNote, scaleType);
    }
}