import { Exercise, ExerciseType, Difficulty } from '../types/exercise';

// Exercise definitions - organized by category
const exerciseData: Exercise[] = [
  // ============ NOTE IDENTIFICATION ============
  {
    id: 'note-id-1',
    type: 'note-identification',
    title: 'Note ID - First Position (Frets 0-5)',
    description: 'Learn to identify notes on the first 5 frets. A note will play and highlight - identify it!',
    difficulty: 1,
    instructions: [
      'A note will be highlighted and played on the fretboard',
      'Listen to the note and look at its position',
      'Select the correct note name from the options',
      'The note name is hidden until you answer',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'note-id-2',
    type: 'note-identification',
    title: 'Note ID - Full Neck (Frets 0-12)',
    description: 'Identify notes across the entire fretboard up to the 12th fret.',
    difficulty: 2,
    instructions: [
      'Notes can appear anywhere from fret 0 to 12',
      'Remember: the 12th fret is the same note as the open string',
      'Use octave patterns to help identify notes quickly',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'note-id-3',
    type: 'note-identification',
    title: 'Note ID - Extended Range',
    description: 'Master note identification across the entire fretboard including upper positions.',
    difficulty: 3,
    instructions: [
      'Notes can appear anywhere on the fretboard',
      'Focus on pattern recognition across octaves',
      'Speed is key - aim for under 3 seconds per note',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },

  // ============ CAGED SYSTEM ============
  {
    id: 'caged-1',
    type: 'caged-system',
    title: 'CAGED - C Shape Major',
    description: 'Learn the C shape of the CAGED system and its chord tones (Root, 3rd, 5th).',
    difficulty: 1,
    instructions: [
      'The C shape is based on the open C chord moved up the neck',
      'Identify the Root, 3rd, and 5th within the shape',
      'Practice playing the chord form, then the scale within that position',
      'Say the note names aloud as you play',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'caged-2',
    type: 'caged-system',
    title: 'CAGED - A Shape Major',
    description: 'Learn the A shape of the CAGED system with barre chord foundation.',
    difficulty: 1,
    instructions: [
      'The A shape is based on the open A chord as a barre',
      'This is one of the most common barre chord shapes',
      'Identify chord tones and practice the scale within this position',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'caged-3',
    type: 'caged-system',
    title: 'CAGED - G Shape Major',
    description: 'Learn the G shape of the CAGED system - a stretchy but useful position.',
    difficulty: 2,
    instructions: [
      'The G shape requires more stretching but offers unique voicings',
      'Focus on the root note locations within this shape',
      'Practice transitioning from the E shape to the G shape',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'caged-4',
    type: 'caged-system',
    title: 'CAGED - E Shape Major',
    description: 'Learn the E shape - the most common barre chord shape.',
    difficulty: 1,
    instructions: [
      'The E shape is the foundation of most rock and pop guitar',
      'Master the barre chord form first',
      'Then learn to see the scale within this shape',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'caged-5',
    type: 'caged-system',
    title: 'CAGED - D Shape Major',
    description: 'Learn the D shape of the CAGED system for upper register playing.',
    difficulty: 2,
    instructions: [
      'The D shape is great for higher voicings',
      'Often used for partial chords and embellishments',
      'Practice connecting it to the C shape below',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'caged-6',
    type: 'caged-system',
    title: 'CAGED - Connect All 5 Shapes',
    description: 'Practice moving through all 5 CAGED shapes in one key.',
    difficulty: 3,
    instructions: [
      'Start with the C shape and move through A, G, E, D',
      'Play the chord, then improvise in that position for 30 seconds',
      'Focus on smooth transitions between shapes',
      'This exercise builds complete fretboard visualization',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },

  // ============ MODAL PRACTICE ============
  {
    id: 'modal-1',
    type: 'modal-practice',
    title: 'Dorian Mode - Natural 6th',
    description: 'Practice Dorian mode emphasizing its characteristic natural 6th (vs Aeolian b6).',
    difficulty: 2,
    instructions: [
      'A drone will play the root note',
      'Play the Dorian scale, emphasizing the natural 6th',
      'The natural 6 is what distinguishes Dorian from natural minor',
      'Try to resolve phrases to the root or the characteristic 6th',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'modal-2',
    type: 'modal-practice',
    title: 'Mixolydian Mode - Flat 7th',
    description: 'Practice Mixolydian mode with emphasis on the characteristic b7.',
    difficulty: 2,
    instructions: [
      'Mixolydian is the "dominant" mode - used over dominant 7th chords',
      'The b7 is what makes it different from major (Ionian)',
      'Great for blues, rock, and funk',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'modal-3',
    type: 'modal-practice',
    title: 'Lydian Mode - Sharp 4th',
    description: 'Practice Lydian mode with emphasis on the characteristic #4.',
    difficulty: 3,
    instructions: [
      'Lydian has a dreamy, floating quality from the #4',
      'Used extensively in film music and jazz',
      'The #4 creates tension that wants to resolve up to the 5th',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'modal-4',
    type: 'modal-practice',
    title: 'Phrygian Mode - Flat 2nd',
    description: 'Practice Phrygian mode with its distinctive Spanish/Middle Eastern sound.',
    difficulty: 3,
    instructions: [
      'The b2 gives Phrygian its exotic, Spanish flavor',
      'Common in flamenco, metal, and Middle Eastern music',
      'The half-step from b2 to root creates strong tension',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'modal-5',
    type: 'modal-practice',
    title: 'Aeolian Mode (Natural Minor)',
    description: 'Practice the natural minor scale - the foundation of minor key music.',
    difficulty: 2,
    instructions: [
      'Aeolian is the "default" minor sound',
      'The b6 distinguishes it from Dorian',
      'Foundation for rock, pop, and classical minor keys',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'modal-6',
    type: 'modal-practice',
    title: 'Parallel Mode Comparison',
    description: 'Compare all 7 modes from the same root to hear their unique colors.',
    difficulty: 4,
    instructions: [
      'Play each mode from the same root note',
      'Listen for how the characteristic note changes the mood',
      'This is the most effective way to internalize modal sounds',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },

  // ============ INTERVAL RECOGNITION ============
  {
    id: 'interval-1',
    type: 'interval-recognition',
    title: 'Intervals - Perfect 4th & 5th',
    description: 'Learn to recognize the most common intervals: Perfect 4th and Perfect 5th.',
    difficulty: 1,
    instructions: [
      'Two notes will be played',
      'Perfect 4th: "Here Comes the Bride"',
      'Perfect 5th: "Star Wars" theme',
      'These are the building blocks of power chords',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'interval-2',
    type: 'interval-recognition',
    title: 'Intervals - Major & Minor 3rds',
    description: 'Distinguish between major and minor 3rds - the intervals that define chord quality.',
    difficulty: 2,
    instructions: [
      'Major 3rd: bright, happy (first two notes of "Kumbaya")',
      'Minor 3rd: dark, sad (first two notes of "Greensleeves")',
      'These determine if a chord is major or minor',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'interval-3',
    type: 'interval-recognition',
    title: 'Intervals - All Basic Intervals',
    description: 'Master recognition of all intervals within an octave.',
    difficulty: 3,
    instructions: [
      'Includes: m2, M2, m3, M3, P4, tritone, P5, m6, M6, m7, M7, octave',
      'Use song references to help remember each interval',
      'Practice both ascending and descending',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },

  // ============ CHORD VOICINGS ============
  {
    id: 'chord-1',
    type: 'chord-voicing',
    title: 'Drop 2 Voicings - Major 7th',
    description: 'Learn Drop 2 voicings for major 7th chords across all inversions.',
    difficulty: 3,
    instructions: [
      'Drop 2: take close voicing, drop 2nd note from top down an octave',
      'Learn all 4 inversions on strings 4-3-2-1',
      'Practice smooth voice leading between inversions',
      'Target: 4 inversions × 3 string sets = 12 voicings',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'chord-2',
    type: 'chord-voicing',
    title: 'Drop 2 Voicings - Minor 7th',
    description: 'Learn Drop 2 voicings for minor 7th chords.',
    difficulty: 3,
    instructions: [
      'Minor 7th is the ii chord in major keys',
      'Essential for jazz comping',
      'Practice ii-V-I progressions with voice leading',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'chord-3',
    type: 'chord-voicing',
    title: 'Drop 2 Voicings - Dominant 7th',
    description: 'Learn Drop 2 voicings for dominant 7th chords.',
    difficulty: 3,
    instructions: [
      'Dominant 7th is the V chord - creates tension',
      'The tritone between 3rd and 7th wants to resolve',
      'Practice V-I resolutions with minimal movement',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'chord-4',
    type: 'chord-voicing',
    title: 'Triad Inversions - String Set 4-3-2',
    description: 'Master triad inversions on the middle string set.',
    difficulty: 2,
    instructions: [
      'Learn root position, 1st inversion, 2nd inversion',
      'Practice for major, minor, diminished, augmented',
      'Play harmonized major scale using only this string set',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'chord-5',
    type: 'chord-voicing',
    title: 'Triad Inversions - Minor',
    description: 'Master minor triad inversions across multiple string sets.',
    difficulty: 2,
    instructions: [
      'Learn root position, 1st inversion, 2nd inversion for minor triads',
      'Compare with major triads to hear the difference',
      'Practice across D-G-B, G-B-E, and A-D-G string sets',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },

  // ============ EAR TRAINING ============
  {
    id: 'ear-1',
    type: 'ear-training',
    title: 'Chord Quality - Major vs Minor',
    description: 'Learn to distinguish between major and minor chord qualities.',
    difficulty: 1,
    instructions: [
      'A chord will be played',
      'Major: bright, happy, resolved',
      'Minor: dark, sad, introspective',
      'Listen for the quality of the 3rd',
    ],
    audioRequired: true,
    fretboardRequired: false,
  },
  {
    id: 'ear-2',
    type: 'ear-training',
    title: 'Chord Quality - 7th Chords',
    description: 'Distinguish between major 7th, minor 7th, and dominant 7th chords.',
    difficulty: 2,
    instructions: [
      'Major 7th: dreamy, jazzy',
      'Minor 7th: mellow, smooth',
      'Dominant 7th: tense, wants to resolve',
      'Listen for both the 3rd AND the 7th',
    ],
    audioRequired: true,
    fretboardRequired: false,
  },
  {
    id: 'ear-3',
    type: 'ear-training',
    title: 'Functional Ear Training - Scale Degrees',
    description: 'Identify notes by their function (1, 2, 3, etc.) not just their name.',
    difficulty: 3,
    instructions: [
      'A key will be established, then a note played',
      'Identify the scale degree (1-7)',
      'This is how professional musicians hear music',
      'More useful than absolute pitch for most purposes',
    ],
    audioRequired: true,
    fretboardRequired: false,
  },
];

// Add CAGED type to exercise types
export type ExtendedExerciseType = ExerciseType | 'caged-system';

/**
 * Get all exercises
 */
export async function getExercises(): Promise<Exercise[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  return exerciseData;
}

/**
 * Get exercise by ID
 */
export async function getExerciseById(id: string): Promise<Exercise | null> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return exerciseData.find(ex => ex.id === id) || null;
}

/**
 * Get exercises by type
 */
export async function getExercisesByType(type: ExerciseType | string): Promise<Exercise[]> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return exerciseData.filter(ex => ex.type === type);
}

/**
 * Get exercises by difficulty
 */
export async function getExercisesByDifficulty(difficulty: Difficulty): Promise<Exercise[]> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return exerciseData.filter(ex => ex.difficulty === difficulty);
}

/**
 * Get exercise categories
 */
export function getExerciseCategories(): { type: string; label: string; count: number }[] {
  const categories = [
    { type: 'note-identification', label: 'Note Identification' },
    { type: 'caged-system', label: 'CAGED System' },
    { type: 'modal-practice', label: 'Modal Practice' },
    { type: 'interval-recognition', label: 'Interval Recognition' },
    { type: 'chord-voicing', label: 'Chord Voicings' },
    { type: 'ear-training', label: 'Ear Training' },
  ];
  
  return categories.map(cat => ({
    ...cat,
    count: exerciseData.filter(ex => ex.type === cat.type).length,
  }));
}