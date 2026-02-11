# Technical Specifications
## Guitar Theory Web App - Detailed Implementation Guide

---

## 1. Fretboard Rendering Engine

### 1.1 Canvas Implementation
```typescript
interface FretboardCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  stringCount: 6 | 7 | 8;
  fretCount: number;
  tuning: string[];
}

class FretboardRenderer {
  private canvas: FretboardCanvas;
  private positions: Map<string, FretPosition> = new Map();
  
  // Core rendering methods
  render(): void;
  drawStrings(): void;
  drawFrets(): void;
  drawInlays(): void;
  drawNotes(): void;
  
  // Interaction methods
  getPositionFromCoordinates(x: number, y: number): FretPosition | null;
  highlightPosition(position: FretPosition, color: string): void;
  clearHighlights(): void;
  
  // Animation support
  animateTransition(from: FretPosition[], to: FretPosition[], duration: number): Promise<void>;
}
```

### 1.2 Performance Optimizations
- **Offscreen canvas** for static elements (strings, frets, inlays)
- **Dirty region updates** only redraw changed areas
- **Device pixel ratio handling** for crisp rendering on high-DPI screens
- **Debounced resize** for responsive layout updates
- **Web Workers** for heavy calculations (scale generation, chord voicing calculations)

### 1.3 7-String Adaptations
```typescript
const TUNINGS = {
  STANDARD_6: ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'],
  STANDARD_7: ['E4', 'B3', 'G3', 'D3', 'A2', 'E2', 'B1'],
  DROP_D_7: ['E4', 'B3', 'G3', 'D3', 'A2', 'D2', 'A1'],
  JAZZ_7: ['E4', 'B3', 'G3', 'D3', 'A2', 'E2', 'A1']
} as const;

// Automatic layout adjustments
function calculateStringSpacing(stringCount: number, canvasHeight: number): number {
  const usableHeight = canvasHeight * 0.8; // 10% margins top/bottom
  return usableHeight / (stringCount - 1);
}
```

---

## 2. Audio Engine Architecture

### 2.1 Tone.js Implementation
```typescript
class GuitarAudioEngine {
  private sampler: Tone.Sampler;
  private droneSynth: Tone.Oscillator;
  private metronome: Tone.Player;
  private reverb: Tone.Reverb;
  private masterVolume: Tone.Volume;
  
  async initialize(): Promise<void> {
    // Load guitar samples for all timbres
    this.sampler = new Tone.Sampler({
      urls: {
        'C2': 'guitar-clean-C2.mp3',
        'C3': 'guitar-clean-C3.mp3',
        'C4': 'guitar-clean-C4.mp3',
        'C5': 'guitar-clean-C5.mp3'
      },
      baseUrl: '/audio/samples/clean/',
      onload: () => console.log('Clean guitar samples loaded')
    });
    
    // Setup audio chain
    this.sampler.chain(this.reverb, this.masterVolume, Tone.Destination);
  }
  
  playNote(note: string, duration: string = '8n'): void {
    this.sampler.triggerAttackRelease(note, duration);
  }
  
  playChord(notes: string[], duration: string = '2n'): void {
    notes.forEach(note => this.playNote(note, duration));
  }
  
  startDrone(note: string): void {
    this.droneSynth.frequency.setValueAtTime(Tone.Frequency(note).toFrequency(), Tone.now());
    this.droneSynth.start();
  }
}
```

### 2.2 Sample Library Organization
```
/public/audio/
├── samples/
│   ├── clean/          # Clean electric guitar samples
│   ├── distorted/      # Distorted electric samples  
│   ├── acoustic-steel/ # Steel string acoustic
│   └── acoustic-nylon/ # Classical nylon string
├── drones/
│   ├── C-drone.mp3     # Long-form drone tones for each chromatic note
│   ├── C#-drone.mp3
│   └── ... (all 12 chromatic notes)
├── metronome/
│   ├── click-hi.mp3    # Accented metronome beat
│   ├── click-lo.mp3    # Unaccented beat
│   └── subdivision.mp3 # 16th note click
└── backing-tracks/
    ├── ii-V-I-C.mp3    # Common progressions in all keys
    ├── I-vi-IV-V-C.mp3
    └── ... (expandable backing track library)
```

