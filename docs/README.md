# Design Documents

These documents were written before implementation as the initial design specs for the project. They describe the target vision, architecture, and feature set that guided development.

The actual codebase has evolved from these specs — some features were implemented differently, some are not yet built, and some new features were added organically. Refer to these docs for understanding design intent and future direction, but always check the source code for the current state.

| Document | Description |
|----------|-------------|
| [REQUIREMENTS.md](REQUIREMENTS.md) | Product requirements, MVP feature set, development phases |
| [TECHNICAL_SPECS.md](TECHNICAL_SPECS.md) | Architecture, rendering engine, state management, testing strategy |
| [EXERCISE_SPECIFICATIONS.md](EXERCISE_SPECIFICATIONS.md) | Detailed exercise designs, difficulty scaling, mastery criteria |
| [AUDIO_SYSTEM_SPEC.md](AUDIO_SYSTEM_SPEC.md) | Audio engine, sample library, drone/metronome, effects chain |
| [PROJECT_SETUP.md](PROJECT_SETUP.md) | Original project setup guide (versions and structure are outdated) |

## Key Differences from Implementation

- **Fretboard**: Canvas-based as planned, but uses CSS/HTML for controls rather than a full Canvas renderer class
- **Audio**: Uses Tone.js PolySynth (synthesized tones) rather than multi-timbre guitar samples
- **Exercise types**: 9 categories implemented (vs 6 originally planned) — added CAGED, 3NPS, pentatonic, and chord progressions
- **State management**: Zustand stores as planned; Jotai and Dexie.js are dependencies but not heavily used
- **Directory structure**: Flat `src/components/` layout rather than nested subdirectories
- **Versions**: React 19 (not 18), Tailwind CSS 4 (not 3), tonal 6 (not 5)
