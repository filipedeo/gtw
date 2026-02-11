# Exercise Specifications
## Guitar Theory Web App - Detailed Exercise Design

---

## 1. Note Identification Exercises

### 1.1 Basic Note Recognition
**Goal**: Develop instant note recognition across the entire fretboard

```typescript
interface NoteIdentificationConfig {
  difficulty: number;           // 1-10 scale
  stringRange: [number, number]; // [0,6] for 7-string, [0,5] for 6-string
  fretRange: [number, number];   // [0,3] beginner to [0,24] advanced
  timeLimit: number;             // Response time in milliseconds
  visualHints: boolean;          // Show octave dots, string names
  includeAccidentals: boolean;   // Include sharps/flats or naturals only
}

interface NoteIdentificationExercise extends Exercise {
  metadata: {
    targetPosition: FretPosition;
    expectedNote: string;
    allowedAnswers: string[];    // ["F#", "Gb"] for enharmonic equivalents
    hintAvailable: boolean;
  };
}
```

**Progressive Difficulty Levels**:
1. **Beginner (1-3)**: Open strings and natural notes on frets 1-3
2. **Intermediate (4-6)**: All notes including accidentals, frets 1-7
3. **Advanced (7-8)**: Extended fretboard positions, frets 8-12
4. **Expert (9-10)**: Full 24-fret neck, no visual aids, sub-1-second timing

**Exercise Variations**:
- **String-specific drill**: Focus on one string at a time
- **Position-specific drill**: Focus on one fret position across all strings
- **Random selection**: Mixed positions for comprehensive practice
- **Interval drill**: "Find the note a perfect 5th above this position"

### 1.2 Octave Recognition
**Goal**: Identify the same note across different octaves

```typescript
interface OctaveExercise extends Exercise {
  metadata: {
    rootNote: string;           // "C" 
    octavePositions: FretPosition[]; // All C positions on fretboard
    targetOctave: number;       // 2, 3, 4, 5, 6
    allowPartialCredit: boolean; // Accept correct note wrong octave
  };
}
```

