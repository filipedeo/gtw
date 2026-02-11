import { GuitarConfig, FretPosition, Note } from '../types/guitar';
import { TheoryEngine } from '../lib/theoryEngine';

export function calculateNotePositions(guitarConfig: GuitarConfig): FretPosition[] {
    const positions: FretPosition[] = [];
    for (let string = 1; string <= guitarConfig.numberOfStrings; string++) {
        for (let fret = 0; fret <= 24; fret++) { // Typically up to 24 frets
            const note: Note = TheoryEngine.getNoteFromFret(guitarConfig, string, fret);
            positions.push({ stringNumber: string, fret });
        }
    }
    return positions;
}