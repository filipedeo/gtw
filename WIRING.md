# WIRING.md — P3#2 Ear-Training Expansion (`ear-advanced`)

Branch: `feat/ear-advanced` · Worktree: `gtw-ear`

## 1. NEW files created

| Path | Purpose |
| --- | --- |
| `src/lib/advancedEar.ts` | Pure question generators (seeded RNG) for all 4 sub-modes + types + `createRng`. No audio/UI deps. |
| `src/__tests__/advancedEar.test.ts` | Focused unit tests for the pure generators (45 tests). |
| `src/components/AdvancedEarTrainingExercise.tsx` | Audio multiple-choice quiz component mirroring `EarTrainingExercise` (uses `useExercise`, `playNote`/`playChord`/`initAudio`/`stopAllNotes`). |

## 2. Edits to the 3 shared registry files

### `src/types/exercise.ts`

Add `'ear-advanced'` to the `ExerciseType` union. Insert immediately **before** the existing `'ear-training'` line:

```ts
export type ExerciseType =
  | 'note-identification'
  | 'modal-practice'
  | 'interval-recognition'
  | 'chord-voicing'
  | 'ear-advanced'        // <-- ADDED
  | 'ear-training'
  | 'caged-system'
  | 'three-nps'
  | 'pentatonic'
  | 'chord-progression'
  | 'jam-mode'
  | 'bass-technique'
  | 'arpeggio'
  | 'chord-scale'
  | 'circle-of-fifths';
```

### `src/components/ExerciseContainer.tsx`

**(a)** Lazy import — add after the `EarTrainingExercise` lazy import (line ~16):

```ts
const EarTrainingExercise = lazy(() => import('./EarTrainingExercise'));
const AdvancedEarTrainingExercise = lazy(() => import('./AdvancedEarTrainingExercise'));  // <-- ADDED
const ThreeNPSExercise = lazy(() => import('./ThreeNPSExercise'));
```

**(b)** `switch` case — add immediately **after** the `ear-training` case in `renderExercise()`:

```ts
      case 'ear-training':
        return <EarTrainingExercise exercise={currentExercise} />;
      case 'ear-advanced':                                                      // <-- ADDED
        return <AdvancedEarTrainingExercise exercise={currentExercise} />;      // <-- ADDED
      case 'three-nps':
        return <ThreeNPSExercise exercise={currentExercise} />;
```

### `src/api/exercises.ts`

**(a)** Exercise-data entries — insert these 4 `Exercise` objects immediately **after** the `ear-3` entry block (i.e. right before the `// ============ CHORD PROGRESSIONS ============` comment):

```ts
  {
    id: 'ear-adv-scale',
    type: 'ear-advanced',
    title: 'Scale & Mode Recognition',
    description: 'Identify scales and modes by ear — major, minor, Dorian, Mixolydian and more.',
    difficulty: 3,
    instructions: [
      'A scale will be played ascending',
      'Listen for the characteristic colour of each mode',
      'Major vs minor is the first distinction; then spot the 6th and 7th',
      'Difficulty adds more exotic modes (Phrygian, Lydian, Harmonic Minor)',
    ],
    audioRequired: true,
    fretboardRequired: false,
    instruments: ['guitar', 'bass'],
  },
  {
    id: 'ear-adv-cadence',
    type: 'ear-advanced',
    title: 'Cadence Recognition',
    description: 'Hear a short chord progression and name the cadence — authentic, plagal, deceptive, half.',
    difficulty: 3,
    instructions: [
      'A short chord progression will play in a random key',
      'Authentic (V-I): the strongest resolution',
      'Plagal (IV-I): the "Amen" cadence',
      'Deceptive (V-vi) and Half cadences appear at higher difficulty',
    ],
    audioRequired: true,
    fretboardRequired: false,
    instruments: ['guitar', 'bass'],
  },
  {
    id: 'ear-adv-interval',
    type: 'ear-advanced',
    title: 'Interval Trainer (Configurable)',
    description: 'Name two-note intervals. Toggle ascending, descending, or harmonic playback.',
    difficulty: 2,
    instructions: [
      'Two notes will be played',
      'Choose ascending, descending, or harmonic (both at once)',
      'Difficulty controls the interval set — start with 4ths/5ths, work up to all twelve',
      'Song references are shown in the explanation after answering',
    ],
    audioRequired: true,
    fretboardRequired: false,
    instruments: ['guitar', 'bass'],
  },
  {
    id: 'ear-adv-degree',
    type: 'ear-advanced',
    title: 'Scale Degree by Ear',
    description: 'A key is established, then a note plays — identify its scale degree (1-7).',
    difficulty: 4,
    instructions: [
      'A tonic chord establishes the key, then a single note plays',
      'Identify the scale degree (1 through 7)',
      'This is functional ear training — how pro musicians hear',
      'More useful than absolute pitch for most players',
    ],
    audioRequired: true,
    fretboardRequired: false,
    instruments: ['guitar', 'bass'],
  },
```

**(b)** Category label — add to the `CATEGORY_LABELS` record, immediately after the `'ear-training'` entry:

```ts
  'ear-training': 'Ear Training',
  'ear-advanced': 'Advanced Ear Training',   // <-- ADDED
  'chord-progression': 'Chord Progressions',
```

## 3. Verification (on branch `feat/ear-advanced`, worktree `gtw-ear`)

- `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit` → clean
- `PATH=/opt/homebrew/bin:$PATH npx vitest run` → **34 files / 1037 tests** all green
  - existing ear-training tests untouched; new `advancedEar.test.ts` = 45 tests
  - baseline was 992 tests / 33 files → **+45 tests, +1 file**
- `PATH=/opt/homebrew/bin:$PATH GITHUB_PAGES=true npx vite build` → ok (`AdvancedEarTrainingExercise` chunk emitted)

## 4. UX summary

A new "Advanced Ear Training" category with four audio-only multiple-choice drills:
1. **Scale & Mode Recognition** — a scale plays ascending; pick which scale/mode (Major, Natural Minor, Dorian, Mixolydian, … up to Blues/Locrian at difficulty 5).
2. **Cadence Recognition** — a short chord progression plays (block chords); identify the cadence (Authentic V–I, Plagal IV–I, Deceptive V–vi, Half I–IV–V, minor plagal, Andalusian at higher difficulty).
3. **Interval Trainer (Configurable)** — two notes play; name the interval. On-screen chips toggle **ascending / descending / harmonic** playback; difficulty widens the interval set from 4ths/5ths to all twelve. Song references shown after answering.
4. **Scale Degree by Ear** — a tonic triad establishes the key, then a single note plays; identify the degree (1–7). Difficulty gates which degrees appear.

All four use `useExercise` (10-question scoring), keyboard 1–N answer shortcuts, reveal-on-answer feedback with an explanation, and a "Play Again" button. No fretboard. No shared-store modifications.
