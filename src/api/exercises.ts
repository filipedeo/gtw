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
  {
    id: 'caged-7',
    type: 'caged-system',
    title: 'CAGED Minor - C Shape',
    description: 'Learn the C shape minor chord and natural minor scale pattern.',
    difficulty: 2,
    instructions: [
      'The minor C shape flattens the 3rd compared to the major C shape',
      'Natural minor = Aeolian mode (1, 2, b3, 4, 5, b6, b7)',
      'Compare with the major C shape to see which notes change',
      'Practice the minor chord form, then the minor scale within this position',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'caged-8',
    type: 'caged-system',
    title: 'CAGED Minor - A Shape',
    description: 'Learn the A shape minor barre chord and natural minor scale.',
    difficulty: 1,
    instructions: [
      'The Am barre shape is one of the most common minor chord forms',
      'Only the 3rd changes from the major A shape (one fret lower)',
      'Practice transitioning between the major and minor A shapes',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'caged-9',
    type: 'caged-system',
    title: 'CAGED Minor - G Shape',
    description: 'Learn the G shape minor chord and natural minor scale pattern.',
    difficulty: 3,
    instructions: [
      'The G shape minor requires stretching but offers unique voicings',
      'Focus on the root note locations within this shape',
      'Practice transitioning from the E minor shape to the G minor shape',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'caged-10',
    type: 'caged-system',
    title: 'CAGED Minor - E Shape',
    description: 'Learn the E shape minor barre chord — the most common minor barre chord.',
    difficulty: 1,
    instructions: [
      'The Em barre shape is the foundation of most minor barre chords',
      'Only the 3rd changes from the major E shape (one fret lower)',
      'Master this shape first — it is the most versatile minor chord form',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'caged-11',
    type: 'caged-system',
    title: 'CAGED Minor - D Shape',
    description: 'Learn the D shape minor chord for upper register minor voicings.',
    difficulty: 2,
    instructions: [
      'The Dm shape is great for higher minor voicings',
      'Often used for partial chords and embellishments',
      'Practice connecting it to the C minor shape below',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'caged-12',
    type: 'caged-system',
    title: 'CAGED Minor - Connect All 5 Shapes',
    description: 'Practice moving through all 5 minor CAGED shapes in one key.',
    difficulty: 3,
    instructions: [
      'Start with the C minor shape and move through A, G, E, D',
      'Play the minor chord, then improvise using the natural minor scale',
      'Focus on smooth transitions between minor shapes',
      'Compare each minor shape with its major counterpart',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },

  // ============ 3-NOTES-PER-STRING ============
  {
    id: 'three-nps-1',
    type: 'three-nps',
    title: '3NPS - Ionian (Major Scale)',
    description: 'Learn the Ionian 3-notes-per-string pattern for efficient linear playing.',
    difficulty: 2,
    instructions: [
      'Each string gets exactly 3 notes from the major scale',
      'All 3NPS patterns use just 3 finger shapes: W-W (1-3-5), W-H (1-3-4), H-W (1-2-4)',
      'Practice ascending and descending with alternate picking',
      'Start slow — increase speed only when clean',
      'Remove one note per string to reveal the pentatonic shape inside',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'three-nps-2',
    type: 'three-nps',
    title: '3NPS - Dorian',
    description: 'The Dorian 3NPS pattern - natural 6th gives it a smooth minor sound.',
    difficulty: 3,
    instructions: [
      'Dorian is the minor mode with a natural 6th',
      'Common in jazz, funk, and blues',
      'Practice with a drone on the root note',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'three-nps-phrygian',
    type: 'three-nps',
    title: '3NPS - Phrygian',
    description: 'The Phrygian 3NPS pattern - exotic b2 used in flamenco and metal.',
    difficulty: 3,
    instructions: [
      'Phrygian has the exotic b2, used in flamenco and metal',
      'The half-step from b2 to root on adjacent strings creates a distinctive finger pattern',
      'Practice with a drone on the root note to hear the dark, Spanish flavor',
      'Compare with Aeolian — only the 2nd degree differs (b2 vs natural 2)',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'three-nps-lydian',
    type: 'three-nps',
    title: '3NPS - Lydian',
    description: 'The Lydian 3NPS pattern - the #4 creates a dreamy, floating quality.',
    difficulty: 3,
    instructions: [
      'Lydian\'s #4 shifts one note up per octave vs Ionian',
      'Great for fusion and film music sounds',
      'Compare with Ionian pattern — only one note differs',
      'The #4 creates a bright, ethereal quality over major chords',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'three-nps-mixolydian',
    type: 'three-nps',
    title: '3NPS - Mixolydian',
    description: 'The Mixolydian 3NPS pattern - essential for playing over dominant chords.',
    difficulty: 3,
    instructions: [
      'Mixolydian\'s b7 is essential for playing over dominant chords',
      'Compare with Ionian pattern — only one note differs',
      'Common in blues, rock, funk, and country',
      'Practice resolving the b7 down to the 6th or up to the root',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'three-nps-aeolian',
    type: 'three-nps',
    title: '3NPS - Aeolian (Natural Minor)',
    description: 'The Aeolian 3NPS pattern - the foundation for minor key shredding.',
    difficulty: 2,
    instructions: [
      'Aeolian is the natural minor scale',
      'This 3NPS pattern is the foundation for minor key shredding',
      'Compare with Dorian — only the 6th degree differs (b6 vs natural 6)',
      'Essential for rock, metal, and classical minor key playing',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'three-nps-locrian',
    type: 'three-nps',
    title: '3NPS - Locrian',
    description: 'The Locrian 3NPS pattern - diminished quality with both b2 and b5.',
    difficulty: 4,
    instructions: [
      'Locrian has both b2 and b5, giving it a diminished quality',
      'The most challenging 3NPS pattern due to its unstable sound',
      'Practice over a m7b5 (half-diminished) chord for context',
      'Compare with Phrygian — only the 5th degree differs (b5 vs natural 5)',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'three-nps-3',
    type: 'three-nps',
    title: '3NPS - All 7 Modes',
    description: 'Master all seven 3NPS patterns and connect them across the fretboard.',
    difficulty: 3,
    instructions: [
      'Learn to transition smoothly between adjacent patterns',
      'The 3 finger shapes cycle in the sequence 7-3-6-2-5-1-4 across strings',
      'Practice connecting patterns by sliding between them',
      'Drop to 2 notes per string on certain strings to convert any 3NPS pattern to an in-position (CAGED) shape',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },

  // ============ MODAL PRACTICE ============
  {
    id: 'modal-ionian',
    type: 'modal-practice',
    title: 'Ionian Mode (Major Scale)',
    description: 'Practice the Ionian mode — the major scale. The foundation for understanding all other modes.',
    difficulty: 1,
    instructions: [
      'Ionian is simply the major scale — the most familiar sound',
      'The M7 (major 7th) is its characteristic note when compared to Mixolydian',
      'This is the reference mode — all other modes are described relative to Ionian',
      'Practice hearing the "bright, happy" quality of the major scale',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
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
    difficulty: 2,
    instructions: [
      'Play each mode from the same root note',
      'Listen for how the characteristic note changes the mood',
      'This is the most effective way to internalize modal sounds',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'modal-7',
    type: 'modal-practice',
    title: 'Locrian Mode',
    description: 'Practice Locrian mode — the darkest mode with its diminished quality and characteristic b5.',
    difficulty: 4,
    instructions: [
      'Locrian is built on the 7th degree of the major scale',
      'The b2 and b5 give it an unstable, diminished sound',
      'The tritone between root and b5 defines its dissonant character',
      'Rarely used as a tonal center but essential for understanding diminished harmony',
      'Practice resolving phrases to the root despite the instability',
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
    title: 'Triad Inversions - Major',
    description: 'Master major triad inversions across multiple string sets.',
    difficulty: 2,
    instructions: [
      'Learn root position, 1st inversion, 2nd inversion',
      'Practice across D-G-B, G-B-E, A-D-G, and E-A-D string sets',
      'Play harmonized major scale using only one string set',
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
      'Practice across D-G-B, G-B-E, A-D-G, and E-A-D string sets',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'chord-6',
    type: 'chord-voicing',
    title: 'Triad Inversions - Diminished',
    description: 'Learn diminished triad inversions — the vii° chord in major keys.',
    difficulty: 3,
    instructions: [
      'Diminished = root, b3, b5 (two stacked minor 3rds)',
      'Used as vii° in major keys and as passing chords',
      'Compare with minor triads — only the 5th changes (5 → b5)',
      'Practice across all string sets',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'chord-7',
    type: 'chord-voicing',
    title: 'Triad Inversions - Augmented',
    description: 'Learn augmented triad inversions — symmetrical voicings with a unique sound.',
    difficulty: 3,
    instructions: [
      'Augmented = root, 3, #5 (two stacked major 3rds)',
      'Symmetrical: all inversions have the same interval structure',
      'Used as V+ or bVI+ for chromatic voice leading',
      'Compare with major triads — only the 5th changes (5 → #5)',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },

  // ============ PENTATONIC SCALES ============
  {
    id: 'pentatonic-1',
    type: 'pentatonic',
    title: 'Minor Pentatonic - Shape 1 (Root Position)',
    description: 'Learn the most common pentatonic box shape. Root starts on the 6th string.',
    difficulty: 1,
    instructions: [
      'This is the most commonly used pentatonic shape',
      'Root note is on the 6th and 1st strings',
      'Master this shape first before moving to others',
      'Great for blues, rock, and most improvisation',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'pentatonic-minor-2',
    type: 'pentatonic',
    title: 'Minor Pentatonic - Shape 2 (b3 Position)',
    description: 'The second minor pentatonic box, starting from the b3 degree on the lowest string.',
    difficulty: 1,
    instructions: [
      'Shape 2 starts from the b3 (minor 3rd) of the scale',
      'This shape sits directly above Shape 1 on the fretboard',
      'The overlap between Shape 1 and Shape 2 is where they share notes',
      'When extended to 7 notes, this shape becomes the Ionian (major) mode',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'pentatonic-minor-3',
    type: 'pentatonic',
    title: 'Minor Pentatonic - Shape 3 (4th Position)',
    description: 'The third minor pentatonic box, starting from the 4th degree on the lowest string.',
    difficulty: 2,
    instructions: [
      'Shape 3 starts from the 4th (perfect 4th) of the scale',
      'This is a comfortable shape with a compact fret span',
      'When extended to 7 notes, this shape becomes the Dorian mode',
      'Practice connecting Shape 2 into Shape 3 using the overlap notes',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'pentatonic-minor-4',
    type: 'pentatonic',
    title: 'Minor Pentatonic - Shape 4 (5th Position)',
    description: 'The fourth minor pentatonic box, starting from the 5th degree on the lowest string.',
    difficulty: 2,
    instructions: [
      'Shape 4 starts from the 5th (perfect 5th) of the scale',
      'This shape has the characteristic "power chord" interval at its base',
      'When extended to 7 notes, this shape becomes the Phrygian mode',
      'Practice ascending through Shapes 1-4 in one key',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'pentatonic-minor-5',
    type: 'pentatonic',
    title: 'Minor Pentatonic - Shape 5 (b7 Position)',
    description: 'The fifth minor pentatonic box, starting from the b7 degree on the lowest string.',
    difficulty: 2,
    instructions: [
      'Shape 5 starts from the b7 (minor 7th) of the scale',
      'This shape connects back to Shape 1 one octave higher',
      'When extended to 7 notes, this shape becomes the Mixolydian mode',
      'Practice descending from Shape 5 back through all shapes to Shape 1',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'pentatonic-major-1',
    type: 'pentatonic',
    title: 'Major Pentatonic - Shape 1 (Root Position)',
    description: 'The first major pentatonic box, starting from the root on the lowest string.',
    difficulty: 1,
    instructions: [
      'Shape 1 starts from the Root of the major pentatonic scale',
      'Same fingering as minor pentatonic Shape 2 but rooted differently',
      'The major pentatonic has a bright, country/pop sound',
      'When extended to 7 notes, this shape becomes the Ionian (major) mode',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'pentatonic-major-2',
    type: 'pentatonic',
    title: 'Major Pentatonic - Shape 2 (2nd Position)',
    description: 'The second major pentatonic box, starting from the 2nd degree on the lowest string.',
    difficulty: 2,
    instructions: [
      'Shape 2 starts from the 2nd degree of the major pentatonic scale',
      'This shape sits directly above Shape 1 on the fretboard',
      'When extended to 7 notes, this shape becomes the Dorian mode',
      'Practice connecting Shape 1 into Shape 2 using the overlap notes',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'pentatonic-major-3',
    type: 'pentatonic',
    title: 'Major Pentatonic - Shape 3 (3rd Position)',
    description: 'The third major pentatonic box, starting from the 3rd degree on the lowest string.',
    difficulty: 2,
    instructions: [
      'Shape 3 starts from the 3rd degree of the major pentatonic scale',
      'This is a compact shape with close fret spacing',
      'When extended to 7 notes, this shape becomes the Phrygian mode',
      'Compare this shape with minor pentatonic Shape 4',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'pentatonic-major-4',
    type: 'pentatonic',
    title: 'Major Pentatonic - Shape 4 (5th Position)',
    description: 'The fourth major pentatonic box, starting from the 5th degree on the lowest string.',
    difficulty: 2,
    instructions: [
      'Shape 4 starts from the 5th degree of the major pentatonic scale',
      'The 5th is a strong tonal anchor — use it to orient yourself',
      'When extended to 7 notes, this shape becomes the Mixolydian mode',
      'Practice ascending through Shapes 1-4 in one key',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'pentatonic-major-5',
    type: 'pentatonic',
    title: 'Major Pentatonic - Shape 5 (6th Position)',
    description: 'The fifth major pentatonic box, starting from the 6th degree on the lowest string.',
    difficulty: 2,
    instructions: [
      'Shape 5 starts from the 6th degree of the major pentatonic scale',
      'This shape connects back to Shape 1 one octave higher',
      'When extended to 7 notes, this shape becomes the Aeolian (natural minor) mode',
      'This is the same as minor pentatonic Shape 1 of the relative minor key',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'pentatonic-4',
    type: 'pentatonic',
    title: 'Pentatonic to Modes Progression',
    description: 'See how each pentatonic shape extends to its parent Greek mode by adding 2 notes.',
    difficulty: 3,
    instructions: [
      'Each pentatonic box adds 2 notes to become a 7-note mode',
      'Shape 1 → Aeolian, Shape 2 → Ionian, Shape 3 → Dorian',
      'Shape 4 → Phrygian, Shape 5 → Mixolydian',
      'This bridges pentatonic playing to modal improvisation',
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
    difficulty: 4,
    instructions: [
      'A key will be established, then a note played',
      'Identify the scale degree (1-7)',
      'This is how professional musicians hear music',
      'More useful than absolute pitch for most purposes',
    ],
    audioRequired: true,
    fretboardRequired: false,
  },

  // ============ CHORD PROGRESSIONS ============
  {
    id: 'chord-prog-1',
    type: 'chord-progression',
    title: 'Chord Progressions - I IV V',
    description: 'Identify basic progressions using the three primary major chords.',
    difficulty: 2,
    instructions: [
      'A chord progression will play in a random key',
      'Listen to the bass movement and chord qualities',
      'Identify the Roman numeral progression',
      'Uppercase = major, lowercase = minor',
    ],
    audioRequired: true,
    fretboardRequired: false,
  },
  {
    id: 'chord-prog-2',
    type: 'chord-progression',
    title: 'Chord Progressions - Pop & Rock',
    description: 'Recognize common pop and rock progressions including the vi chord.',
    difficulty: 3,
    instructions: [
      'These progressions use I, IV, V, vi, and ii chords',
      'The vi chord is relative minor — listen for the darker sound',
      'The ii chord often leads to V (ii-V is a strong pull)',
      'Try to follow the bass note movement',
    ],
    audioRequired: true,
    fretboardRequired: false,
  },
  {
    id: 'chord-prog-3',
    type: 'chord-progression',
    title: 'Chord Progressions - Advanced',
    description: 'Identify advanced progressions with borrowed chords and less common movements.',
    difficulty: 4,
    instructions: [
      'Includes borrowed chords like bVII and iv',
      'bVII is a major chord one whole step below the tonic',
      'iv is the minor version of the IV chord (borrowed from minor key)',
      'Listen carefully to unexpected chord qualities',
    ],
    audioRequired: true,
    fretboardRequired: false,
  },

  // ============ HARMONIC & MELODIC MINOR ============
  {
    id: 'modal-8',
    type: 'modal-practice',
    title: 'Harmonic Minor Scale',
    description: 'Practice the harmonic minor scale — essential for V7→i resolution in minor keys.',
    difficulty: 3,
    instructions: [
      'Harmonic minor = natural minor with a raised 7th (M7 instead of b7)',
      'The augmented 2nd between b6 and M7 gives it a distinctive "exotic" sound',
      'Creates a dominant V chord in minor keys (essential for classical and jazz)',
      'Practice resolving the M7 up to the root for strong cadences',
      'Compare with natural minor (Aeolian) to hear the raised 7th',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'modal-9',
    type: 'modal-practice',
    title: 'Melodic Minor Scale (Ascending)',
    description: 'Practice the melodic minor scale — natural 6th and major 7th over a minor tonic.',
    difficulty: 3,
    instructions: [
      'Melodic minor = natural minor with raised 6th and 7th',
      'Removes the awkward augmented 2nd from harmonic minor',
      'Parent scale of Lydian Dominant, Altered, and other jazz modes',
      'Compare with Dorian (shares the natural 6th) and harmonic minor (shares the M7)',
      'Used extensively in jazz improvisation',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
  {
    id: 'modal-10',
    type: 'modal-practice',
    title: 'Blues Scale',
    description: 'Practice the blues scale — minor pentatonic with the added b5 "blue note".',
    difficulty: 2,
    instructions: [
      'Blues scale = minor pentatonic + b5 (the "blue note")',
      'Formula: 1, b3, 4, b5, 5, b7 — six notes total',
      'The b5 creates tension that resolves to either the 4th or the 5th',
      'Use the blue note as a passing tone — don\'t linger on it',
      'Essential for blues, rock, jazz, and funk improvisation',
      'Play over a dominant 7th drone for the classic blues sound',
    ],
    audioRequired: true,
    fretboardRequired: true,
  },
];

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

/** Human-readable labels for exercise types. New types without an entry get auto-formatted. */
const CATEGORY_LABELS: Record<string, string> = {
  'note-identification': 'Note Identification',
  'caged-system': 'CAGED System',
  'pentatonic': 'Pentatonic Scales',
  'three-nps': '3-Notes-Per-String',
  'modal-practice': 'Modal Practice',
  'interval-recognition': 'Interval Recognition',
  'chord-voicing': 'Chord Voicings',
  'ear-training': 'Ear Training',
  'chord-progression': 'Chord Progressions',
};

function formatTypeLabel(type: string): string {
  return CATEGORY_LABELS[type] ??
    type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Get exercise categories — derived automatically from exerciseData.
 * Adding exercises with a new type is all that's needed for them to appear here.
 */
export function getExerciseCategories(): { type: string; label: string; count: number }[] {
  const seen = new Map<string, number>();
  for (const ex of exerciseData) {
    seen.set(ex.type, (seen.get(ex.type) ?? 0) + 1);
  }
  return Array.from(seen.entries()).map(([type, count]) => ({
    type,
    label: formatTypeLabel(type),
    count,
  }));
}