### 1.3 Enharmonic Recognition
**Goal**: Understand enharmonic equivalents (F# = Gb)

```typescript
interface EnharmonicExercise extends Exercise {
  metadata: {
    targetPosition: FretPosition;
    enharmonicPair: [string, string]; // ["F#", "Gb"]
    requireBothNames: boolean;        // Must provide both forms
    contextualHint: string;          // "In the key of D major, this note is..."
  };
}
```

---

## 2. Modal Practice Exercises

### 2.1 Characteristic Note Focus
**Goal**: Internalize modal sounds through characteristic note emphasis

```typescript
interface ModalPracticeConfig {
  mode: ModeName;
  root: string;
  practiceType: 'listening' | 'identification' | 'improvisation';
  droneEnabled: boolean;
  characteristicEmphasis: boolean;
  stringCount: 6 | 7;
}

enum ModeName {
  IONIAN = 'ionian',
  DORIAN = 'dorian', 
  PHRYGIAN = 'phrygian',
  LYDIAN = 'lydian',
  MIXOLYDIAN = 'mixolydian',
  AEOLIAN = 'aeolian',
  LOCRIAN = 'locrian'
}

interface ModalCharacteristicExercise extends Exercise {
  metadata: {
    mode: ModeName;
    root: string;
    scale: {
      notes: string[];
      degrees: number[];
      characteristicDegrees: number[];
    };
    droneNote: string;
    testPositions: FretPosition[];
    audioSequence: {
      droneStart: number;        // Start drone at beginning
      scalePlaythrough: number;  // Play full scale
      emphasizeCharacteristic: number; // Highlight characteristic notes
      testPhase: number;         // User responds
    };
  };
}
```

**Exercise Flow**:
1. **Drone Introduction** (10 seconds): Establish tonal center
2. **Scale Demonstration** (15 seconds): Play scale with characteristic notes emphasized
3. **Listening Phase** (20 seconds): Scale passages highlighting the modal character
4. **Recognition Phase** (30 seconds): User identifies the mode from audio examples
5. **Practice Phase** (60 seconds): User plays along, emphasizing characteristic notes

**Difficulty Progression**:
- **Level 1**: Major modes only (Ionian, Lydian, Mixolydian) with strong drone
- **Level 2**: Minor modes (Dorian, Phrygian, Aeolian) with clear characteristic emphasis  
- **Level 3**: Locrian mode with reduced drone volume
- **Level 4**: Mode comparison exercises (same root, different modes)
- **Level 5**: Real musical examples using each mode

### 2.2 Mode Comparison Exercises
**Goal**: Hear the difference between modes on the same root

```typescript
interface ModeComparisonExercise extends Exercise {
  metadata: {
    rootNote: string;
    modeA: ModeName;
    modeB: ModeName;
    playbackSequence: {
      modeADemonstration: AudioClip;
      modeBDemonstration: AudioClip;
      testClip: AudioClip;      // User must identify which mode
    };
    targetMode: ModeName;       // Correct answer
    characteristic Difference: {
      degree: number;           // Which scale degree differs
      modeANote: string;        // Note in mode A
      modeBNote: string;        // Note in mode B  
    };
  };
}
```

### 2.3 Modal Improvisation Guidance
**Goal**: Apply modal knowledge in improvisation context

```typescript
interface ModalImprovisationExercise extends Exercise {
  metadata: {
    mode: ModeName;
    backingTrack: {
      chordProgression: string[]; // ["Am7", "Dm7", "G7", "Cmaj7"] for A Dorian
      tempo: number;
      keySignature: string;
      rootEmphasis: number[];     // Beat numbers where root is emphasized
    };
    practiceInstructions: {
      emphasizeNotes: string[];  // Characteristic notes to highlight
      avoidNotes: string[];      // Notes that sound weak in this mode
      suggestedLicks: FretPosition[][];  // Pre-composed modal phrases
    };
  };
}
```

---

## 3. Drop 2 Voicing System

### 3.1 Voicing Recognition
**Goal**: Instantly recognize and name Drop 2 chord voicings

```typescript
interface Drop2VoicingConfig {
  chordQuality: ChordQuality;
  inversion: 0 | 1 | 2 | 3;    // Root, 1st, 2nd, 3rd inversion
  stringSet: StringSet;         // Which 4 strings to use
  showVoiceLeading: boolean;    // Highlight voice movement
}

enum ChordQuality {
  MAJOR7 = 'maj7',
  DOMINANT7 = '7', 
  MINOR7 = 'm7',
  MINOR7B5 = 'm7b5',
  DIMINISHED7 = 'dim7',
  MINOR_MAJOR7 = 'mMaj7'
}

enum StringSet {
  STRINGS_6543 = '6543',       // Low E, A, D, G strings
  STRINGS_5432 = '5432',       // A, D, G, B strings  
  STRINGS_4321 = '4321'        // D, G, B, high E strings
}

interface Drop2VoicingExercise extends Exercise {
  metadata: {
    voicing: {
      chordSymbol: string;      // "Cmaj7"
      quality: ChordQuality;
      inversion: number;
      stringSet: StringSet;
      frets: number[];          // [3, 2, 0, 0] for example
      notes: string[];          // ["G3", "C4", "E4", "B4"]
      intervals: string[];      // ["5", "1", "3", "7"] for root position
    };
    displayOptions: {
      showChordSymbol: boolean;
      showNoteNames: boolean;
      showIntervals: boolean;
      showFretNumbers: boolean;
    };
    userTask: 'identify_quality' | 'identify_inversion' | 'identify_root' | 'play_voicing';
  };
}
```

**Exercise Types**:

1. **Visual Recognition**: Show fretboard position, identify chord quality and inversion
2. **Audio Recognition**: Play voicing, identify without visual
3. **Construction**: Given chord symbol and inversion, build the voicing
4. **Voice Leading**: Connect two voicings with smooth movement

### 3.2 Voice Leading Exercises
**Goal**: Connect Drop 2 voicings with minimal finger movement

```typescript
interface VoiceLeadingExercise extends Exercise {
  metadata: {
    progression: {
      chords: string[];          // ["Dm7", "G7", "Cmaj7"]
      voicings: Drop2Voicing[];  // Corresponding voicing for each chord
      voiceMovement: {
        from: Drop2Voicing;
        to: Drop2Voicing;
        movements: VoiceMovement[]; // How each voice moves
      }[];
    };
    practiceInstructions: {
      tempo: number;
      strummingPattern: string;   // "Down, Down, Up-Down, Up"
      metronomeEnabled: boolean;
      showFingerMovement: boolean; // Animate transitions
    };
    success Criteria: {
      maxFingerMovement: number;  // Total frets moved across all fingers
      timing Accuracy: number;     // Rhythm precision requirement
      cleanTransitions: boolean;   // No muted or buzzing notes
    };
  };
}

interface VoiceMovement {
  voice: 'bass' | 'tenor' | 'alto' | 'soprano';
  fromNote: string;
  toNote: string;
  interval: string;              // "m2" for minor second movement
  fingerMovement: number;        // Frets moved (+ up, - down, 0 static)
}
```

**Voice Leading Rules Practice**:
- Parallel motion in all voices (smooth, but less interesting)
- Contrary motion (bass moves opposite to upper voices)
- Common tone retention (hold notes that appear in both chords)
- Chromatic movement (step-wise voice leading)

### 3.3 7-String Extended Voicings
**Goal**: Utilize the low B string for enhanced bass register

```typescript
interface Extended7StringVoicing extends Drop2Voicing {
  bassNote: {
    string: 6;                  // Low B string (0-indexed from high E)
    fret: number;
    note: string;
    function: 'root' | '3rd' | '5th' | '7th' | 'extension'; // Role in chord
  };
  orchestralSpacing: {
    bassRegister: string[];     // Notes below middle C
    middleRegister: string[];   // Middle C to C5
    trebleRegister: string[];   // Above C5  
  };
}
```

**7-String Specific Exercises**:
1. **True Bass Roots**: Use low B string for actual bass register roots
2. **Orchestral Voicings**: Spread chord across full 7-string range
3. **Bass Line Integration**: Independent bass movement while maintaining upper voicing
4. **Extended Chord Voicings**: Add 9ths, 11ths, 13ths using low B string

---

## 4. Ear Training Exercises

### 4.1 Guitar-Timbre Interval Recognition
**Goal**: Recognize intervals using actual guitar sounds, not piano

```typescript
interface GuitarIntervalExercise extends Exercise {
  metadata: {
    interval: {
      name: string;             // "Perfect 5th"
      semitones: number;        // 7
      shortName: string;        // "P5"
      quality: 'perfect' | 'major' | 'minor' | 'augmented' | 'diminished';
    };
    audioConfig: {
      timbre: GuitarTimbre;     // Clean, distorted, acoustic
      playback: 'harmonic' | 'melodic_ascending' | 'melodic_descending';
      rootNote: string;
      secondNote: string;
      bassString: boolean;      // Use lower strings for more realistic guitar sound
    };
    fretboardVisualization: {
      showPositions: boolean;   // Show both notes on fretboard
      highlightInterval: boolean; // Color-code the interval shape
      showMultiplePositions: boolean; // Same interval in different fret positions
    };
    responseOptions: string[]; // ["P1", "m2", "M2", "m3", "M3", "P4", "TT", "P5", "m6", "M6", "m7", "M7", "P8"]
  };
}
```

**Guitar-Specific Considerations**:
- **String Pair Training**: Same interval sounds different on bass vs. treble strings
- **Position-Dependent Timbres**: 12th fret harmonics vs. open strings vs. high fret positions
- **Playing Technique Variants**: Fingerpicked vs. picked vs. tapped intervals
- **Chord Context**: Intervals within chord voicings vs. isolated intervals

### 4.2 Functional Ear Training with Guitar
**Goal**: Hear scale degrees in guitar musical context

```typescript
interface FunctionalGuitarExercise extends Exercise {
  metadata: {
    key: string;                // "C major"
    scaleDegree: {
      number: number;           // 1-7
      name: string;             // "Do", "Re", "Mi", etc.
      quality: string;          // "Tonic", "Supertonic", etc.
      stability: 'stable' | 'active'; // Tendency to resolve
    };
    musicalContext: {
      backingChord: string;     // "Cmaj7" - harmonic context
      playbackStyle: 'arpeggio' | 'chord_strum' | 'fingerpicked';
      followedBy?: number;      // Next scale degree to show resolution tendency
    };
    guitarSpecificElements: {
      position: number;         // Which CAGED position
      stringUsed: number;       // Which string for the test note
      fretPosition: number;     // Which fret
      openStringAvailable: boolean; // Can use open string
    };
  };
}
```

**Exercise Variations**:
1. **Scale Degree Identification**: "Which scale degree is this?"
2. **Tendency Recognition**: "Does this note want to resolve up or down?"
3. **Stability Assessment**: "Is this a stable or active tone?"
4. **Resolution Practice**: "Play the note this wants to resolve to"

### 4.3 Chord Quality Recognition
**Goal**: Identify chord qualities using guitar voicings and timbres

```typescript
interface ChordQualityExercise extends Exercise {
  metadata: {
    chordQualities: ChordQuality[];  // Which qualities included in this exercise
    voicingType: 'open' | 'barre' | 'drop2' | 'drop3' | 'mixed';
    position: number;                // Fret position for barre chords
    playbackStyle: {
      attack: 'strummed' | 'fingerpicked' | 'blocked';
      duration: number;              // How long chord sustains
      dynamics: 'soft' | 'medium' | 'hard';
    };
    targetChord: {
      symbol: string;                // "Am7"
      quality: ChordQuality;
      voicing: FretPosition[];
      function: string;              // "ii chord in G major"
    };
    responseFormat: 'multiple_choice' | 'type_symbol' | 'fretboard_construction';
  };
}
```

**Difficulty Progression**:
1. **Basic Triads**: Major, minor, diminished, augmented
2. **Seventh Chords**: Major 7, dominant 7, minor 7, diminished 7
3. **Extended Chords**: 9ths, 11ths, 13ths
4. **Altered Chords**: b5, #5, #11, b13
5. **Complex Voicings**: Rootless, upper structure triads, polychords

---

## 5. Harmonic Analysis Exercises

### 5.1 Chord Progression Recognition
**Goal**: Identify common progressions in real musical context

```typescript
interface ProgressionAnalysisExercise extends Exercise {
  metadata: {
    progression: {
      romanNumerals: string[];   // ["ii", "V", "I"]
      chordSymbols: string[];    // ["Dm7", "G7", "Cmaj7"]
      key: string;               // "C major"
      functions: string[];       // ["Predominant", "Dominant", "Tonic"]
    };
    audioExample: {
      style: 'jazz' | 'pop' | 'rock' | 'classical' | 'latin';
      tempo: number;
      instruments: string[];     // ["guitar", "bass", "drums"]
      voicings: 'simple' | 'complex' | 'mixed';
    };
    analysisTask: {
      identify: 'roman_numerals' | 'chord_symbols' | 'key_center' | 'cadence_type';
      complexity: 'diatonic' | 'secondary_dominants' | 'modulation' | 'chromatic';
      contextProvided: boolean;  // Is key signature given?
    };
  };
}
```

**Common Progressions Database**:
- **I-V-vi-IV** (pop/rock): C-G-Am-F
- **ii-V-I** (jazz): Dm7-G7-Cmaj7
- **vi-IV-I-V** (ballad): Am-F-C-G
- **I-vi-ii-V** (circle): C-Am-Dm-G
- **iii-vi-ii-V-I** (jazz turnaround): Em7-Am7-Dm7-G7-Cmaj7

### 5.2 Secondary Dominants and Modulation
**Goal**: Recognize advanced harmonic movement

```typescript
interface AdvancedHarmonyExercise extends Exercise {
  metadata: {
    harmonyType: 'secondary_dominant' | 'secondary_leading_tone' | 'neapolitan' | 'augmented_sixth' | 'modulation';
    analysisLevel: 'identification' | 'construction' | 'resolution';
    musicalExample: {
      originalKey: string;
      targetKey?: string;        // For modulations
      pivotChord?: string;       // Common chord for modulation
      chromaticChords: {
        symbol: string;
        function: string;        // "V7/vi" for secondary dominant
        resolution: string;      // Where it resolves
      }[];
    };
  };
}
```

### 5.3 Real Song Analysis
**Goal**: Apply theory knowledge to actual music

```typescript
interface RealSongAnalysisExercise extends Exercise {
  metadata: {
    song: {
      title: string;
      artist: string;
      genre: string;
      yearReleased: number;
      keySignature: string;
    };
    analysisSection: {
      sectionName: 'intro' | 'verse' | 'chorus' | 'bridge' | 'solo';
      measures: number[];        // Which measures to analyze
      chordProgression: string[];
      notable Features: string[]; // ["Secondary dominant", "Modal interchange"]
    };
    guitarElements: {
      voicingType: string;       // "Open chords", "Barre chords", "Jazz voicings"
      techniques: string[];      // ["Fingerpicking", "Strumming", "Arpeggiation"]
      tuning: string;           // "Standard", "Drop D", "DADGAD"
    };
    learningObjectives: string[]; // What student should learn from this example
  };
}
```

---

## 6. Exercise Difficulty Scaling System

### 6.1 Adaptive Difficulty Algorithm
```typescript
interface DifficultyScaler {
  calculateOptimalDifficulty(userStats: ExerciseStats): number;
  adjustAfterResponse(currentDifficulty: number, response: ExerciseResponse): number;
  getDifficultyModifiers(exerciseType: ExerciseType): DifficultyModifiers;
}

interface DifficultyModifiers {
  timeMultiplier: number;      // Adjust response time based on difficulty
  complexityIncrease: number;  // Add more chord extensions, accidentals, etc.
  visualAidReduction: number;  // Remove helpful visual cues
  contextReduction: number;    // Less musical context, more isolated examples
}
```

### 6.2 Mastery Criteria
**Definition of mastery for each exercise type**:

```typescript
interface MasteryCriteria {
  accuracyThreshold: number;    // Minimum accuracy percentage
  speedThreshold: number;       // Maximum response time in milliseconds  
  consistencyRequirement: number; // Consecutive correct responses needed
  retentionTest: {
    delayDays: number;         // How long after learning to test retention
    accuracyMaintained: number; // Required accuracy after delay
  };
}

const MASTERY_STANDARDS = {
  [ExerciseType.NOTE_IDENTIFICATION]: {
    accuracyThreshold: 0.95,
    speedThreshold: 1000,      // 1 second
    consistencyRequirement: 10,
    retentionTest: { delayDays: 7, accuracyMaintained: 0.90 }
  },
  [ExerciseType.MODAL_PRACTICE]: {
    accuracyThreshold: 0.85,
    speedThreshold: 3000,      // 3 seconds
    consistencyRequirement: 5,
    retentionTest: { delayDays: 14, accuracyMaintained: 0.80 }
  },
  [ExerciseType.DROP2_VOICING]: {
    accuracyThreshold: 0.90,
    speedThreshold: 2000,      // 2 seconds
    consistencyRequirement: 8,
    retentionTest: { delayDays: 10, accuracyMaintained: 0.85 }
  }
} as const;
```

### 6.3 Progress Visualization
```typescript
interface ExerciseProgress {
  currentLevel: number;         // 1-10 difficulty scale
  masteryPercentage: number;    // 0-100% toward mastery
  weakAreas: string[];          // Specific areas needing work
  nextMilestone: {
    description: string;        // "Master Drop 2 voicings on string set 6-5-4-3"
    exercisesRemaining: number;
    estimatedTimeHours: number;
  };
  recentTrends: {
    accuracyTrend: 'improving' | 'stable' | 'declining';
    speedTrend: 'improving' | 'stable' | 'declining';
    difficultyProgression: number[]; // Last 10 difficulty levels attempted
  };
}
```

---

## 7. Success Metrics and Analytics

### 7.1 Individual Exercise Metrics
```typescript
interface ExerciseMetrics {
  // Performance metrics
  accuracy: number;             // Percentage correct
  averageResponseTime: number;  // Milliseconds
  improvementRate: number;      // Accuracy change over time
  difficultyProgression: number; // How quickly advancing through levels
  
  // Engagement metrics  
  sessionsCompleted: number;
  totalTimeSpent: number;       // Minutes
  consecutiveDays: number;      // Current streak
  dropoffPoints: number[];      // Difficulty levels where users quit
  
  // Learning effectiveness
  retentionRate: number;        // Accuracy after time delay
  transferLearning: number;     // Performance on related exercises
  errorPatterns: ErrorPattern[]; // Common mistake types
}

interface ErrorPattern {
  errorType: string;            // "Confuses F# with G", "Struggles with upper frets"
  frequency: number;            // How often this error occurs
  difficulty: number;           // At what difficulty level
  improvementRate: number;      // How quickly error is being corrected
}
```

### 7.2 Learning Path Analytics
```typescript
interface LearningPathAnalytics {
  optimalSequence: ExerciseType[]; // Data-driven exercise ordering
  prerequisiteMap: Map<ExerciseType, ExerciseType[]>; // Required skills
  masteryTime: Map<ExerciseType, number>; // Average time to master
  difficultySpikes: {
    exerciseType: ExerciseType;
    difficultyLevel: number;
    dropoffRate: number;        // Percentage of users who quit here
    recommendations: string[];   // How to ease this transition
  }[];
}
```

---

This comprehensive exercise specification provides the detailed framework needed to implement an effective guitar theory learning system. Each exercise type includes multiple difficulty levels, clear success criteria, and data-driven optimization opportunities to ensure maximum learning effectiveness.