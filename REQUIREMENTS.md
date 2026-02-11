# Guitar Theory Web App Requirements
## Product Requirements Document (PRD)

> **Vision**: A modern web application that combines fretboard visualization, music theory instruction, ear training, and practice analytics in one unified learning environment with full 6/7-string guitar support.

---

## 1. MVP Feature Set (Core 5-7 Features)

Based on the comprehensive research identifying market gaps, the MVP will address the biggest unmet needs:

### 1.1 Interactive Fretboard Visualization
- **Canvas/SVG-based fretboard** with smooth animations and color coding
- **6/7-string support** with configurable tunings (standard, drop, custom)
- **Multi-mode display**: notes, intervals, scale degrees, chord tones
- **Click-to-play audio** for any fretted position
- **Progressive disclosure**: highlight only relevant notes based on current exercise

### 1.2 Characteristic Note Modal Practice
- **Modal ear training** using the characteristic note approach from research
- **Drone backing tracks** for each mode to develop modal hearing
- **Mode comparison exercises**: same root, different modes to hear contrasts
- **7-string extended patterns** with low B string integration

### 1.3 Drop 2 Voicing System
- **Complete Drop 2 chord library**: 4 inversions × 6 qualities × 3 string sets = 72 voicings
- **Voice leading exercises** with visual fretboard feedback
- **Progression practice**: ii-V-I sequences with smooth voice movement
- **7-string bass register support** for true bass notes in B-Eb range

### 1.4 Guitar-Timbre Ear Training
- **Functional ear training** with actual guitar samples (clean, distorted, acoustic)
- **Scale degree recognition** in guitar context, not piano
- **Interval identification** mapped to fretboard shapes
- **Chord quality recognition** using guitar voicings

### 1.5 Spaced Repetition Practice System
- **SM-2 algorithm implementation** for optimal review scheduling
- **Weak area detection** based on response times and accuracy
- **Daily practice sessions** with adaptive difficulty
- **Progress analytics** showing improvement over time

### 1.6 Note Identification Mastery
- **Random fretboard position generator** with 1-second response target
- **String-specific practice modes** for building fluency per string
- **Interval visualization** showing relationships between fretted notes
- **Performance tracking** toward 4-6 week fluency goal

### 1.7 Real-Song Integration
- **Chord progression practice** with common sequences (I-V-vi-IV, ii-V-I)
- **Harmonic analysis tools** for user-uploaded progressions
- **Key center practice** with backing tracks in all 12 keys

---

## 2. Technical Architecture

### 2.1 Core Tech Stack
```
Framework:       React 19 + TypeScript
Build Tool:      Vite
State:           Zustand (primary) + Jotai (fine-grained atoms)
Styling:         Tailwind CSS + CSS Modules for components
Fretboard:       HTML5 Canvas for performance, SVG fallback
Audio:           Tone.js + Web Audio API
Music Theory:    tonal.js for all theory calculations
Persistence:     IndexedDB via Dexie.js
PWA:             Workbox for offline support
Deployment:      Vercel (primary) or Cloudflare Pages
```

### 2.2 Project Structure
```
src/
├── components/
│   ├── fretboard/
│   │   ├── Fretboard.tsx           # Main canvas component
│   │   ├── FretboardControls.tsx   # Tuning, string count, display mode
│   │   └── FretPosition.tsx        # Individual fret/string intersection
│   ├── exercises/
│   │   ├── ModalPractice.tsx       # Characteristic note exercises
│   │   ├── NoteIdentification.tsx  # Random note naming
│   │   ├── VoicingPractice.tsx     # Drop 2 chord practice
│   │   └── EarTraining.tsx         # Guitar-timbre intervals
│   ├── audio/
│   │   ├── AudioEngine.tsx         # Tone.js wrapper
│   │   ├── GuitarSampler.tsx       # Multi-timbral guitar samples
│   │   └── MetronomeProvider.tsx   # Practice tempo support
│   └── analytics/
│       ├── ProgressChart.tsx       # Performance visualization
│       ├── WeakAreasPanel.tsx      # Spaced repetition insights
│       └── SessionSummary.tsx      # Post-practice review
├── stores/
│   ├── practiceStore.ts            # Session state, responses
│   ├── progressStore.ts            # Long-term analytics
│   ├── fretboardStore.ts           # Display state, tuning
│   └── audioStore.ts               # Audio settings, samples
├── theory/
│   ├── scales.ts                   # Scale definitions, modes
│   ├── chords.ts                   # Voicing calculations
│   ├── fretboard.ts                # Note mapping utilities
│   └── exercises.ts                # Exercise generation logic
├── data/
│   ├── progressions.ts             # Common chord sequences
│   ├── tunings.ts                  # Guitar tuning presets
│   └── samples.ts                  # Audio sample metadata
└── utils/
    ├── spacedRepetition.ts         # SM-2 algorithm
    ├── audioAnalysis.ts            # Response timing, accuracy
    └── performance.ts              # Canvas optimization
```