### 2.3 Real-Time Audio Input (Future)
```typescript
// Phase 3 feature - pitch detection for play-along exercises
class AudioInputProcessor {
  private mediaStream: MediaStream;
  private analyser: AnalyserNode;
  private audioContext: AudioContext;
  
  async initialize(): Promise<void> {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    source.connect(this.analyser);
  }
  
  detectPitch(): number | null {
    // Implement autocorrelation algorithm (YIN) for monophonic pitch detection
    // Returns MIDI note number or null if no clear pitch detected
  }
}
```

---

## 3. Music Theory Engine

### 3.1 tonal.js Integration
```typescript
import { Note, Scale, Chord, Interval } from 'tonal';

class MusicTheoryEngine {
  // Scale generation with mode emphasis
  generateScaleForMode(root: string, mode: string): ScaleInfo {
    const scale = Scale.get(`${root} ${mode}`);
    const characteristicDegrees = this.getCharacteristicDegrees(mode);
    
    return {
      notes: scale.notes,
      intervals: scale.intervals,
      mode,
      characteristicDegrees,
      practiceEmphasis: characteristicDegrees.map(degree => scale.notes[degree - 1])
    };
  }
  
  // Drop 2 voicing calculation
  generateDrop2Voicing(chordSymbol: string, inversion: number, stringSet: number[]): ChordVoicing {
    const chord = Chord.get(chordSymbol);
    const closedVoicing = chord.notes;
    
    // Drop 2nd voice from top down an octave
    const drop2Notes = [...closedVoicing];
    const droppedNote = drop2Notes[closedVoicing.length - 2]; // 2nd from top
    drop2Notes[closedVoicing.length - 2] = Note.transpose(droppedNote, '-8P'); // Down octave
    
    return this.mapNotesToFrets(drop2Notes, stringSet, inversion);
  }
  
  // Characteristic degree identification for modal practice
  private getCharacteristicDegrees(mode: string): number[] {
    const characteristics = {
      'ionian': [4, 7],      // Natural 4 and 7
      'dorian': [6],         // Natural 6
      'phrygian': [2],       // Flat 2  
      'lydian': [4],         // Sharp 4
      'mixolydian': [7],     // Flat 7
      'aeolian': [6],        // Flat 6 (natural minor)
      'locrian': [2, 5]      // Flat 2 and flat 5
    };
    
    return characteristics[mode.toLowerCase()] || [];
  }
}
```

### 3.2 Fretboard Mapping Utilities
```typescript
interface FretboardMap {
  strings: string[];  // Tuning from highest to lowest
  fretCount: number;
  noteMatrix: string[][]; // [string][fret] = note name
}

class FretboardMapper {
  private map: FretboardMap;
  
  constructor(tuning: string[], fretCount: number = 24) {
    this.map = this.generateNoteMatrix(tuning, fretCount);
  }
  
  // Convert note name to fret positions
  findNotePositions(noteName: string): FretPosition[] {
    const positions: FretPosition[] = [];
    
    for (let string = 0; string < this.map.strings.length; string++) {
      for (let fret = 0; fret <= this.map.fretCount; fret++) {
        if (Note.chroma(this.map.noteMatrix[string][fret]) === Note.chroma(noteName)) {
          positions.push({ string, fret, note: this.map.noteMatrix[string][fret] });
        }
      }
    }
    
    return positions;
  }
  
  // Find closest fingering for a chord
  findOptimalVoicing(notes: string[], maxFretSpan: number = 4): FretPosition[] {
    // Algorithm to find fingering with minimal fret span and reasonable hand position
    // Returns array of FretPosition objects representing the optimal fingering
  }
  
  private generateNoteMatrix(tuning: string[], fretCount: number): string[][] {
    return tuning.map(openNote => {
      const frets: string[] = [];
      for (let fret = 0; fret <= fretCount; fret++) {
        frets.push(Note.transpose(openNote, `${fret}m2`)); // Each fret = minor 2nd
      }
      return frets;
    });
  }
}
```

---

## 4. Exercise Generation System

