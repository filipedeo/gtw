# Project Setup Guide
## Guitar Theory Web App - Development Environment

---

## 1. Initial Project Structure

### 1.1 Create Project Foundation
```bash
# Initialize the project
npm create vite@latest guitar-theory-webapp -- --template react-ts
cd guitar-theory-webapp

# Install core dependencies
npm install tonal tone zustand jotai dexie tailwindcss

# Install development dependencies
npm install -D @types/web-audio-api vitest @testing-library/react @testing-library/jest-dom

# Initialize Tailwind CSS
npx tailwindcss init -p
```

### 1.2 Project Directory Structure
```
guitar-theory-webapp/
├── public/
│   ├── audio/
│   │   ├── samples/
│   │   │   ├── clean-electric/
│   │   │   ├── distorted/
│   │   │   ├── acoustic-steel/
│   │   │   └── acoustic-nylon/
│   │   ├── drones/
│   │   ├── metronome/
│   │   └── backing-tracks/
│   ├── icons/
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── fretboard/
│   │   ├── exercises/
│   │   ├── audio/
│   │   ├── analytics/
│   │   └── ui/
│   ├── stores/
│   ├── theory/
│   ├── data/
│   ├── utils/
│   ├── hooks/
│   ├── types/
│   └── styles/
├── docs/
├── tests/
└── tools/
```

### 1.3 Essential Configuration Files

**package.json**
```json
{
  "name": "guitar-theory-webapp",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.2",
    "tonal": "^5.0.0",
    "tone": "^15.0.4",
    "zustand": "^4.5.2",
    "jotai": "^2.6.4",
    "dexie": "^3.2.4",
    "tailwindcss": "^3.4.1",
    "clsx": "^2.1.0",
    "canvas-confetti": "^1.9.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@types/web-audio-api": "^0.0.42",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.2.0",
    "vitest": "^1.4.0",
    "@testing-library/react": "^14.2.1",
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/user-event": "^14.5.2",
    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.2.0",
    "@typescript-eslint/parser": "^7.2.0",
    "eslint-plugin-react": "^7.34.1",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.6",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38"
  }
}
```

**vite.config.ts**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/stores': resolve(__dirname, './src/stores'),
      '@/theory': resolve(__dirname, './src/theory'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/types': resolve(__dirname, './src/types'),
      '@/hooks': resolve(__dirname, './src/hooks')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-audio': ['tone', 'tonal'],
          'vendor-react': ['react', 'react-dom'],
          'vendor-state': ['zustand', 'jotai', 'dexie']
        }
      }
    }
  },
  server: {
    host: true,
    port: 3000
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts']
  }
})
```

**tailwind.config.js**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fretboard: {
          wood: '#D4A574',
          'dark-wood': '#A67C52',
          metal: '#C0C0C0',
          'inlay': '#FFF8DC'
        },
        note: {
          root: '#FF6B6B',
          third: '#4ECDC4',
          fifth: '#45B7D1',
          seventh: '#96CEB4',
          extension: '#FFEAA7'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Monaco', 'Consolas', 'monospace']
      },
      animation: {
        'pulse-note': 'pulse 0.5s ease-in-out',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.2s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    },
  },
  plugins: [],
}
```

---

## 2. Core Type Definitions

