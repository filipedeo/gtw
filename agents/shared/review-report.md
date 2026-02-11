# Guitar Theory Web App - Code Review Report

**Review Date:** February 10, 2026  
**Reviewer:** Code Review Agent  
**Files Reviewed:** 10 core files across components, lib, stores, api, and types

---

## 1. Code Quality Issues

### Critical Issues

#### 1.1 Missing useCallback Dependencies (Potential Stale Closures)

**File:** `src/components/Fretboard.tsx:233`
```typescript
}, [stringCount, tuning, fretCount, highlightedPositions, showAllNotes, canvasWidth, canvasHeight, colors, hideNoteNames, revealedPositions, resolvedTheme]);
```
**Issue:** The `drawFretboard` callback references `isPositionRevealed` function which is defined inside the component but not memoized, and also references `drawNote` function. Neither are in the dependency array, though this works because they're defined in the same render cycle. Consider extracting these into stable references.

**File:** `src/components/Fretboard.tsx:331`
```typescript
}, [interactive, stringCount, fretCount, tuning, masterVolume, onNoteClick, FRET_WIDTH]);
```
**Issue:** `FRET_WIDTH` is a calculated value from render scope, not a stable reference. This is recalculated each render based on `containerWidth`. Should be using `containerWidth` or a memoized value instead.

#### 1.2 useEffect Missing Dependencies

**File:** `src/components/NoteIdentificationExercise.tsx:83`
```typescript
}, [isActive, generateQuestion, clearHighlights]);
```
**Issue:** The effect returns a cleanup function that calls `clearHighlights` and `setRevealedPositions`, but `setRevealedPositions` is not in the dependency array. While this works because React state setters are stable, the pattern is inconsistent.

**File:** `src/components/CAGEDExercise.tsx:168`
```typescript
}, [selectedShape, selectedKey, showChord, showScale, isActive, setHighlightedPositions, setRootNote]);
```
**Issue:** Missing `getTransposition` in dependencies. The effect calls `getTransposition()` which depends on `selectedKey` and `selectedShape`. While these are in the deps array, the function should be memoized with useCallback for clarity.

### High Priority Issues

#### 1.3 Memory Leak Potential in Audio Engine

**File:** `src/lib/audioEngine.ts:118-132`
```typescript
setTimeout(() => {
  if (droneOscillator) {
    droneOscillator.stop();
    droneOscillator.dispose();
    droneOscillator = null;
  }
  // ...
}, 400);
```
**Issue:** The setTimeout creates a race condition if `stopDrone()` is called multiple times in quick succession, or if component unmounts before timeout completes. Consider using a cancellable timeout or tracking pending cleanups.

#### 1.4 TypeScript Type Safety Issues

**File:** `src/components/Fretboard.tsx:283-284`
```typescript
const rootIndex = NOTE_NAMES.indexOf(rootNote as any);
const noteIndex = NOTE_NAMES.indexOf(noteName as any);
```
**Issue:** Using `as any` bypasses TypeScript safety. Should properly type-check or use a type guard.

**File:** `src/components/CAGEDExercise.tsx:136`
```typescript
const shapeRootIndex = KEYS.indexOf(selectedShape === 'A' ? 'A' : selectedShape === 'E' ? 'E' : selectedShape === 'D' ? 'D' : selectedShape === 'G' ? 'G' : 'C');
```
**Issue:** Redundant ternary chain. The condition essentially returns `selectedShape` when it matches the shapes. Should be simplified to:
```typescript
const shapeRootIndex = KEYS.indexOf(selectedShape);
```

#### 1.5 Potential Null Reference Issues

**File:** `src/components/NoteIdentificationExercise.tsx:116`
```typescript
const timeSpent = startTime ? (Date.now() - startTime) / 1000 : 0;
```
**Issue:** Good null check here, but the `startTime` type should be `number | null` in the store interface to make this explicit.

**File:** `src/utils/fretboardCalculations.ts:19`
```typescript
const transposed = Note.transpose(openStringNote, `${fret}m2`.replace('0m2', '1P'));
```
**Issue:** This line is dead code - `transposed` is never used. The actual transposition happens via MIDI math below. Should be removed.