### 4.1 Adaptive Difficulty Engine
```typescript
interface DifficultyConfig {
  noteRange: string[];        // Notes that can appear in exercise
  fretRange: [number, number]; // [minFret, maxFret]
  stringRange: [number, number]; // [minString, maxString] 
  timeLimit: number;          // Response time in milliseconds
  hintsEnabled: boolean;
  visualCuesReduced: boolean;
}

class ExerciseGenerator {
  generateNoteIdentification(difficulty: number, stringCount: number): Exercise {
    const config = this.getDifficultyConfig(difficulty);
    
    return {
      id: `note_id_${Date.now()}`,
      type: ExerciseType.NOTE_IDENTIFICATION,
      difficulty,
      targetAccuracy: 0.8,
      maxAttempts: 3,
      timeoutMs: config.timeLimit,
      metadata: {
        position: this.selectRandomPosition(config, stringCount),
        expectedNote: this.getExpectedNote(position),
        hintsAvailable: config.hintsEnabled
      }
    };
  }
  
  generateModalPractice(mode: string, root: string, stringCount: number): Exercise {
    const scaleInfo = this.theoryEngine.generateScaleForMode(root, mode);
    
    return {
      id: `modal_${mode}_${root}_${Date.now()}`,
      type: ExerciseType.MODE_CHARACTERISTIC_NOTE,
      difficulty: 6, // Modal exercises are intermediate level
      targetAccuracy: 0.7,
      maxAttempts: 3,
      timeoutMs: 10000, // More time for modal recognition
      metadata: {
        mode,
        root,
        scale: scaleInfo,
        droneNote: root,
        characteristicDegrees: scaleInfo.characteristicDegrees,
        testPositions: this.selectModalTestPositions(scaleInfo, stringCount)
      }
    };
  }
  
  private getDifficultyConfig(difficulty: number): DifficultyConfig {
    // Difficulty 1-3: Open strings and first 3 frets
    // Difficulty 4-6: Extended to 5th fret, all strings
    // Difficulty 7-10: Full fretboard, reduced visual cues
    
    const configs = {
      1: { fretRange: [0, 3], stringRange: [2, 4], timeLimit: 5000, hintsEnabled: true },
      5: { fretRange: [0, 7], stringRange: [0, 5], timeLimit: 3000, hintsEnabled: true },
      10: { fretRange: [0, 12], stringRange: [0, 6], timeLimit: 1000, hintsEnabled: false }
    };
    
    return this.interpolateConfig(difficulty, configs);
  }
}
```

### 4.2 Spaced Repetition Implementation
```typescript
// SM-2 Algorithm implementation for optimal review scheduling
class SpacedRepetitionScheduler {
  calculateNextReview(stats: ExerciseStats, performance: ExerciseResponse): ExerciseStats {
    const quality = this.calculateQuality(performance);
    
    if (quality >= 3) {
      // Correct response
      if (stats.consecutiveCorrect === 0) {
        stats.nextReviewAt = Date.now() + (1 * 24 * 60 * 60 * 1000); // 1 day
      } else if (stats.consecutiveCorrect === 1) {
        stats.nextReviewAt = Date.now() + (6 * 24 * 60 * 60 * 1000); // 6 days
      } else {
        const intervalDays = Math.ceil(stats.consecutiveCorrect * stats.easeFactor);
        stats.nextReviewAt = Date.now() + (intervalDays * 24 * 60 * 60 * 1000);
      }
      
      stats.consecutiveCorrect += 1;
      stats.easeFactor = stats.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    } else {
      // Incorrect response - reset interval
      stats.consecutiveCorrect = 0;
      stats.nextReviewAt = Date.now() + (1 * 24 * 60 * 60 * 1000); // Back to 1 day
    }
    
    // Ensure ease factor stays within reasonable bounds
    stats.easeFactor = Math.max(1.3, stats.easeFactor);
    
    return stats;
  }
  
  private calculateQuality(response: ExerciseResponse): number {
    // Convert response time and correctness to SM-2 quality (0-5)
    if (!response.isCorrect) return response.attempt === 1 ? 0 : 1;
    
    // Fast correct response = quality 5, slow = quality 3
    const maxTime = 5000; // 5 seconds
    const timeRatio = Math.min(response.responseTimeMs / maxTime, 1);
    return Math.ceil(5 - (timeRatio * 2)); // 5 for instant, 3 for max time
  }
  
  getItemsDueForReview(): ExerciseType[] {
    const now = Date.now();
    return this.exerciseStats
      .filter(stats => stats.nextReviewAt <= now)
      .sort((a, b) => a.nextReviewAt - b.nextReviewAt)
      .map(stats => stats.exerciseType);
  }
}
```

---

## 5. State Management Architecture