### 2.1 Global Types (`src/types/index.ts`)
```typescript
// Music theory types
export interface Note {
  name: string;        // "C", "F#", "Bb"
  octave: number;      // 0-8
  midi: number;        // MIDI note number
  frequency: number;   // Hz
}

export interface Interval {
  name: string;        // "Perfect 5th"
  shortName: string;   // "P5"
  semitones: number;   // 7
  quality: 'perfect' | 'major' | 'minor' | 'augmented' | 'diminished';
}

export interface Scale {
  name: string;        // "C Major"
  root: string;        // "C"
  intervals: number[]; // [0, 2, 4, 5, 7, 9, 11]
  notes: string[];     // ["C", "D", "E", "F", "G", "A", "B"]
  mode?: string;       // "Ionian"
}

export interface Chord {
  symbol: string;      // "Cmaj7"
  root: string;        // "C"
  quality: ChordQuality;
  notes: string[];     // ["C", "E", "G", "B"]
  intervals: string[]; // ["1", "3", "5", "7"]
}

export enum ChordQuality {
  MAJOR = 'major',
  MINOR = 'minor',
  DOMINANT7 = 'dominant7',
  MAJOR7 = 'major7',
  MINOR7 = 'minor7',
  DIMINISHED = 'diminished',
  DIMINISHED7 = 'diminished7',
  AUGMENTED = 'augmented'
}

// Fretboard types
export interface FretPosition {
  string: number;      // 0-6 (high E to low B for 7-string)
  fret: number;        // 0-24
  note?: string;       // "C4" if specified
  label?: string;      // "R", "3", "b7" for display
  color?: string;      // Override default color
}

export interface FretboardConfig {
  stringCount: 6 | 7 | 8;
  tuning: string[];    // ["E4", "B3", "G3", "D3", "A2", "E2"] for standard
  fretCount: number;   // 12, 15, 17, 21, 24
  displayMode: DisplayMode;
  highlightedPositions: FretPosition[];
  colorScheme: ColorScheme;
}

export enum DisplayMode {
  NOTES = 'notes',
  INTERVALS = 'intervals',
  DEGREES = 'degrees',
  CHORD_TONES = 'chord_tones'
}

export enum ColorScheme {
  LIGHT = 'light',
  DARK = 'dark',
  COLORFUL = 'colorful',
  MINIMAL = 'minimal'
}

// Exercise types
export interface Exercise {
  id: string;
  type: ExerciseType;
  difficulty: number;          // 1-10 scale
  targetAccuracy: number;      // 0.8 = 80% target
  maxAttempts: number;         // Before showing answer
  timeoutMs: number;           // Response time limit
  metadata: ExerciseMetadata;
}

export enum ExerciseType {
  NOTE_IDENTIFICATION = 'note_id',
  INTERVAL_IDENTIFICATION = 'interval_id',
  CHORD_IDENTIFICATION = 'chord_id',
  SCALE_DEGREE_IDENTIFICATION = 'scale_degree_id',
  MODE_CHARACTERISTIC_NOTE = 'mode_char_note',
  DROP2_VOICING = 'drop2_voicing',
  VOICE_LEADING = 'voice_leading',
  HARMONIC_ANALYSIS = 'harmonic_analysis'
}

export interface ExerciseResponse {
  exerciseId: string;
  attempt: number;
  responseTimeMs: number;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  timestamp: number;
  metadata?: ResponseMetadata;
}

export interface ExerciseMetadata {
  [key: string]: any;
}

export interface ResponseMetadata {
  confidence?: number;         // User's confidence in answer (1-5)
  hintUsed?: boolean;         // Did user request a hint
  partialCredit?: number;     // 0-1 for partially correct answers
}

// Audio types
export enum GuitarTimbre {
  CLEAN_ELECTRIC = 'clean',
  DISTORTED = 'distorted',
  ACOUSTIC_STEEL = 'acoustic_steel',
  ACOUSTIC_NYLON = 'acoustic_nylon'
}

export interface AudioConfig {
  masterVolume: number;        // 0-1
  timbre: GuitarTimbre;
  reverbEnabled: boolean;
  reverbAmount: number;        // 0-1
  metronomeVolume: number;     // 0-1
  metronomeSound: MetronomeSound;
}

export enum MetronomeSound {
  CLASSIC_TICK = 'tick',
  WOOD_BLOCK = 'wood',
  DIGITAL_BEEP = 'beep',
  DRUM_STICK = 'stick'
}

// Progress tracking
export interface ProgressData {
  totalAttempts: number;
  correctAttempts: number;
  averageResponseTime: number;
  easeFactor: number;          // SM-2 spaced repetition
  nextReviewDate: number;
  consecutiveCorrect: number;
  lastPracticedAt: number;
}

export interface UserProfile {
  id: string;
  createdAt: number;
  preferences: UserPreferences;
  stats: GlobalStats;
}

export interface UserPreferences {
  defaultTuning: string[];
  defaultStringCount: 6 | 7;
  audioTimbre: GuitarTimbre;
  sessionLength: number;       // Target minutes per session
  difficultyPreference: 'adaptive' | 'manual';
  colorScheme: ColorScheme;
  showNoteNames: boolean;
  enableHints: boolean;
  metronomeEnabled: boolean;
}

export interface GlobalStats {
  totalPracticeTime: number;   // Minutes
  sessionsCompleted: number;
  currentStreak: number;       // Days
  longestStreak: number;       // Days
  exerciseStats: Map<ExerciseType, ProgressData>;
}

// Session types
export interface PracticeSession {
  id: string;
  startTime: number;
  endTime?: number;
  exerciseTypes: ExerciseType[];
  responses: ExerciseResponse[];
  targetDuration: number;      // Planned duration in minutes
}

export interface SessionSummary {
  duration: number;            // Actual duration in minutes
  exercisesCompleted: number;
  averageAccuracy: number;
  averageResponseTime: number;
  improvementAreas: string[];
  achievements: string[];
  nextRecommendations: ExerciseType[];
}
```

