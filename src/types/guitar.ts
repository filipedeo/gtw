export type GuitarConfig = {
    numberOfStrings: 6 | 7;
    tuning: Tuning[];
};

export type Tuning = {
    stringNumber: number;
    note: Note;
};

export type FretPosition = {
    stringNumber: number;
    fret: number;
};

export type Note = {
    name: string;
    octave: number;
};