### 2.3 Key Dependencies
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "typescript": "^5.0.0",
    "tonal": "^5.0.0",
    "tone": "^15.0.0",
    "zustand": "^4.5.0",
    "jotai": "^2.6.0",
    "dexie": "^3.2.0",
    "tailwindcss": "^3.4.0",
    "canvas-confetti": "^1.9.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "@types/web-audio-api": "^0.0.0"
  }
}
```

---

## 3. Exercise Framework

### 3.1 Base Exercise Interface
```typescript
interface Exercise {
  id: string;
  type: ExerciseType;
  difficulty: number;          // 1-10 scale
  targetAccuracy: number;      // 0.8 = 80% target
  maxAttempts: number;         // Before showing answer
  timeoutMs: number;           // Response time limit
  metadata: ExerciseMetadata;
}

interface ExerciseResponse {
  exerciseId: string;
  attempt: number;
  responseTimeMs: number;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  timestamp: number;
}

interface ProgressData {
  totalAttempts: number;
  correctAttempts: number;
  averageResponseTime: number;
  easeFactor: number;          // SM-2 spaced repetition
  nextReviewDate: number;
  consecutiveCorrect: number;
}
```

### 3.2 Exercise Types
```typescript
enum ExerciseType {
  NOTE_IDENTIFICATION = 'note_id',
  INTERVAL_IDENTIFICATION = 'interval_id',
  CHORD_IDENTIFICATION = 'chord_id',
  SCALE_DEGREE_IDENTIFICATION = 'scale_degree_id',
  MODE_CHARACTERISTIC_NOTE = 'mode_char_note',
  DROP2_VOICING = 'drop2_voicing',
  VOICE_LEADING = 'voice_leading',
  HARMONIC_ANALYSIS = 'harmonic_analysis'
}
```

### 3.3 Progression System
- **No forced progression** - users can practice any exercise at any time
- **Difficulty scaling** - exercises auto-adjust based on performance
- **Spaced repetition scheduling** - weak areas resurface more frequently
- **Session variety** - multiple exercise types per session to maintain engagement
- **Achievement unlocks** - new tunings, advanced voicings, extended range scales

---

## 4. Audio Requirements

### 4.1 Guitar Sample Library
```typescript
interface GuitarSample {
  note: string;              // "C4", "F#2"
  timbre: GuitarTimbre;      // Clean, Distorted, Acoustic
  velocity: number;          // 0-127 MIDI velocity
  duration: number;          // Sample length in seconds
  url: string;               // Path to audio file
}

enum GuitarTimbre {
  CLEAN_ELECTRIC = 'clean',
  DISTORTED = 'distorted', 
  ACOUSTIC_STEEL = 'acoustic_steel',
  ACOUSTIC_NYLON = 'acoustic_nylon'
}
```

### 4.2 Audio Capabilities Required
- **Multi-timbral guitar samples** covering common playing contexts
- **Chord playback** for Drop 2 voicings across all inversions
- **Drone tones** for modal practice (all 12 chromatic roots)
- **Metronome functionality** with subdivisions and accent patterns
- **Volume mixing** between practice audio and backing tracks
- **Real-time synthesis** for scales, arpeggios, and interval examples

### 4.3 Audio Implementation
- **Tone.js Sampler** for realistic guitar sounds
- **Tone.js Synth** for drones and metronome clicks
- **Web Audio API** for precise timing and effects
- **Audio context management** for mobile browser compatibility
- **Preloading strategy** for smooth exercise transitions

---

## 5. Fretboard Visualization Specs

### 5.1 Rendering Specifications
```typescript
interface FretboardConfig {
  stringCount: 6 | 7 | 8;
  tuning: string[];           // ["E4", "B3", "G3", "D3", "A2", "E2"] for standard
  fretCount: number;          // 12, 15, 17, 21, 24
  displayMode: DisplayMode;
  highlightedPositions: FretPosition[];
  colorScheme: ColorScheme;
}

interface FretPosition {
  string: number;             // 0-indexed from highest
  fret: number;               // 0 = open string
  note?: string;              // "C4" if specified
  label?: string;             // "R", "3", "b7" for display
  color?: string;             // Override default color
}