### 2.2 Audio Types (`src/types/audio.ts`)
```typescript
export interface SampleMetadata {
  note: string;              // "C4"
  timbre: GuitarTimbre;      // Clean, distorted, etc.
  string: number;            // 0-6 (high E to low B)
  fret: number;              // 0-24
  velocity: number;          // 1-127 MIDI velocity
  fileSize: number;          // Bytes
  duration: number;          // Seconds
  priority: LoadingPriority; // When to load
  url: string;               // File path
}

export enum LoadingPriority {
  IMMEDIATE = 0,    // Critical for basic functionality
  HIGH = 1,         // Common practice notes
  MEDIUM = 2,       // Extended range
  LOW = 3,          // Full range
  BACKGROUND = 4    // Non-essential
}

export interface AudioEngineState {
  isInitialized: boolean;
  audioContext: AudioContext | null;
  masterVolume: number;
  currentTimbre: GuitarTimbre;
  samplesLoaded: Set<string>;
  loadingProgress: number;   // 0-1
  latencyMs: number;
}

export interface DroneConfig {
  note: string;              // Root note for drone
  type: DroneType;           // Sine, sawtooth, guitar sample
  volume: number;            // 0-1
  fadeInDuration: number;    // Seconds
  fadeOutDuration: number;   // Seconds
}

export enum DroneType {
  SINE = 'sine',
  SAWTOOTH = 'sawtooth',
  TRIANGLE = 'triangle',
  GUITAR = 'guitar'
}

export interface MetronomeConfig {
  tempo: number;              // BPM
  timeSignature: [number, number]; // [4, 4]
  subdivision: Subdivision;   // Quarter, eighth, etc.
  accentPattern: boolean[];   // [true, false, false, false]
  sound: MetronomeSound;
  volume: number;             // 0-1
}

export enum Subdivision {
  QUARTER = 'quarter',
  EIGHTH = 'eighth',
  SIXTEENTH = 'sixteenth',
  TRIPLET = 'triplet'
}
```

---

## 3. Essential Utility Functions

