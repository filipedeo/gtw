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

export type PlaybackOptions = {
  duration?: number;
  velocity?: number;
  delay?: number;
};