enum DisplayMode {
  NOTES = 'notes',            // Show note names
  INTERVALS = 'intervals',    // Show interval from root
  DEGREES = 'degrees',        // Show scale degrees
  CHORD_TONES = 'chord_tones' // Show R, 3, 5, 7, etc.
}
```

### 5.2 Visual Features
- **Canvas-based rendering** for smooth animations and performance
- **Responsive design** that scales from mobile to desktop
- **Color-coded note highlighting** with accessibility-compliant contrast
- **Hover states** showing note information and click-to-play feedback
- **Animation transitions** when changing modes or highlighting patterns
- **Left-handed layout option** for reversed string order

### 5.3 Interaction Patterns
- **Click any position** to play that note
- **Hover for note preview** without audio (mobile: tap once, tap again to play)
- **Swipe gestures on mobile** for changing fret range view
- **Keyboard navigation** for accessibility (arrow keys, space to play)
- **MIDI controller support** via Web MIDI API for external fretboard controllers

---

## 6. Data Model

### 6.1 Core Entities
```typescript
// User progress and analytics
interface UserProfile {
  id: string;
  createdAt: number;
  preferences: UserPreferences;
  stats: GlobalStats;
}

interface UserPreferences {
  defaultTuning: string[];
  defaultStringCount: 6 | 7;
  audioTimbre: GuitarTimbre;
  sessionLength: number;       // Target minutes per session
  difficultyPreference: 'adaptive' | 'manual';
  colorScheme: 'light' | 'dark' | 'auto';
}

// Exercise performance tracking
interface ExerciseStats {
  exerciseType: ExerciseType;
  totalSessions: number;
  totalTimeMinutes: number;
  accuracy: number;            // Current rolling average
  averageResponseTime: number; // Current rolling average
  bestStreak: number;
  currentStreak: number;
  lastPracticedAt: number;
  easeFactor: number;          // Spaced repetition
  nextReviewAt: number;
}

// Music theory entities
interface Scale {
  name: string;                // "C Major", "A Natural Minor"
  root: string;                // "C", "A"
  intervals: number[];         // [0, 2, 4, 5, 7, 9, 11] for major
  mode?: string;               // "Ionian", "Dorian"
  characteristicDegrees?: number[]; // [4, 7] for Lydian
}

interface ChordVoicing {
  symbol: string;              // "Cmaj7"
  type: VoicingType;           // DROP2, DROP3, CLOSED
  inversion: number;           // 0, 1, 2, 3
  stringSet: number[];         // [3, 2, 1, 0] for strings used
  frets: number[];             // Fret numbers for each string
  notes: string[];             // Note names for verification
}
```

### 6.2 IndexedDB Schema
```typescript
// Dexie.js database schema
class GuitarTheoryDB extends Dexie {
  userProfile!: Table<UserProfile>;
  exerciseHistory!: Table<ExerciseResponse>;
  exerciseStats!: Table<ExerciseStats>;
  customProgressions!: Table<ChordProgression>;
  