### 3.1 Music Theory Utilities (`src/theory/utils.ts`)
```typescript
import { Note, Scale, Chord, Interval as TonalInterval } from 'tonal';

export const GUITAR_TUNINGS = {
  standard6: ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'],
  standard7: ['E4', 'B3', 'G3', 'D3', 'A2', 'E2', 'B1'],
  dropD6: ['E4', 'B3', 'G3', 'D3', 'A2', 'D2'],
  dropD7: ['E4', 'B3', 'G3', 'D3', 'A2', 'D2', 'A1'],
  dadgad: ['D4', 'A3', 'G3', 'D3', 'A2', 'D2'],
} as const;

export const MODAL_CHARACTERISTICS = {
  ionian: { degrees: [4, 7], description: 'Natural 4 and 7' },
  dorian: { degrees: [6], description: 'Natural 6' },
  phrygian: { degrees: [2], description: 'Flat 2' },
  lydian: { degrees: [4], description: 'Sharp 4' },
  mixolydian: { degrees: [7], description: 'Flat 7' },
  aeolian: { degrees: [6], description: 'Flat 6' },
  locrian: { degrees: [2, 5], description: 'Flat 2 and 5' }
} as const;

export class FretboardMapper {
  private tuning: string[];
  private fretCount: number;
  private noteMatrix: string[][];

  constructor(tuning: string[], fretCount: number = 24) {
    this.tuning = tuning;
    this.fretCount = fretCount;
    this.noteMatrix = this.generateNoteMatrix();
  }

  private generateNoteMatrix(): string[][] {
    return this.tuning.map(openNote => {
      const notes: string[] = [];
      for (let fret = 0; fret <= this.fretCount; fret++) {
        notes.push(Note.transpose(openNote, TonalInterval.fromSemitones(fret)));
      }
      return notes;
    });
  }

  getNoteAt(string: number, fret: number): string | null {
    if (string < 0 || string >= this.tuning.length) return null;
    if (fret < 0 || fret > this.fretCount) return null;
    return this.noteMatrix[string][fret];
  }

  findPositions(noteName: string): FretPosition[] {
    const positions: FretPosition[] = [];
    const targetChroma = Note.chroma(noteName);

    for (let string = 0; string < this.tuning.length; string++) {
      for (let fret = 0; fret <= this.fretCount; fret++) {
        const note = this.noteMatrix[string][fret];
        if (Note.chroma(note) === targetChroma) {
          positions.push({
            string,
            fret,
            note,
            label: Note.pitchClass(note)
          });
        }
      }
    }

    return positions;
  }

  getScalePositions(scale: Scale, displayMode: DisplayMode = DisplayMode.NOTES): FretPosition[] {
    const positions: FretPosition[] = [];
    const scaleNotes = scale.notes;

    for (let string = 0; string < this.tuning.length; string++) {
      for (let fret = 0; fret <= this.fretCount; fret++) {
        const note = this.noteMatrix[string][fret];
        const pc = Note.pitchClass(note);
        
        if (scaleNotes.includes(pc)) {
          const degree = scaleNotes.indexOf(pc) + 1;
          positions.push({
            string,
            fret,
            note,
            label: this.getLabel(note, degree, displayMode)
          });
        }
      }
    }

    return positions;
  }

  private getLabel(note: string, degree: number, mode: DisplayMode): string {
    switch (mode) {
      case DisplayMode.NOTES:
        return Note.pitchClass(note);
      case DisplayMode.DEGREES:
        return degree.toString();
      case DisplayMode.INTERVALS:
        return this.degreeToInterval(degree);
      default:
        return Note.pitchClass(note);
    }
  }

  private degreeToInterval(degree: number): string {
    const intervals = ['1', '2', '3', '4', '5', '6', '7'];
    return intervals[degree - 1] || degree.toString();
  }
}

export function generateRandomNote(noteRange: string[] = ['C3', 'B5']): string {
  const [minNote, maxNote] = noteRange;
  const minMidi = Note.midi(minNote)!;
  const maxMidi = Note.midi(maxNote)!;
  const randomMidi = Math.floor(Math.random() * (maxMidi - minMidi + 1)) + minMidi;
  return Note.fromMidi(randomMidi);
}

export function generateRandomScale(mode?: string): Scale {
  const roots = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const modes = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];
  
  const root = roots[Math.floor(Math.random() * roots.length)];
  const selectedMode = mode || modes[Math.floor(Math.random() * modes.length)];
  
  return Scale.get(`${root} ${selectedMode}`);
}

export function analyzeInterval(note1: string, note2: string): { 
  name: string; 
  semitones: number; 
  direction: 'up' | 'down' 
} {
  const midi1 = Note.midi(note1)!;
  const midi2 = Note.midi(note2)!;
  const semitones = Math.abs(midi2 - midi1);
  const direction = midi2 > midi1 ? 'up' : 'down';
  
  return {
    name: TonalInterval.fromSemitones(semitones),
    semitones,
    direction
  };
}
```