### 5.1 Zustand Store Structure
```typescript
// Main practice session store
interface PracticeStore {
  // Session state
  currentExercise: Exercise | null;
  sessionStartTime: number;
  sessionResponses: ExerciseResponse[];
  isSessionActive: boolean;
  
  // Exercise flow
  exerciseQueue: Exercise[];
  completedExercises: string[];
  
  // Performance tracking
  currentStreak: number;
  sessionAccuracy: number;
  averageResponseTime: number;
  
  // Actions
  startSession: (exerciseTypes: ExerciseType[]) => void;
  nextExercise: () => void;
  submitResponse: (response: ExerciseResponse) => void;
  endSession: () => Promise<SessionSummary>;
}

// Fretboard display store
interface FretboardStore {
  // Configuration
  stringCount: 6 | 7;
  tuning: string[];
  fretCount: number;
  
  // Display state
  displayMode: DisplayMode;
  highlightedPositions: FretPosition[];
  colorScheme: ColorScheme;
  showNoteNames: boolean;
  
  // Interaction state
  hoveredPosition: FretPosition | null;
  selectedPositions: FretPosition[];
  
  // Actions
  setTuning: (tuning: string[]) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  highlightPositions: (positions: FretPosition[]) => void;
  clearHighlights: () => void;
}

// Audio settings store  
interface AudioStore {
  // Configuration
  masterVolume: number;
  timbre: GuitarTimbre;
  reverbEnabled: boolean;
  metronomeVolume: number;
  
  // State
  audioContext: AudioContext | null;
  isInitialized: boolean;
  samplesLoaded: boolean;
  
  // Actions
  initializeAudio: () => Promise<void>;
  playNote: (note: string, duration?: string) => void;
  playChord: (notes: string[]) => void;
  startDrone: (note: string) => void;
  stopDrone: () => void;
}
```

### 5.2 Jotai Atoms for Fine-Grained State
```typescript
// UI atoms for granular updates
export const fretboardHoverAtom = atom<FretPosition | null>(null);
export const exerciseTimerAtom = atom<number>(0);
export const audioLoadingAtom = atom<boolean>(true);
export const exerciseHintAtom = atom<string | null>(null);

// Computed atoms
export const currentNoteAtom = atom((get) => {
  const hovered = get(fretboardHoverAtom);
  const fretboard = get(fretboardStore);
  
  return hovered ? fretboard.getNoteAtPosition(hovered) : null;
});

export const sessionProgressAtom = atom((get) => {
  const practice = get(practiceStore);
  if (!practice.exerciseQueue.length) return 0;
  
  return practice.completedExercises.length / practice.exerciseQueue.length;
});
```

### 5.3 IndexedDB Persistence Strategy
```typescript
class PersistenceManager {
  private db: GuitarTheoryDB;
  
  async saveExerciseResponse(response: ExerciseResponse): Promise<void> {
    await this.db.exerciseHistory.add(response);
    
    // Update aggregated stats
    const stats = await this.getExerciseStats(response.exerciseId);
    const updatedStats = this.spacedRepetition.calculateNextReview(stats, response);
    await this.db.exerciseStats.put(updatedStats);
  }
  
  async getProgressSummary(timeRange: TimeRange): Promise<ProgressSummary> {
    const responses = await this.db.exerciseHistory
      .where('timestamp')
      .between(timeRange.start, timeRange.end)
      .toArray();
      
    return this.analyzeResponses(responses);
  }
  
  async exportUserData(): Promise<UserDataExport> {
    return {
      profile: await this.db.userProfile.toArray(),
      exerciseHistory: await this.db.exerciseHistory.toArray(),
      exerciseStats: await this.db.exerciseStats.toArray(),
      exportedAt: Date.now(),
      version: '1.0'
    };
  }
}
```

---

## 6. Performance Optimization

### 6.1 Bundle Optimization
```typescript
// Code splitting by exercise type
const NoteIdentification = lazy(() => import('./exercises/NoteIdentification'));
const ModalPractice = lazy(() => import('./exercises/ModalPractice'));
const VoicingPractice = lazy(() => import('./exercises/VoicingPractice'));

// Audio sample lazy loading
class AudioLoader {
  private loadedSamples = new Set<string>();
  
  async preloadForExercise(exerciseType: ExerciseType): Promise<void> {
    const requiredSamples = this.getRequiredSamples(exerciseType);
    const unloaded = requiredSamples.filter(s => !this.loadedSamples.has(s));
    
    await Promise.all(unloaded.map(sample => this.loadSample(sample)));
  }
}
```