  constructor() {
    super('GuitarTheoryDB');
    this.version(1).stores({
      userProfile: '&id, createdAt',
      exerciseHistory: '++id, exerciseId, timestamp',
      exerciseStats: '&exerciseType, lastPracticedAt, nextReviewAt',
      customProgressions: '++id, name, createdAt'
    });
  }
}
```

### 6.3 State Management
- **Zustand stores** for React state (session data, UI state)
- **IndexedDB persistence** for user progress and preferences
- **Jotai atoms** for fine-grained component state (fretboard display options)
- **Local storage backup** for critical preferences (tuning, audio settings)

---

## 7. Development Phases

### Phase 1: Foundation (Weeks 1-4)
**Goal**: Core fretboard visualization and basic note identification

**Agent 1 - Frontend Core**:
- Set up React + TypeScript + Vite project structure
- Implement Canvas-based fretboard component with 6/7-string support
- Create basic note identification exercise
- Implement Zustand stores for state management
- Add Tailwind CSS styling and responsive design

**Agent 2 - Audio & Theory**:
- Integrate Tone.js for audio playback
- Implement tonal.js for music theory calculations
- Create guitar sample library (basic clean electric samples)
- Build note-to-fretboard mapping utilities
- Add click-to-play functionality

**Agent 3 - Data & Analytics**:
- Set up IndexedDB schema with Dexie.js
- Implement basic progress tracking for note identification
- Create exercise response recording system
- Build simple performance analytics display
- Add data export/backup functionality

**Phase 1 Deliverables**:
- Working fretboard that displays notes accurately for 6/7-string guitars
- Note identification exercise with timing and accuracy tracking
- Audio feedback when clicking fretboard positions
- Basic progress persistence between sessions
- Responsive design working on mobile and desktop

### Phase 2: Core Exercises (Weeks 5-8)
**Goal**: Modal practice, ear training, and Drop 2 voicing exercises

**Agent 1 - Exercise UI**:
- Implement modal practice exercise with characteristic note focus
- Create interval identification exercise with fretboard integration
- Build Drop 2 voicing practice interface
- Add exercise session management and flow
- Implement progressive difficulty scaling

**Agent 2 - Advanced Audio**:
- Expand guitar sample library (distorted, acoustic timbres)
- Add drone backing tracks for modal practice
- Implement chord voicing playback
- Create metronome functionality
- Add audio mixing controls

**Agent 3 - Spaced Repetition**:
- Implement SM-2 spaced repetition algorithm
- Build weak area detection and scheduling
- Create exercise recommendation engine
- Add streak tracking and achievements
- Implement detailed performance analytics

**Phase 2 Deliverables**:
- Complete modal practice system with all 7 modes
- Guitar-timbre ear training exercises
- Full Drop 2 chord library with voice leading practice
- Spaced repetition scheduling keeping weak areas in rotation
- Achievement system for motivation

### Phase 3: Advanced Features (Weeks 9-12)
**Goal**: Advanced theory, real-song integration, and polish

**Agent 1 - Advanced UI**:
- Implement harmonic analysis tools
- Create chord progression practice interface
- Add advanced scale visualization (melodic minor, harmonic minor)
- Build custom exercise creation tools
- Implement accessibility features (ARIA labels, keyboard navigation)

**Agent 2 - Extended Audio**:
- Add real-time audio input capability (pitch detection)
- Implement backing track generation for common progressions
- Create advanced metronome with subdivisions
- Add audio effects (reverb, chorus) for sample enhancement
- Implement MIDI controller support

**Agent 3 - Data & Export**:
- Build comprehensive analytics dashboard
- Implement practice session insights and recommendations
- Add data export to common formats (CSV, PDF reports)
- Create backup/sync functionality
- Build admin tools for monitoring app performance

**Phase 3 Deliverables**:
- Complete theory exercise suite covering scales, modes, and advanced voicings
- Real-song chord progression analysis and practice
- Advanced analytics with actionable practice recommendations
- PWA functionality for offline use
- Production deployment with monitoring

### Phase 4: Polish & Extension (Weeks 13-16)
**Goal**: Performance optimization, advanced features, and user feedback integration

**All Agents - Collaborative**:
- Performance optimization and bundle size reduction
- Advanced 7-string exercises and extended range content
- User feedback integration and UX improvements
- A/B testing for exercise effectiveness
- Documentation and onboarding flow improvements

**Phase 4 Deliverables**:
- Production-ready application with excellent performance
- Comprehensive help system and guided tutorials
- Advanced features based on user feedback
- Complete test coverage and CI/CD pipeline
- Launch preparation and marketing materials

---

## Success Metrics

### User Engagement
- **Daily Active Users (DAU)** returning for practice sessions
- **Session Length** averaging 15-30 minutes (optimal practice duration)
- **Exercise Completion Rate** >80% for started exercises
- **Feature Adoption** measuring use of advanced exercises vs. basic ones

### Learning Effectiveness
- **Accuracy Improvement** measured over 4-week periods
- **Response Time Reduction** for note identification (target: <1 second)
- **Retention Rates** using spaced repetition effectiveness metrics
- **Progression Velocity** through difficulty levels

### Technical Performance
- **Page Load Speed** <2 seconds on mobile networks
- **Audio Latency** <50ms for click-to-play interactions
- **Offline Functionality** working reliably without network
- **Cross-Platform Compatibility** across major browsers and devices

---

## Risk Mitigation

### Technical Risks
- **Audio latency on mobile**: Implement aggressive preloading and Web Audio API optimization
- **Canvas performance on low-end devices**: Provide SVG fallback option
- **Browser compatibility**: Comprehensive testing matrix and polyfills

### Product Risks
- **Feature scope creep**: Strict MVP discipline in Phase 1, expansion only in later phases
- **User adoption**: Early beta testing with guitar community for feedback
- **Competition from established apps**: Focus on unique 7-string support and guitar-specific features

### User Experience Risks
- **Learning curve too steep**: Progressive disclosure and guided onboarding
- **Overwhelm from too many options**: Smart defaults and recommendation system
- **Mobile usability**: Mobile-first design approach with touch-optimized interactions

---

*This requirements document serves as the blueprint for the 3 development agents. Each phase includes specific deliverables and success criteria to ensure steady progress toward the complete guitar theory learning platform.*