### 3.2 Audio Utilities (`src/utils/audio.ts`)
```typescript
import * as Tone from 'tone';

export async function initializeAudioContext(): Promise<AudioContext> {
  const context = Tone.getContext();
  
  if (context.state === 'suspended') {
    await context.resume();
  }
  
  return context.rawContext as AudioContext;
}

export function createUserGestureHandler(): () => Promise<void> {
  return async () => {
    await Tone.start();
    console.log('Audio context started by user gesture');
  };
}

export function calculateLatency(audioContext: AudioContext): number {
  const baseLatency = audioContext.baseLatency || 0;
  const outputLatency = audioContext.outputLatency || 0;
  return (baseLatency + outputLatency) * 1000; // Convert to milliseconds
}

export function createAudioBuffer(
  audioContext: AudioContext,
  frequency: number,
  duration: number,
  envelope: 'linear' | 'exponential' = 'exponential'
): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const sampleCount = sampleRate * duration;
  const buffer = audioContext.createBuffer(1, sampleCount, sampleRate);
  const channelData = buffer.getChannelData(0);

  for (let i = 0; i < sampleCount; i++) {
    const time = i / sampleRate;
    const amplitude = envelope === 'exponential' 
      ? Math.exp(-time * 2)
      : Math.max(0, 1 - time / duration);
    
    channelData[i] = Math.sin(2 * Math.PI * frequency * time) * amplitude;
  }

  return buffer;
}

export class AudioBufferPool {
  private pool: Map<string, AudioBuffer[]> = new Map();
  private maxPoolSize: number = 10;

  getBuffer(key: string): AudioBuffer | null {
    const buffers = this.pool.get(key);
    return buffers?.pop() || null;
  }

  returnBuffer(key: string, buffer: AudioBuffer): void {
    if (!this.pool.has(key)) {
      this.pool.set(key, []);
    }
    
    const buffers = this.pool.get(key)!;
    if (buffers.length < this.maxPoolSize) {
      buffers.push(buffer);
    }
  }

  clear(): void {
    this.pool.clear();
  }
}

export function detectBrowserCapabilities(): {
  webAudio: boolean;
  webMidi: boolean;
  mediaDevices: boolean;
  offlineAudioContext: boolean;
} {
  return {
    webAudio: 'AudioContext' in window || 'webkitAudioContext' in window,
    webMidi: 'requestMIDIAccess' in navigator,
    mediaDevices: 'mediaDevices' in navigator,
    offlineAudioContext: 'OfflineAudioContext' in window
  };
}
```

---

## 4. Development Scripts

### 4.1 Audio Sample Processing (`tools/process-samples.js`)
```javascript
#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = path.join(__dirname, '..', 'public', 'audio', 'samples');

async function generateSampleManifest() {
  const manifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    timbres: {}
  };

  const timbreDirs = await fs.readdir(SAMPLES_DIR);
  
  for (const timbreDir of timbreDirs) {
    const timbrePath = path.join(SAMPLES_DIR, timbreDir);
    const stat = await fs.stat(timbrePath);
    
    if (stat.isDirectory()) {
      manifest.timbres[timbreDir] = await processTimbres(timbrePath);
    }
  }

  await fs.writeFile(
    path.join(SAMPLES_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log('Sample manifest generated successfully');
}

async function processTimbres(timbrePath) {
  const samples = [];
  const files = await fs.readdir(timbrePath);
  
  for (const file of files) {
    if (file.endsWith('.mp3') || file.endsWith('.wav')) {
      const filePath = path.join(timbrePath, file);
      const stats = await fs.stat(filePath);
      
      const sampleInfo = {
        filename: file,
        note: extractNoteFromFilename(file),
        fileSize: stats.size,
        url: `/audio/samples/${path.basename(timbrePath)}/${file}`,
        priority: determinePriority(file)
      };
      
      samples.push(sampleInfo);
    }
  }
  
  return samples.sort((a, b) => a.priority - b.priority);
}

function extractNoteFromFilename(filename) {
  const match = filename.match(/([A-G]#?)(\d)/);
  return match ? `${match[1]}${match[2]}` : null;
}

function determinePriority(filename) {
  const note = extractNoteFromFilename(filename);
  if (!note) return 4;
  
  const octave = parseInt(note.slice(-1));
  const isNatural = !note.includes('#') && !note.includes('b');
  
  // Priority based on common usage
  if (octave >= 2 && octave <= 4 && isNatural) return 0; // Immediate
  if (octave >= 2 && octave <= 5) return 1; // High
  if (octave >= 1 && octave <= 6) return 2; // Medium
  return 3; // Low
}

// Run the script
generateSampleManifest().catch(console.error);
```