### Medium Priority Issues

#### 1.6 React State Update on Unmounted Component

**File:** `src/components/NoteIdentificationExercise.tsx:112-131`
```typescript
setTimeout(() => {
  if (score.total + 1 >= 10) {
    // ... multiple state updates
  } else {
    generateQuestion();
  }
}, 2000);
```
**Issue:** If component unmounts during the 2-second delay, this will attempt to update state on an unmounted component. Should track mounted state or use a cleanup function.

#### 1.7 Inconsistent Error Handling

**File:** `src/lib/audioEngine.ts`
All functions have try-catch blocks but only log errors to console. The UI has no way to know if audio failed to initialize or play.

**Recommendation:** Add error state to audio store and surface errors to users (e.g., "Audio failed to initialize. Click to retry.").

#### 1.8 Canvas Scaling Issues

**File:** `src/components/Fretboard.tsx:340-346`
```typescript
const dpr = window.devicePixelRatio || 1;
canvas.width = canvasWidth * dpr;
canvas.height = canvasHeight * dpr;
canvas.style.width = `${canvasWidth}px`;
canvas.style.height = `${canvasHeight}px`;
ctx.scale(dpr, dpr);
```
**Issue:** The DPR scaling happens in the useEffect, but click handling in `handleCanvasClick` doesn't account for CSS sizing differences when canvas is stretched via `width: 100%` style. The `scaleX/scaleY` calculation helps, but edge cases exist on high-DPR displays.

---

## 2. Music Theory Corrections

### Critical Music Theory Issues

#### 2.1 CAGED Shape Scale Patterns - Incorrect Offsets

**File:** `src/components/CAGEDExercise.tsx:33-37`
```typescript
// C Shape scale pattern
scalePattern: [
  [5, 0], [5, 2], [4, 0], [4, 2], [4, 3],
  [3, 0], [3, 2], [2, 0], [2, 1], [2, 3],
  [1, 0], [1, 1], [1, 3], [0, 0], [0, 2], [0, 3]
]
```
**Issue:** The scale patterns use fret offsets relative to some assumed position but the `rootFret` for C shape is 3. When transposed to other keys, the open string references (fret 0) create impossible positions (negative frets). The pattern assumes open position C but the rootFret suggests barred position.

**Correction:** Scale patterns should be relative to the chord's root position (rootFret), not include absolute fret 0 positions.

#### 2.2 A Shape Chord - Missing String

**File:** `src/components/CAGEDExercise.tsx:43-49`
```typescript
chordPositions: [
  { string: 4, fret: 0 }, // Root (A)
  { string: 3, fret: 2 }, // E
  { string: 2, fret: 2 }, // A
  { string: 1, fret: 2 }, // C#
  { string: 0, fret: 0 }, // E
],
```
**Issue:** The open A chord should include string 5 (low E) muted or not played. More importantly, when this shape is moved up the neck as a barre chord, string 0 at fret 0 doesn't transpose correctly. The chord positions need to be all relative offsets from the barre position.

**Correction:** For barred A shape, all positions should be relative to the barre fret, not include open strings.

#### 2.3 Modal Characteristic Notes - Minor Inaccuracy

**File:** `src/lib/theoryEngine.ts:35`
```typescript
{ name: 'ionian', displayName: 'Ionian (Major)', characteristicNote: '4' },
```
**Issue:** While not incorrect, the characteristic note for Ionian is often considered the major 7th (M7), as the perfect 4th exists in multiple modes. The "4" is the avoid note in Ionian (clashes with M3), not the characteristic note.

**Recommendation:** Update to:
```typescript
{ name: 'ionian', displayName: 'Ionian (Major)', characteristicNote: 'M7' },
```

#### 2.4 Interval Naming Inconsistency

**File:** `src/components/Fretboard.tsx:287`
```typescript
const intervalNames = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
```
**Issue:** The tritone (6 semitones) is labeled 'b5' but could also be '#4' depending on context. In a major scale context, the interval from root to the 4th degree raised is #4, not b5.