### 6.2 Canvas Optimization Techniques
```typescript
class OptimizedFretboardRenderer {
  private offscreenCanvas: OffscreenCanvas;
  private staticElements: ImageData;
  private dirtyRegions: Set<string> = new Set();
  
  render(): void {
    if (this.dirtyRegions.has('static')) {
      this.renderStaticElements();
      this.dirtyRegions.delete('static');
    }
    
    if (this.dirtyRegions.has('highlights')) {
      this.renderHighlights();
      this.dirtyRegions.delete('highlights');
    }
  }
  
  private renderStaticElements(): void {
    // Render strings, frets, inlays to offscreen canvas
    // Copy to main canvas only when layout changes
  }
}
```

### 6.3 Memory Management
```typescript
// Cleanup strategies for long practice sessions
class ResourceManager {
  private audioBuffers = new Map<string, AudioBuffer>();
  private maxBuffers = 50;
  
  cleanupUnusedResources(): void {
    // Remove least recently used audio samples when at capacity
    if (this.audioBuffers.size > this.maxBuffers) {
      const sortedBuffers = Array.from(this.audioBuffers.entries())
        .sort(([,a], [,b]) => a.lastUsed - b.lastUsed);
        
      const toRemove = sortedBuffers.slice(0, this.audioBuffers.size - this.maxBuffers);
      toRemove.forEach(([key]) => this.audioBuffers.delete(key));
    }
  }
}
```

---

## 7. Testing Strategy

### 7.1 Unit Testing with Vitest
```typescript
// Music theory calculations
describe('MusicTheoryEngine', () => {
  test('generates correct modal scales', () => {
    const engine = new MusicTheoryEngine();
    const dorian = engine.generateScaleForMode('D', 'dorian');
    
    expect(dorian.notes).toEqual(['D', 'E', 'F', 'G', 'A', 'B', 'C']);
    expect(dorian.characteristicDegrees).toEqual([6]);
  });
  
  test('calculates Drop 2 voicings correctly', () => {
    const engine = new MusicTheoryEngine();
    const cmaj7 = engine.generateDrop2Voicing('Cmaj7', 0, [3, 2, 1, 0]);
    
    expect(cmaj7.notes).toEqual(['G3', 'C4', 'E4', 'B4']); // Root position Drop 2
  });
});

// Spaced repetition algorithm
describe('SpacedRepetitionScheduler', () => {
  test('increases interval after correct response', () => {
    const scheduler = new SpacedRepetitionScheduler();
    const initialStats = createMockExerciseStats();
    const correctResponse = createMockResponse({ isCorrect: true, responseTimeMs: 1000 });
    
    const updatedStats = scheduler.calculateNextReview(initialStats, correctResponse);
    
    expect(updatedStats.nextReviewAt).toBeGreaterThan(Date.now());
    expect(updatedStats.consecutiveCorrect).toBe(initialStats.consecutiveCorrect + 1);
  });
});
```

### 7.2 Integration Testing
```typescript
// End-to-end exercise flow
describe('Exercise Flow Integration', () => {
  test('completes note identification exercise successfully', async () => {
    render(<App />);
    
    // Start exercise
    fireEvent.click(screen.getByText('Start Note Identification'));
    await waitFor(() => expect(screen.getByTestId('fretboard')).toBeInTheDocument());
    
    // Click correct position
    const targetPosition = screen.getByTestId('fret-position-3-2');
    fireEvent.click(targetPosition);
    
    // Verify response recorded
    await waitFor(() => {
      expect(screen.getByText(/Correct!/)).toBeInTheDocument();
    });
    
    // Check progress updated
    const progress = await getProgressFromDB();
    expect(progress.totalAttempts).toBe(1);
    expect(progress.correctAttempts).toBe(1);
  });
});
```

### 7.3 Performance Testing
```typescript
// Canvas rendering performance
describe('Fretboard Performance', () => {
  test('renders 7-string fretboard within performance budget', () => {
    const renderer = new FretboardRenderer();
    const startTime = performance.now();
    
    renderer.render();
    
    const renderTime = performance.now() - startTime;
    expect(renderTime).toBeLessThan(16); // 60fps target
  });
  
  test('handles rapid highlighting changes without lag', async () => {
    const renderer = new FretboardRenderer();
    const positions = generateRandomPositions(100);
    
    const startTime = performance.now();
    
    for (const position of positions) {
      renderer.highlightPosition(position, 'red');
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    
    const totalTime = performance.now() - startTime;
    expect(totalTime).toBeLessThan(1000); // 1 second for 100 changes
  });
});
```

---

This technical specification provides the detailed implementation guidance needed for the development team to build a production-ready guitar theory learning application. Each section includes specific code examples, performance considerations, and testing strategies to ensure a high-quality end product.