### 4.2 Development Server Setup (`tools/dev-setup.sh`)
```bash
#!/bin/bash

# Development setup script for Guitar Theory Web App

echo "Setting up development environment..."

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
    echo "✅ Node.js version $NODE_VERSION is compatible"
else
    echo "❌ Node.js version $NODE_VERSION is not compatible. Requires $REQUIRED_VERSION or higher"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Setup Tailwind CSS
echo "Setting up Tailwind CSS..."
npx tailwindcss init -p

# Create necessary directories
echo "Creating directory structure..."
mkdir -p public/audio/samples/{clean-electric,distorted,acoustic-steel,acoustic-nylon}
mkdir -p public/audio/{drones,metronome,backing-tracks}
mkdir -p src/{components/{fretboard,exercises,audio,analytics,ui},stores,theory,data,utils,hooks,types,styles}
mkdir -p tests/{unit,integration,e2e}

# Generate basic sample manifest
echo "Generating sample manifest..."
node tools/process-samples.js

# Setup git hooks (if using git)
if [ -d ".git" ]; then
    echo "Setting up git hooks..."
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
npm run lint && npm run type-check
EOF
    chmod +x .git/hooks/pre-commit
fi

# Create environment file
echo "Creating environment configuration..."
cat > .env.local << 'EOF'
# Development environment variables
VITE_APP_NAME="Guitar Theory Web App"
VITE_APP_VERSION="0.1.0"
VITE_AUDIO_BASE_URL="/audio"
VITE_ENABLE_ANALYTICS="false"
VITE_DEBUG_MODE="true"
EOF

echo "✅ Development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. npm run dev - Start development server"
echo "2. npm run test - Run tests"
echo "3. Add audio samples to public/audio/samples/"
echo "4. Start building your guitar theory app!"
```

### 4.3 Testing Setup (`src/test-setup.ts`)
```typescript
import { expect, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with Testing Library matchers
expect.extend(matchers);

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock Web Audio API for testing
beforeAll(() => {
  // Mock AudioContext
  global.AudioContext = class MockAudioContext {
    state = 'running';
    sampleRate = 44100;
    currentTime = 0;
    destination = {};
    listener = {};

    createOscillator() {
      return {
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        frequency: { value: 440 }
      };
    }

    createGain() {
      return {
        connect: vi.fn(),
        gain: { value: 1 }
      };
    }

    createBuffer() {
      return {
        numberOfChannels: 1,
        length: 1024,
        getChannelData: () => new Float32Array(1024)
      };
    }

    createBufferSource() {
      return {
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        buffer: null
      };
    }

    suspend() {
      return Promise.resolve();
    }

    resume() {
      return Promise.resolve();
    }
  };

  // Mock navigator.mediaDevices for audio input tests
  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }]
      })
    }
  });

  // Suppress console errors for cleaner test output
  const originalError = console.error;
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

// Custom matchers for audio testing
expect.extend({
  toBeValidNote(received: string) {
    const noteRegex = /^[A-G][#b]?\d$/;
    const pass = noteRegex.test(received);
    
    return {
      pass,
      message: () => 
        pass 
          ? `Expected ${received} not to be a valid note`
          : `Expected ${received} to be a valid note (e.g., C4, F#3, Bb2)`
    };
  },

  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be within range ${min}-${max}`
          : `Expected ${received} to be within range ${min}-${max}`
    };
  }
});

// Type declarations for custom matchers
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeValidNote(): T;
    toBeWithinRange(min: number, max: number): T;
  }
  interface AsymmetricMatchersContaining {
    toBeValidNote(): any;
    toBeWithinRange(min: number, max: number): any;
  }
}
```

---

## 5. Quick Start Commands

### 5.1 Initial Setup
```bash
# Clone or create the project
git clone <repository-url> guitar-theory-webapp
cd guitar-theory-webapp

# Run setup script
chmod +x tools/dev-setup.sh
./tools/dev-setup.sh

# Start development
npm run dev
```

### 5.2 Development Workflow
```bash
# Development server with hot reload
npm run dev

# Run tests in watch mode
npm run test

# Type checking
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview
```

### 5.3 Audio Sample Management
```bash
# Process and generate sample manifest
node tools/process-samples.js

# Validate sample loading
npm run test -- audio

# Check audio memory usage
npm run dev --debug-audio
```

This setup provides a solid foundation for the three development agents to begin building the guitar theory web application. The structure is modular, type-safe, and includes comprehensive tooling for audio development, testing, and deployment.