# Guitar Theory

Interactive guitar theory practice app with fretboard visualization, ear training, and progress tracking. Supports 6 and 7-string guitars with configurable tunings.

## Exercises & Practice

### Fretboard & Scales
- **Note identification** — Timed fretboard note quizzes at 3 difficulty levels (first position, full neck, extended range)
- **CAGED system** — All 5 shapes (C, A, G, E, D) with chord tones (root, 3rd, 5th) and scale overlays, plus a connect-all-shapes exercise
- **3-notes-per-string** — Ionian, Dorian, and all-7-modes patterns with finger shape visualization
- **Pentatonic scales** — Minor pentatonic shape 1, all 5 shapes (minor and major), and pentatonic-to-modes bridging exercise

### Chords & Voicings
- **Drop 2 voicings** — Maj7, min7, dom7 across all inversions and string sets
- **Triad inversions** — Major and minor across D-G-B, G-B-E, A-D-G string sets
- **Chord progressions** — Identify progressions by ear across 3 difficulty levels:
  - Basic (I-IV-V combinations)
  - Pop & Rock (I-V-vi-IV, I-vi-IV-V, ii-V-I, and more)
  - Advanced (borrowed chords like bVII and iv, circle-of-fourths movement)

### Ear Training
- **Chord quality** — Major vs minor triads, 7th chord types (maj7, min7, dom7)
- **Functional ear training** — Scale degree identification (1-7) over a tonal center
- **Interval recognition** — Perfect 4th/5th, major/minor 3rds, and all intervals within an octave

### Modes
- **Modal practice** — Dorian, Mixolydian, Lydian, Phrygian, Aeolian with drone backing and characteristic note emphasis
- **Parallel mode comparison** — Compare all 7 modes from the same root

### Tools
- **Session planner** — Auto-generated practice plans for 15/30/60 min sessions with category filtering, weighted exercise selection (spaced repetition, weak areas, least practiced), and drag-to-reorder
- **Practice timer** — Elapsed time tracking with optional target alerts
- **Metronome** — Adjustable BPM with tap tempo
- **Guitar tuner** — Chromatic tuner using microphone input with pitch detection
- **Progress dashboard** — Spaced repetition (SM-2), streaks, weak area detection, exercise history

### Fretboard
- Canvas-based rendering, 6/7-string support
- Standard, Drop D, Drop A, DADGAD, Open G, and custom tunings
- Display modes: note names, intervals, scale degrees
- Click any position to hear the note
- Dark and light themes

## Tech Stack

React 19, TypeScript, Vite, Zustand, Tailwind CSS 4, Tone.js, tonal.js

## Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **npm** (comes with Node)

### Install & Run

```bash
git clone <repository-url>
cd guitar-theory-webapp
npm install
npm run dev          # Dev server on localhost:5173
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Type-check + production build |
| `npm test` | Run Vitest test suite |
| `npm run preview` | Preview production build locally |
| `npm run build:gh-pages` | Build with GitHub Pages base path |

### Deploy to GitHub Pages

The app builds to purely static assets — no server required.

**Automatic (CI):** Push to `master` triggers `.github/workflows/deploy.yml`, which builds and deploys to GitHub Pages. Requires enabling Pages with "GitHub Actions" as the source in repo settings.

**Manual:**

```bash
npm run build:gh-pages   # Build with /gtw/ base path
```

The `GITHUB_PAGES=true` env var sets the Vite `base` to `/gtw/` so asset paths resolve correctly under `<user>.github.io/gtw/`.

## Project Structure

```
src/
  components/     Exercise components, Fretboard, UI controls, tools
  stores/         Zustand stores (guitar, exercise, audio, progress, theme, tuner)
  lib/            Audio engine (Tone.js), theory engine (tonal.js), pitch detection
  hooks/          useExercise scoring/progress hook
  utils/          Fretboard calculations
  types/          TypeScript type definitions (exercise, guitar, audio, progress)
  api/            Exercise definitions and categories
  __tests__/      Vitest unit tests
```

## Contributing

1. Fork the repo and create a feature branch
2. Make your changes — the codebase follows these conventions:
   - Exercise components follow the `EarTrainingExercise.tsx` pattern: `useExercise()` hook for scoring, multiple choice UI, keyboard shortcuts, audio via `playChord()`/`playNote()`
   - New exercise types: add to `ExerciseType` union in `types/exercise.ts`, add exercise entries to `api/exercises.ts`, create component, add lazy import + switch case in `ExerciseContainer.tsx`. The session planner and category system pick up new types automatically.
   - State management via Zustand stores, no prop drilling
   - Styling via Tailwind utility classes and CSS custom properties (theme-aware)
3. Run `npx tsc --noEmit && npx vitest run && npx vite build` to verify
4. Open a pull request

## Design Documents

The `docs/` directory contains the original design specs written before implementation. They describe the target vision and may not reflect the current state of the codebase exactly. Useful for understanding design intent and future direction.
