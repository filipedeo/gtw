# Guitar Theory Web App - Tester Evaluation Brief

## Context
We're building a Guitar Theory Practice Web App for guitarists to learn music theory through interactive exercises. The app is currently running at http://localhost:3000.

## Project Location
`/Users/fdeo/guitar-theory-webapp/`

## What to Evaluate

### 1. Code Quality Review
Review the following components for code quality, TypeScript correctness, and React best practices:
- `src/components/Fretboard.tsx` - Canvas-based interactive fretboard
- `src/components/NoteIdentificationExercise.tsx` - Note ID exercise with audio
- `src/components/CAGEDExercise.tsx` - CAGED system exercises
- `src/components/ModalPracticeExercise.tsx` - Modal practice with drone
- `src/lib/audioEngine.ts` - Tone.js audio integration
- `src/lib/theoryEngine.ts` - tonal.js music theory wrapper
- `src/stores/*.ts` - Zustand state management

### 2. Music Theory Accuracy
As a music theorist/guitarist perspective, verify:
- CAGED shapes are correctly mapped to fretboard positions
- Modal scale patterns are accurate (Ionian through Locrian)
- Note calculations across the fretboard are correct
- Interval relationships are properly defined

### 3. UX/Pedagogical Review
Evaluate from a guitar learner's perspective:
- Is the fretboard visualization clear and intuitive?
- Do exercises progress logically?
- Is the spaced repetition implementation sound (SM-2 algorithm)?
- Are the 24 exercises well-structured for learning?

### 4. Technical Issues to Check
- Dark mode implementation (CSS variables in `src/index.css`)
- Drone audio (should use Oscillator for continuous playback)
- Responsive fretboard sizing
- State persistence with Zustand

## Output Required
Write your findings to `/Users/fdeo/guitar-theory-webapp/agents/shared/review-report.md` with:
1. **Code Quality Issues** - Bugs, anti-patterns, TypeScript errors
2. **Music Theory Corrections** - Any inaccuracies in theory implementation
3. **UX Improvements** - Suggestions for better learning experience
4. **Priority Fixes** - Ranked list of what should be fixed first
5. **Overall Assessment** - Ready for next phase or needs work?

## Key Files to Read
- `src/api/exercises.ts` - All 24 exercise definitions
- `src/types/*.ts` - TypeScript type definitions
- `src/data/` - Any static data files
- Research docs at `/Users/fdeo/guitar-theory-exploration/` for original requirements
