import { Note } from './guitar';

export type DroneConfig = {
  note: string;
  octave: number;
  volume: number;
  waveform: 'sine' | 'triangle' | 'sawtooth' | 'square';
};

export type MetronomeConfig = {
  bpm: number;
  timeSignature: [number, number];
  volume: number;
  accentFirst: boolean;
};

export type ChordProgression = {
  chords: string[];
  durations: number[]; // in beats
  bpm: number;
};

export type AudioState = {
  isPlaying: boolean;
  isDroneActive: boolean;
  isMetronomeActive: boolean;
  droneConfig: DroneConfig;
  metronomeConfig: MetronomeConfig;
  masterVolume: number;
  currentNote: string | null;
};

export type PlaybackOptions = {
  duration?: number;
  velocity?: number;
  delay?: number;
};