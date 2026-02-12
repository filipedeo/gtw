export interface JamProgression {
  name: string;
  numerals: string[];
  degrees: (number | string)[];
  suggestedScale: string; // mode name to display on fretboard
  genre: string;
  beatsPerChord: number; // usually 4, but 12-bar blues uses variable
}

export const JAM_PROGRESSIONS: JamProgression[] = [
  // Blues
  {
    name: '12-Bar Blues',
    numerals: ['I', 'I', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V', 'IV', 'I', 'V'],
    degrees: [1, 1, 1, 1, 4, 4, 1, 1, 5, 4, 1, 5],
    suggestedScale: 'blues',
    genre: 'Blues',
    beatsPerChord: 4,
  },
  {
    name: 'Minor Blues',
    numerals: ['i', 'i', 'i', 'i', 'iv', 'iv', 'i', 'i', 'V', 'iv', 'i', 'V'],
    degrees: ['1m', '1m', '1m', '1m', '4m', '4m', '1m', '1m', '5M', '4m', '1m', '5M'],
    suggestedScale: 'aeolian',
    genre: 'Blues',
    beatsPerChord: 4,
  },
  // Rock
  {
    name: 'Classic Rock (I-bVII-IV)',
    numerals: ['I', 'bVII', 'IV', 'I'],
    degrees: [1, 'b7', 4, 1],
    suggestedScale: 'mixolydian',
    genre: 'Rock',
    beatsPerChord: 4,
  },
  {
    name: 'Rock Anthem (I-IV-V)',
    numerals: ['I', 'IV', 'V', 'V'],
    degrees: [1, 4, 5, 5],
    suggestedScale: 'ionian',
    genre: 'Rock',
    beatsPerChord: 4,
  },
  {
    name: 'Sad Rock (vi-IV-I-V)',
    numerals: ['vi', 'IV', 'I', 'V'],
    degrees: [6, 4, 1, 5],
    suggestedScale: 'aeolian',
    genre: 'Rock',
    beatsPerChord: 4,
  },
  // Jazz
  {
    name: 'ii-V-I',
    numerals: ['ii', 'V', 'I', 'I'],
    degrees: [2, 5, 1, 1],
    suggestedScale: 'dorian',
    genre: 'Jazz',
    beatsPerChord: 4,
  },
  {
    name: 'Rhythm Changes (I-vi-ii-V)',
    numerals: ['I', 'vi', 'ii', 'V'],
    degrees: [1, 6, 2, 5],
    suggestedScale: 'ionian',
    genre: 'Jazz',
    beatsPerChord: 4,
  },
  {
    name: 'Jazz Turnaround (iii-vi-ii-V)',
    numerals: ['iii', 'vi', 'ii', 'V'],
    degrees: [3, 6, 2, 5],
    suggestedScale: 'dorian',
    genre: 'Jazz',
    beatsPerChord: 4,
  },
  // Pop
  {
    name: 'Axis of Awesome (I-V-vi-IV)',
    numerals: ['I', 'V', 'vi', 'IV'],
    degrees: [1, 5, 6, 4],
    suggestedScale: 'ionian',
    genre: 'Pop',
    beatsPerChord: 4,
  },
  {
    name: 'Emotional Pop (vi-IV-I-V)',
    numerals: ['vi', 'IV', 'I', 'V'],
    degrees: [6, 4, 1, 5],
    suggestedScale: 'aeolian',
    genre: 'Pop',
    beatsPerChord: 4,
  },
  // Jazz - Minor ii-V-i
  {
    name: 'Minor ii-V-i',
    numerals: ['iiø7', 'V7', 'i', 'i'],
    degrees: ['2dim', '5M', '1m', '1m'],
    suggestedScale: 'harmonic minor',
    genre: 'Jazz',
    beatsPerChord: 4,
  },
  // Flamenco/Spanish
  {
    name: 'Andalusian Cadence',
    numerals: ['i', 'bVII', 'bVI', 'V'],
    degrees: ['1m', 'b7', 'b6', '5M'],
    suggestedScale: 'phrygian dominant',
    genre: 'Flamenco',
    beatsPerChord: 4,
  },
  // Secondary Dominants
  {
    name: 'Secondary Dominant (V/V)',
    numerals: ['I', 'V/V', 'V', 'I'],
    degrees: [1, '2M', 5, 1],
    suggestedScale: 'ionian',
    genre: 'Jazz',
    beatsPerChord: 4,
  },
  {
    name: 'Extended ii-V with V/ii',
    numerals: ['V/ii', 'ii', 'V', 'I'],
    degrees: ['6M', 2, 5, 1],
    suggestedScale: 'ionian',
    genre: 'Jazz',
    beatsPerChord: 4,
  },
  {
    name: 'Descending Dominants',
    numerals: ['I', 'V/IV', 'IV', 'iv', 'I'],
    degrees: [1, '1M', 4, '4m', 1],
    suggestedScale: 'ionian',
    genre: 'Jazz',
    beatsPerChord: 4,
  },
];
