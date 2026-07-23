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
  // Clicks per beat: 1 = quarter (no subdivision), 2 = eighths, 3 = triplets, 4 = sixteenths.
  subdivision: 1 | 2 | 3 | 4;
};

export type PlaybackOptions = {
  duration?: number;
  velocity?: number;
  delay?: number;
};
