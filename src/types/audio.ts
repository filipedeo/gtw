export type AudioState = {
    isPlaying: boolean;
    volume: number;
};

export type DroneConfig = {
    note: Note;
    duration: number; // in seconds
};

export type ChordProgression = {
    chords: Note[][];
    tempo: number; // BPM
};