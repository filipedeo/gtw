export interface PitchResult {
  frequency: number;
  noteName: string;
  noteNameWithoutOctave: string;
  octave: number;
  cents: number;
  clarity: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const A4_FREQUENCY = 440;
const A4_MIDI = 69;

/**
 * Detect pitch from raw time-domain audio data using autocorrelation.
 */
export function detectPitch(buffer: Float32Array, sampleRate: number): PitchResult | null {
  // Check RMS — skip silence
  let rms = 0;
  for (let i = 0; i < buffer.length; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 0.005) return null;

  // Autocorrelation
  const minLag = Math.floor(sampleRate / 1400); // ~1400 Hz upper bound
  const maxLag = Math.floor(sampleRate / 60);    // ~60 Hz lower bound
  const correlations = new Float32Array(maxLag + 1);

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;
    const len = buffer.length - lag;
    for (let i = 0; i < len; i++) {
      sum += buffer[i] * buffer[i + lag];
      sumSq1 += buffer[i] * buffer[i];
      sumSq2 += buffer[i + lag] * buffer[i + lag];
    }
    const denom = Math.sqrt(sumSq1 * sumSq2);
    correlations[lag] = denom > 0 ? sum / denom : 0;
  }

  // Find the first peak after correlation dips below threshold
  let pastDip = false;
  let bestLag = -1;
  let bestCorrelation = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    if (!pastDip) {
      if (correlations[lag] < 0.5) pastDip = true;
      continue;
    }
    if (correlations[lag] > 0.8) {
      // Walk forward to the actual local maximum
      while (lag + 1 <= maxLag && correlations[lag + 1] >= correlations[lag]) {
        lag++;
      }
      bestLag = lag;
      bestCorrelation = correlations[lag];
      break;
    }
  }

  if (bestLag === -1) return null;

  // Parabolic interpolation for sub-sample accuracy
  const prev = bestLag > 0 ? correlations[bestLag - 1] : correlations[bestLag];
  const curr = correlations[bestLag];
  const next = bestLag < correlations.length - 1 ? correlations[bestLag + 1] : correlations[bestLag];

  const denom = 2 * (prev - 2 * curr + next);
  let shift = 0;
  if (denom !== 0) {
    shift = (prev - next) / denom;
    // Clamp: parabolic interpolation should only shift by ±0.5 samples
    shift = Math.max(-0.5, Math.min(0.5, shift));
  }
  const refinedLag = bestLag + shift;

  const frequency = sampleRate / refinedLag;
  const noteInfo = frequencyToNote(frequency);

  return {
    ...noteInfo,
    frequency,
    clarity: bestCorrelation,
  };
}

/**
 * Convert a frequency to its nearest note name, octave, and cents offset.
 */
export function frequencyToNote(frequency: number): {
  noteName: string;
  noteNameWithoutOctave: string;
  octave: number;
  cents: number;
} {
  const midiNote = 12 * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI;
  const roundedMidi = Math.round(midiNote);
  const cents = Math.round((midiNote - roundedMidi) * 100);
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  const noteNameWithoutOctave = NOTE_NAMES[noteIndex];

  return {
    noteName: `${noteNameWithoutOctave}${octave}`,
    noteNameWithoutOctave,
    octave,
    cents,
  };
}

/**
 * Convert a note name (e.g. "E2", "A4") to its frequency in Hz.
 */
export function noteToFrequency(noteName: string): number {
  const match = noteName.match(/^([A-G]#?)(\d+)$/);
  if (!match) throw new Error(`Invalid note name: ${noteName}`);

  const [, note, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const noteIndex = NOTE_NAMES.indexOf(note);
  if (noteIndex === -1) throw new Error(`Invalid note: ${note}`);

  const midiNote = (octave + 1) * 12 + noteIndex;
  return A4_FREQUENCY * Math.pow(2, (midiNote - A4_MIDI) / 12);
}
