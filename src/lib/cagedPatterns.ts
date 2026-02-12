// CAGED shape definitions - ALL positions are relative offsets from the barre/root position
// This allows proper transposition to any key
//
// String indices use the tuning array convention:
// - 6-string: 0=low E, 1=A, 2=D, 3=G, 4=B, 5=high E
// - 7-string: 0=low B, 1=low E, 2=A, 3=D, 4=G, 5=B, 6=high E
//
// The fretboard displays with high E at top, low E at bottom.
// The Fretboard component handles the visual transformation.

export interface ChordPosition {
  string: number;
  fretOffset: number;
}

export interface CAGEDShape {
  name: string;
  description: string;
  chordPositions: ChordPosition[]; // Relative to barre position
  minorChordPositions: ChordPosition[];
  rootString: number; // Which string has the root note (tuning array index)
  baseKey: string; // The key this shape is based on (for calculating transposition)
  scalePattern: number[][]; // [string (tuning index), fret offset from barre position]
  minorScalePattern: number[][];
}

export const CAGED_SHAPES: Record<string, CAGEDShape> = {
  'C': {
    name: 'C Shape',
    description: 'Based on the open C chord. Root on the 5th (A) string. Requires a stretch when barred.',
    rootString: 1, // A string (tuning index 1)
    baseKey: 'C',
    // Open C chord: x-3-2-0-1-0 (A string root at fret 3)
    // String indices: 0=lowE, 1=A, 2=D, 3=G, 4=B, 5=highE
    chordPositions: [
      { string: 1, fretOffset: 0 },  // A string - Root C (fret 3 in open position)
      { string: 2, fretOffset: -1 }, // D string - E (fret 2)
      { string: 3, fretOffset: -3 }, // G string - G (open = fret 0)
      { string: 4, fretOffset: -2 }, // B string - C (fret 1)
      { string: 5, fretOffset: -3 }, // high E - E (open = fret 0)
    ],
    minorChordPositions: [
      { string: 1, fretOffset: 0 },  // A string - Root
      { string: 2, fretOffset: -2 }, // D string - b3 (was -1 for major 3rd)
      { string: 3, fretOffset: -3 }, // G string - 5th
      { string: 4, fretOffset: -2 }, // B string - Root
      { string: 5, fretOffset: -4 }, // high E - b3 (was -3 for major 3rd)
    ],
    scalePattern: [
      [0, -3], [0, -2], [1, -3], [1, -1], [1, 0],
      [2, -3], [2, -1], [2, 0], [3, -3], [3, -1], [3, 1],
      [4, -3], [4, -2], [4, 0], [5, -3], [5, -2], [5, 0]
    ],
    minorScalePattern: [
      [0, -2], [0, 0], [1, -2], [1, 0], [1, 2],
      [2, -3], [2, -2], [2, 0], [3, -3], [3, -2], [3, 0],
      [4, -2], [4, 0], [4, 1], [5, -2], [5, 0], [5, 1]
    ]
  },
  'A': {
    name: 'A Shape',
    description: 'Based on the open A chord. Root on the 5th (A) string. Most common barre shape.',
    rootString: 1, // A string (tuning index 1)
    baseKey: 'A',
    // Open A chord: x-0-2-2-2-0 (A string root at fret 0/open)
    chordPositions: [
      { string: 1, fretOffset: 0 }, // A string - Root A (open)
      { string: 2, fretOffset: 2 }, // D string - E (fret 2)
      { string: 3, fretOffset: 2 }, // G string - A (fret 2)
      { string: 4, fretOffset: 2 }, // B string - C# (fret 2)
      { string: 5, fretOffset: 0 }, // high E - E (open)
    ],
    minorChordPositions: [
      { string: 1, fretOffset: 0 }, // A string - Root
      { string: 2, fretOffset: 2 }, // D string - 5th
      { string: 3, fretOffset: 2 }, // G string - Root
      { string: 4, fretOffset: 1 }, // B string - b3 (flatten 3rd by 1 semitone)
      { string: 5, fretOffset: 0 }, // high E - 5th
    ],
    scalePattern: [
      [0, 0], [0, 2], [0, 4], [1, 0], [1, 2], [1, 4],
      [2, 0], [2, 2], [2, 4], [3, 1], [3, 2], [3, 4],
      [4, 0], [4, 2], [4, 3], [5, 0], [5, 2], [5, 4]
    ],
    minorScalePattern: [
      [0, 0], [0, 1], [0, 3], [1, 0], [1, 2], [1, 3],
      [2, 0], [2, 2], [2, 3], [3, 0], [3, 2], [3, 4],
      [4, 0], [4, 1], [4, 3], [5, 0], [5, 1], [5, 3]
    ]
  },
  'G': {
    name: 'G Shape',
    description: 'Based on the open G chord. Root on the 6th (low E) string. Requires stretching.',
    rootString: 0, // Low E string (tuning index 0)
    baseKey: 'G',
    // Open G chord: 3-2-0-0-0-3 (low E root at fret 3)
    chordPositions: [
      { string: 0, fretOffset: 0 },  // low E - Root G (fret 3)
      { string: 1, fretOffset: -1 }, // A string - B (fret 2)
      { string: 2, fretOffset: -3 }, // D string - D (open)
      { string: 3, fretOffset: -3 }, // G string - G (open)
      { string: 4, fretOffset: -3 }, // B string - B (open)
      { string: 5, fretOffset: 0 },  // high E - G (fret 3)
    ],
    minorChordPositions: [
      { string: 0, fretOffset: 0 },  // low E - Root
      { string: 1, fretOffset: -2 }, // A string - b3 (flatten 3rd by 1 semitone)
      { string: 2, fretOffset: -3 }, // D string - 5th
      { string: 3, fretOffset: -3 }, // G string - Root
      { string: 4, fretOffset: -4 }, // B string - b3 (was -3 for major 3rd)
      { string: 5, fretOffset: 0 },  // high E - Root
    ],
    scalePattern: [
      [0, -3], [0, -1], [0, 0], [1, -3], [1, -1], [1, 0],
      [2, -3], [2, -1], [2, 1], [3, -3], [3, -1], [3, 1],
      [4, -3], [4, -2], [4, 0], [5, -3], [5, -1], [5, 0]
    ],
    minorScalePattern: [
      [0, -2], [0, 0], [0, 2], [1, -3], [1, -2], [1, 0],
      [2, -3], [2, -2], [2, 0], [3, -3], [3, -1], [3, 0],
      [4, -2], [4, 0], [4, 1], [5, -2], [5, 0], [5, 2]
    ]
  },
  'E': {
    name: 'E Shape',
    description: 'Based on the open E chord. Root on the 6th (low E) string. The most common barre chord.',
    rootString: 0, // Low E string (tuning index 0)
    baseKey: 'E',
    // Open E chord: 0-2-2-1-0-0 (low E root at fret 0/open)
    chordPositions: [
      { string: 0, fretOffset: 0 }, // low E - Root E (open)
      { string: 1, fretOffset: 2 }, // A string - B (fret 2)
      { string: 2, fretOffset: 2 }, // D string - E (fret 2)
      { string: 3, fretOffset: 1 }, // G string - G# (fret 1)
      { string: 4, fretOffset: 0 }, // B string - B (open)
      { string: 5, fretOffset: 0 }, // high E - E (open)
    ],
    minorChordPositions: [
      { string: 0, fretOffset: 0 }, // low E - Root
      { string: 1, fretOffset: 2 }, // A string - 5th
      { string: 2, fretOffset: 2 }, // D string - Root
      { string: 3, fretOffset: 0 }, // G string - b3 (flatten 3rd by 1 semitone)
      { string: 4, fretOffset: 0 }, // B string - 5th
      { string: 5, fretOffset: 0 }, // high E - Root
    ],
    scalePattern: [
      [0, 0], [0, 2], [0, 4], [1, 0], [1, 2], [1, 4],
      [2, 1], [2, 2], [2, 4], [3, 1], [3, 2], [3, 4],
      [4, 0], [4, 2], [4, 4], [5, 0], [5, 2], [5, 4]
    ],
    minorScalePattern: [
      [0, 0], [0, 2], [0, 3], [1, 0], [1, 2], [1, 3],
      [2, 0], [2, 2], [2, 4], [3, 0], [3, 2], [3, 4],
      [4, 0], [4, 1], [4, 3], [5, 0], [5, 2], [5, 3]
    ]
  },
  'D': {
    name: 'D Shape',
    description: 'Based on the open D chord. Root on the 4th (D) string. Great for higher voicings.',
    rootString: 2, // D string (tuning index 2)
    baseKey: 'D',
    // Open D chord: x-x-0-2-3-2 (D string root at fret 0/open)
    chordPositions: [
      { string: 2, fretOffset: 0 }, // D string - Root D (open)
      { string: 3, fretOffset: 2 }, // G string - A (fret 2)
      { string: 4, fretOffset: 3 }, // B string - D (fret 3)
      { string: 5, fretOffset: 2 }, // high E - F# (fret 2)
    ],
    minorChordPositions: [
      { string: 2, fretOffset: 0 }, // D string - Root
      { string: 3, fretOffset: 2 }, // G string - 5th
      { string: 4, fretOffset: 3 }, // B string - Root
      { string: 5, fretOffset: 1 }, // high E - b3 (flatten 3rd by 1 semitone)
    ],
    scalePattern: [
      [1, 0], [1, 2], [1, 4], [2, 0], [2, 2], [2, 4],
      [3, 0], [3, 2], [3, 4], [4, 0], [4, 2], [4, 3],
      [5, 0], [5, 2], [5, 3]
    ],
    minorScalePattern: [
      [1, 0], [1, 1], [1, 3], [2, 0], [2, 2], [2, 3],
      [3, 0], [3, 2], [3, 3], [4, 1], [4, 3], [4, 5],
      [5, 0], [5, 1], [5, 3]
    ]
  }
};

export const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