**Recommendation:** Context-aware interval naming, or use both symbols where appropriate.

### Medium Priority Theory Issues

#### 2.5 Scale Position Calculation Edge Case

**File:** `src/utils/fretboardCalculations.ts:77-80`
```typescript
if (noteChroma !== undefined && scaleChromas.includes(noteChroma)) {
  positions.push({ string, fret, note: { name: note.replace(/\d/, ''), octave: parseInt(note.match(/\d/)?.[0] || '3') } });
}
```
**Issue:** The regex `note.match(/\d/)?.[0]` only captures the first digit. For notes like "A10" (MIDI-style), this would incorrectly return octave 1 instead of 10. Use `/\d+/` pattern instead.

#### 2.6 Missing Enharmonic Handling

**File:** `src/components/NoteIdentificationExercise.tsx:43-46`
```typescript
const wrongOptions = NOTE_NAMES
  .filter(n => n !== noteName)
```
**Issue:** If the correct note is "Db", it will never match against NOTE_NAMES which uses sharps (C#). The comparison should use chromatic equivalence, not string matching.

**File:** `src/types/guitar.ts:55`
```typescript
export const NOTE_NAMES: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
```
**Recommendation:** Add utility function to normalize note names and handle enharmonic equivalents (Db = C#, etc.).

#### 2.7 Drone Octave May Be Too Low

**File:** Multiple components use octave 2 for drones:
```typescript
setDroneConfig({ note: selectedKey, octave: 2 });
```
**Issue:** Octave 2 notes (e.g., A2 = 110Hz) are quite low and may be difficult to hear on laptop speakers or cause muddiness. Consider octave 3 for general use.

---

## 3. UX/Architecture Improvements

### Architecture Issues

#### 3.1 Exercise State Management Fragmentation

The exercise state is split across multiple stores:
- `exerciseStore` - exercise activation/results
- `guitarStore` - fretboard highlighting
- `audioStore` - drone/metronome state
- `progressStore` - completion tracking

**Issue:** Exercise components must coordinate across all these stores, leading to complex useEffect chains and potential race conditions.

**Recommendation:** Consider an exercise-specific compound store or context that encapsulates the full exercise lifecycle, or use a state machine (XState) for exercise flow.

#### 3.2 Audio Initialization UX

**File:** `src/lib/audioEngine.ts:12-31`
Audio requires user interaction to start (Web Audio API requirement), but this is handled silently with `await initAudio()` scattered throughout components.

**Recommendation:** 
- Add a visible "Enable Audio" button/modal on first interaction
- Show clear feedback when audio is ready
- Handle the case where audio fails gracefully

#### 3.3 Component-Exercise Coupling

Each exercise type has a dedicated component (`CAGEDExercise`, `NoteIdentificationExercise`, `ModalPracticeExercise`), but they share significant logic:
- Fretboard integration
- Drone control
- Score tracking
- Cleanup on unmount

**Recommendation:** Extract shared exercise logic into a custom hook:
```typescript
function useExercise(exerciseId: string) {
  // Shared fretboard highlighting
  // Shared drone control
  // Shared score tracking
  // Automatic cleanup
}
```

#### 3.4 Missing Loading and Error States

Components transition directly between inactive and active states without loading indicators. API calls (even simulated ones) have no loading state.

**Recommendation:** Add skeleton loaders for exercise content and error boundaries for graceful failure handling.

### UX Issues

#### 3.5 Canvas Accessibility

**File:** `src/components/Fretboard.tsx`
The canvas fretboard has no accessibility features:
- No keyboard navigation
- No screen reader support
- No ARIA labels
- Click targets are calculated, not discrete elements

**Recommendation:** 
- Add keyboard navigation (arrow keys to move between positions)
- Announce notes via aria-live regions when played
- Consider an SVG-based alternative that allows proper semantic elements

#### 3.6 Answer Feedback Timing

**File:** `src/components/NoteIdentificationExercise.tsx:111-131`
The 2-second delay after answering is fixed and not configurable. Fast learners may find this frustrating.

**Recommendation:** Allow users to proceed immediately with a "Next" button, or make the delay configurable in settings.

#### 3.7 Inconsistent Styling Approach

**File:** `src/components/ModalPracticeExercise.tsx`
Uses hardcoded Tailwind color classes:
```typescript
className="text-gray-600"
className="bg-blue-50"
```

**File:** `src/components/CAGEDExercise.tsx`
Uses CSS variables:
```typescript
style={{ color: 'var(--text-secondary)' }}
```

**Issue:** Inconsistent theming approach will cause issues with dark mode or custom themes.

**Recommendation:** Standardize on CSS variables for all theme-aware colors, or use Tailwind's dark mode utilities consistently.

---

## 4. Priority Fixes

### P0 - Critical (Fix Before Any Release)

1. **CAGED scale pattern positions** - Currently produce invalid fret positions when transposed. Users will see incorrect scale patterns for any key other than the base shape key.

2. **Memory leak in audio engine** - The setTimeout cleanup race condition can cause audio artifacts and memory leaks with heavy use.

3. **Enharmonic note handling** - Note identification exercises will mark correct answers as wrong when Tonal.js returns flat names (Db) instead of sharps (C#).

### P1 - High Priority (Fix in Next Sprint)

4. **useCallback dependency issues** - Stale closure bugs in Fretboard click handling can cause incorrect note identification on resized windows.

5. **State update on unmounted component** - Exercise completion callbacks can fire after navigation away, causing React warnings and potential issues.

6. **CAGED chord positions for barre chords** - Open string positions don't transpose correctly for barre chord shapes.

### P2 - Medium Priority (Fix in Next 2 Sprints)

7. **Standardize theming approach** - Unify CSS variables vs Tailwind classes for dark mode support.

8. **Add error handling UI for audio** - Surface audio initialization failures to users.

9. **Extract shared exercise hook** - Reduce code duplication across exercise components.

10. **Canvas click accuracy on high-DPR displays** - Edge cases in scaling calculations.

### P3 - Low Priority (Backlog)

11. **Accessibility improvements** - Keyboard navigation, screen reader support for fretboard.

12. **Modal characteristic note accuracy** - Update Ionian characteristicNote from '4' to 'M7'.

13. **Configurable answer delay** - Allow users to control feedback timing.

14. **Interval context awareness** - Distinguish between #4 and b5 based on musical context.

---

## 5. Overall Assessment

### Strengths

1. **Solid foundational architecture** - The separation of concerns between stores, components, and utilities is well-designed.

2. **Comprehensive exercise coverage** - The 24 exercises cover a wide range of essential guitar theory topics from beginner to advanced.

3. **Good use of established libraries** - Tone.js for audio and Tonal.js for music theory are excellent choices that prevent reinventing the wheel.

4. **Canvas-based fretboard** - Performs well and looks professional with the gradient/shadow effects.

5. **Persistence** - Guitar configuration is persisted via Zustand middleware, good for user experience.

### Concerns

1. **Music theory accuracy in CAGED implementation** - The core value proposition (CAGED system teaching) has calculation bugs that will confuse learners.

2. **No test coverage observed** - No test files were provided for review. For a theory-teaching app, test coverage of the music calculations is essential.

3. **Audio reliability** - The race conditions and lack of error surfacing could lead to frustrating silent failures.

4. **Accessibility debt** - Canvas-only fretboard excludes users who rely on keyboard navigation or screen readers.

### Readiness Assessment

**Is it ready for the next development phase?** 

**Conditional Yes** - with the following requirements:

1. The P0 issues (CAGED scale patterns, audio memory leak, enharmonic handling) MUST be fixed before any user testing.

2. Add integration tests for:
   - `getNoteAtPosition` with all tunings
   - CAGED shape transposition across all keys
   - Note identification correct answer detection

3. Manual QA pass on all 5 CAGED shapes in all 12 keys to verify scale patterns display correctly.

Once these critical items are addressed, the codebase is solid enough to proceed with additional feature development, UI polish, and beta testing.

---

**End of Review**
