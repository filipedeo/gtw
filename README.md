# Guitar Theory

Interactive guitar theory practice app with fretboard visualization, ear training, and progress tracking. Supports 6 and 7-string guitars.

## Features

- **Fretboard visualization** — Canvas-based, 6/7-string, multiple tunings, note/interval/degree display modes
- **CAGED system** — All 5 shapes with chord tones and scale overlays
- **3-notes-per-string** — All 7 mode patterns with adjustable position
- **Modal practice** — Drone-based practice with characteristic note emphasis
- **Drop 2 voicings** — Maj7, min7, dom7 across all inversions
- **Triad inversions** — Major and minor across D-G-B, G-B-E, A-D-G string sets
- **Interval recognition** — Ascending and descending with song references
- **Ear training** — Chord quality identification (triads and 7th chords)
- **Note identification** — Timed fretboard note quizzes at 3 difficulty levels
- **Session planner** — Suggested practice plans for 15/30/60 min sessions
- **Practice timer** — Elapsed time tracking with optional target alerts
- **Progress tracking** — Spaced repetition (SM-2), streaks, weak area detection

## Tech Stack

React 19, TypeScript, Vite, Zustand, Tailwind CSS, Tone.js, tonal.js

## Development

```bash
npm install
npm run dev        # Dev server on localhost:3000
npm test           # Run tests
npm run build      # Production build
```

## Deploy to GitHub Pages

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
  components/     Exercise components, Fretboard, UI controls
  stores/         Zustand stores (guitar, exercise, audio, progress)
  lib/            Audio engine (Tone.js), theory engine (tonal.js)
  hooks/          useExercise hook
  utils/          Fretboard calculations
  types/          TypeScript type definitions
  api/            Exercise definitions
```
