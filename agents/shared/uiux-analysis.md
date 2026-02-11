# Guitar Theory Web App - UI/UX Analysis Report

**Date:** February 10, 2026  
**Analyst:** UI/UX Agent  
**Files Reviewed:** App.tsx, ExerciseContainer.tsx, Fretboard.tsx, SettingsPanel.tsx, AudioControls.tsx, ProgressDashboard.tsx, and all exercise components

---

## Executive Summary

The Guitar Theory Web App has a solid foundation with clean visual design and good component organization. However, there are several critical usability issues that significantly impact user experience, particularly around **category filtering (confirmed broken)**, **modal/panel interaction patterns**, and **accessibility concerns**. This report identifies 31 issues across 4 priority levels with specific code fixes.

---

## 1. Critical Issues (Must Fix Immediately)

### 1.1 Category Filtering Does Not Work - CONFIRMED BUG

**File:** `src/components/ExerciseContainer.tsx:32-34, 126-140`

**Problem:** Selecting a category filter (e.g., "Interval Recognition (3)") changes `selectedCategory` state but does NOT update the exercise navigation. The navigation still operates on the full unfiltered `exercises` array instead of `filteredExercises`.

**Root Cause:** The navigation buttons and counter reference `exercises.length` and `exerciseIndex` from the global store, but when filtering, only `filteredExercises` is updated locally. The `goToExercise`, `nextExercise`, and `previousExercise` functions operate on the unfiltered list.

**Current Code (Line 133-134):**
```tsx
<span className="text-sm px-4" style={{ color: 'var(--text-muted)' }}>
  {exerciseIndex + 1} / {exercises.length}  // <-- BUG: Uses unfiltered count
</span>
```

**Fix Required:**
```tsx
// Lines 32-34: filteredExercises is calculated correctly
const filteredExercises = selectedCategory === 'all' 
  ? exercises 
  : exercises.filter(ex => ex.type === selectedCategory);

// Lines 126-140: Navigation should use filtered exercises
<div className="flex items-center justify-between mb-6">
  <div className="flex items-center gap-2">
    <button
      onClick={() => {
        // Find previous exercise within filtered list
        const currentFilteredIndex = filteredExercises.findIndex(ex => ex.id === currentExercise?.id);
        if (currentFilteredIndex > 0) {
          const prevExercise = filteredExercises[currentFilteredIndex - 1];
          const globalIndex = exercises.findIndex(ex => ex.id === prevExercise.id);
          goToExercise(globalIndex);
        }
      }}
      disabled={filteredExercises.findIndex(ex => ex.id === currentExercise?.id) <= 0}
      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Prev
    </button>
    <span className="text-sm px-4" style={{ color: 'var(--text-muted)' }}>
      {filteredExercises.findIndex(ex => ex.id === currentExercise?.id) + 1} / {filteredExercises.length}
    </span>
    <button
      onClick={() => {
        const currentFilteredIndex = filteredExercises.findIndex(ex => ex.id === currentExercise?.id);
        if (currentFilteredIndex < filteredExercises.length - 1) {
          const nextExercise = filteredExercises[currentFilteredIndex + 1];
          const globalIndex = exercises.findIndex(ex => ex.id === nextExercise.id);
          goToExercise(globalIndex);
        }
      }}
      disabled={filteredExercises.findIndex(ex => ex.id === currentExercise?.id) >= filteredExercises.length - 1}
      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Next
    </button>
  </div>
  
  {/* Dropdown should also show only filtered exercises */}
  <select
    value={currentExercise?.id || ''}
    onChange={(e) => {
      const globalIndex = exercises.findIndex(ex => ex.id === e.target.value);
      goToExercise(globalIndex);
    }}
    className="px-3 py-2 rounded-lg text-sm max-w-[200px] sm:max-w-[300px]"
    style={{ 
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-color)'
    }}
  >
    {filteredExercises.map((ex) => (
      <option key={ex.id} value={ex.id}>
        {ex.title}
      </option>
    ))}
  </select>
</div>
```

---

### 1.2 Settings Modal Does Not Close on Backdrop Click - CONFIRMED BUG

**File:** `src/App.tsx:156-177`

**Problem:** The Settings modal has no backdrop click handler. Users can only close it via the X button.

**Current Code (Lines 156-177):**
```tsx
{showSettings && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    {/* No onClick handler on backdrop */}
    <div 
      className="rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
```

**Fix Required:**
```tsx
{showSettings && (
  <div 
    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    onClick={() => setShowSettings(false)}  // Close on backdrop click
  >
    <div 
      className="rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in"
      style={{ backgroundColor: 'var(--bg-primary)' }}
      onClick={(e) => e.stopPropagation()}  // Prevent close when clicking modal content
    >
```

---

### 1.3 No Keyboard Support for Closing Modals/Panels

**File:** `src/App.tsx`

**Problem:** Neither the Settings modal nor the Audio Controls panel can be closed with the Escape key.

**Fix Required (Add to App component, around lines 20-23):**
```tsx
// Add keyboard handler for Escape key
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showSettings) setShowSettings(false);
      if (showAudioControls) setShowAudioControls(false);
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [showSettings, showAudioControls]);
```

---

### 1.4 AudioControls Panel Has Incorrect Theme Styling

**File:** `src/components/AudioControls.tsx:86, 100, 117-121, 168`

**Problem:** The AudioControls component uses hardcoded Tailwind colors (`text-gray-700`, `bg-gray-50`, `border-gray-300`, etc.) instead of CSS variables, causing it to look broken in dark mode.

**Affected Lines:**
- Line 86: `text-gray-700`
- Line 100: `bg-gray-50`
- Line 117: `text-gray-600`
- Line 121: `border-gray-300`
- Line 168: `bg-gray-50`

**Fix Required:** Replace all hardcoded gray classes with CSS variable styles:
```tsx
// Line 86: Change from
<label className="block text-sm font-medium text-gray-700 mb-2">
// To
<label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>

// Line 100: Change from
<div className="p-4 bg-gray-50 rounded-lg">
// To
<div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>

// Line 117-121: Change from
<label className="block text-sm text-gray-600 mb-1">Note</label>
<select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
// To
<label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Note</label>
<select 
  className="w-full px-3 py-2 rounded-lg text-sm"
  style={{ 
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)'
  }}
>

// Apply same pattern to all other gray-* classes in this file
```

---

## 2. High Priority Issues (Should Fix Soon)

### 2.1 Exercise Dropdown Shows Wrong Selection After Category Filter

**File:** `src/components/ExerciseContainer.tsx:146-161`

**Problem:** The dropdown `value={exerciseIndex}` binds to global index, but when filtered, the indices don't match.

**Fix:** Change value binding to exercise ID instead of index (see complete fix in 1.1).

---

### 2.2 ModalPracticeExercise Uses Hardcoded Colors

**File:** `src/components/ModalPracticeExercise.tsx:78, 93-97, 108-112, 125-126, 138, 159, 171-173`

**Problem:** Component uses hardcoded Tailwind colors that break in dark mode.

**Affected areas:**
- Line 78: `text-gray-600`
- Line 93: `text-gray-700`
- Line 108: `text-gray-700`
- Line 125-126: `bg-blue-50`, `text-blue-900`, `text-blue-800`
- Line 138: `bg-gray-50`
- Line 159: `text-gray-700`
- Line 171: `bg-yellow-50`

**Fix:** Replace with CSS variable equivalents (same pattern as AudioControls fix).

---

### 2.3 Missing Focus Visible States on Interactive Elements

**File:** `src/index.css`

**Problem:** Buttons and interactive elements lack visible focus states, hurting keyboard navigation.

**Fix Required (Add to index.css):**
```css
/* Focus visible states for accessibility */
.btn-primary:focus-visible,
.btn-secondary:focus-visible,
.btn-success:focus-visible,
.btn-danger:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

select:focus-visible,
input:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 1px;
}

button:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
```

---

### 2.4 No Loading State During Exercise Load

**File:** `src/components/ExerciseContainer.tsx:36-47`

**Problem:** When exercises load asynchronously, there's no visual feedback. Users see empty UI briefly.

**Fix Required:**
```tsx
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const loadExercises = async () => {
    setIsLoading(true);
    const data = await getExercises();
    setExercises(data);
    if (data.length > 0) {
      setCurrentExercise(data[0]);
    }
    setIsLoading(false);
  };
  loadExercises();
  updateStreak();
}, [setExercises, setCurrentExercise, updateStreak]);

// Then wrap main content:
{isLoading ? (
  <div className="card flex items-center justify-center py-12">
    <div className="text-center">
      <div className="animate-pulse text-4xl mb-4">Loading...</div>
      <p style={{ color: 'var(--text-muted)' }}>Loading exercises...</p>
    </div>
  </div>
) : (
  // ... existing content
)}
```

---

### 2.5 Missing ARIA Labels on Category Filter Buttons

**File:** `src/components/ExerciseContainer.tsx:94-120`

**Problem:** Category filter buttons lack proper ARIA attributes for screen readers.

**Fix Required:**
```tsx
<div 
  className="flex flex-wrap gap-2 mb-4 pb-4" 
  style={{ borderBottom: '1px solid var(--border-color)' }}
  role="tablist"
  aria-label="Exercise categories"
>
  <button
    onClick={() => setSelectedCategory('all')}
    className={...}
    role="tab"
    aria-selected={selectedCategory === 'all'}
    aria-controls="exercise-panel"
  >
    All ({exercises.length})
  </button>
  {categories.map(cat => (
    <button
      key={cat.type}
      onClick={() => setSelectedCategory(cat.type)}
      role="tab"
      aria-selected={selectedCategory === cat.type}
      aria-controls="exercise-panel"
      ...
    >
```

---

### 2.6 Fretboard Canvas Missing Accessibility Attributes

**File:** `src/components/Fretboard.tsx:351-363`

**Problem:** The canvas element lacks accessibility attributes, making it invisible to screen readers.

**Fix Required:**
```tsx
<canvas
  ref={canvasRef}
  onClick={handleCanvasClick}
  className={`${interactive ? 'cursor-pointer' : ''} rounded-lg`}
  style={{ 
    width: '100%', 
    height: 'auto',
    minWidth: `${canvasWidth}px`
  }}
  role="img"
  aria-label={`Guitar fretboard with ${stringCount} strings. ${highlightedPositions.length} notes highlighted. ${interactive ? 'Click to play notes.' : ''}`}
  tabIndex={interactive ? 0 : -1}
/>
```

---

### 2.7 Theme Toggle Button Missing Accessible Label

**File:** `src/components/ThemeToggle.tsx:31-39`

**Problem:** The theme toggle button uses emojis which may not be read correctly by screen readers.

**Fix Required:**
```tsx
<button
  onClick={cycleTheme}
  className="btn-secondary flex items-center gap-2"
  title={`Theme: ${getLabel()}`}
  aria-label={`Current theme: ${getLabel()}. Click to change theme.`}
>
```

---

## 3. Medium Priority Issues (Nice to Have)

### 3.1 Exercise Info Card Has Inconsistent Difficulty Display

**File:** `src/App.tsx:98-103` and `src/components/ExerciseContainer.tsx:177-188`

**Problem:** Difficulty is shown as "Difficulty: 3/5" in one place and as dots in another. Inconsistent UX.

**Recommendation:** Standardize on one format (dots are more visual and engaging).

---

### 3.2 Missing Confirmation Before Leaving Active Exercise

**File:** `src/components/ExerciseContainer.tsx`

**Problem:** Users can navigate away from an active exercise (mid-quiz) without warning, losing progress.

**Fix Required:**
```tsx
const handleNavigate = (navigateFn: () => void) => {
  if (isActive && score.total > 0) {
    if (window.confirm('You have an exercise in progress. Are you sure you want to leave?')) {
      endExercise({ /* partial result */ });
      navigateFn();
    }
  } else {
    navigateFn();
  }
};
```

---

### 3.3 Audio Controls Not Persisted Across Sessions

**File:** `src/stores/audioStore.ts`

**Problem:** Audio settings (volume, metronome BPM, drone settings) reset on page refresh.

**Recommendation:** Use localStorage persistence (Zustand has persist middleware).

---

### 3.4 Instructions Collapse State Resets on Exercise Change

**File:** `src/components/ExerciseContainer.tsx:28`

**Problem:** The `showInstructions` state resets to `true` on every exercise change, which may annoy users who prefer them hidden.

**Recommendation:** Remember user preference in localStorage.

---

### 3.5 Progress Dashboard "Time Practiced" Shows 0m When < 1 Minute

**File:** `src/components/ProgressDashboard.tsx:9-16`

**Problem:** The `formatTime` function returns "0m" for any time under 60 seconds.

**Fix Required:**
```tsx
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};
```

---

### 3.6 Answer Buttons Could Have Keyboard Shortcuts

**File:** Various exercise components

**Problem:** In quiz-style exercises (NoteIdentification, IntervalRecognition, EarTraining), users must click answer buttons. Adding keyboard shortcuts (1-4) would speed up practice.

**Recommendation:**
```tsx
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (selectedAnswer !== null) return;
    const num = parseInt(e.key);
    if (num >= 1 && num <= options.length) {
      handleAnswer(options[num - 1]);
    }
  };
  window.addEventListener('keypress', handleKeyPress);
  return () => window.removeEventListener('keypress', handleKeyPress);
}, [options, selectedAnswer, handleAnswer]);
```

---

### 3.7 No Visual Indication of Which Exercises Are Completed

**File:** `src/components/ExerciseContainer.tsx:156-160`

**Problem:** The exercise dropdown doesn't show completion status. Users can't tell which exercises they've done.

**Recommendation:** Add checkmark or progress indicator:
```tsx
<option key={ex.id} value={idx}>
  {completedExercises.includes(ex.id) ? '✓ ' : ''}{ex.title}
</option>
```

---

### 3.8 Fretboard Horizontal Scroll Not Obvious on Mobile

**File:** `src/components/Fretboard.tsx`

**Problem:** On narrow screens, the fretboard requires horizontal scrolling but there's no visual indicator.

**Recommendation:** Add subtle gradient fade at edges or scroll indicators.

---

## 4. Low Priority Issues (Future Improvements)

### 4.1 Missing Skip Animation Option

Some users may prefer reduced motion. Add `prefers-reduced-motion` support.

### 4.2 No Undo for Reset Progress

The "Reset All Progress" button in Settings could benefit from a 5-second undo window.

### 4.3 Exercise Navigation Could Support Swipe Gestures

On mobile, swipe left/right for next/previous exercise would be intuitive.

### 4.4 Missing Offline Support

Consider implementing service workers for offline practice capability.

### 4.5 Audio Playback Has No Visual Waveform

Add visual feedback when notes/chords are playing (waveform or animation).

### 4.6 No Dark Mode Preview in Settings

Users selecting themes can't preview before applying.

### 4.7 Metronome Has No Visual Beat Indicator

Add a pulsing dot or animation that syncs with the metronome beat.

### 4.8 "Play Again" Buttons Should Have Consistent Styling

Some exercises use `btn-secondary`, others have custom styles.

### 4.9 Exercise Types Could Have Icons

Adding icons to category filters would improve scannability.

### 4.10 Missing Help/Tutorial for First-Time Users

New users might benefit from an optional onboarding flow.

---

## Summary of Required Changes

| Priority | Issue Count | Estimated Effort |
|----------|-------------|------------------|
| Critical | 4 | 4-6 hours |
| High | 7 | 6-8 hours |
| Medium | 8 | 8-10 hours |
| Low | 10 | Future sprints |

### Immediate Actions (Critical):
1. Fix category filtering to update navigation (ExerciseContainer.tsx)
2. Add backdrop click to close Settings modal (App.tsx)
3. Add Escape key support for closing modals (App.tsx)
4. Fix AudioControls dark mode styling (AudioControls.tsx)

### Files Requiring Changes:
- `src/App.tsx` - Lines 156-177 (modal backdrop), add useEffect for keyboard
- `src/components/ExerciseContainer.tsx` - Lines 32-161 (filtering logic)
- `src/components/AudioControls.tsx` - Multiple lines (theme colors)
- `src/components/ModalPracticeExercise.tsx` - Multiple lines (theme colors)
- `src/index.css` - Add focus-visible styles
- `src/components/Fretboard.tsx` - Lines 351-363 (ARIA)
- `src/components/ThemeToggle.tsx` - Lines 31-39 (ARIA)
- `src/components/ProgressDashboard.tsx` - Lines 9-16 (time format)

---

## Appendix: Complete Code Fixes

### A. Complete ExerciseContainer.tsx Fix for Category Filtering

Replace lines 123-162 with:

```tsx
{/* Exercise Navigation - Filtered Aware */}
<div className="flex items-center justify-between mb-6">
  <div className="flex items-center gap-2">
    <button
      onClick={() => {
        const currentIdx = filteredExercises.findIndex(ex => ex.id === currentExercise?.id);
        if (currentIdx > 0) {
          const prevEx = filteredExercises[currentIdx - 1];
          const globalIdx = exercises.findIndex(ex => ex.id === prevEx.id);
          goToExercise(globalIdx);
        }
      }}
      disabled={filteredExercises.findIndex(ex => ex.id === currentExercise?.id) <= 0}
      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Previous exercise"
    >
      Previous
    </button>
    <span className="text-sm px-4" style={{ color: 'var(--text-muted)' }}>
      {Math.max(1, filteredExercises.findIndex(ex => ex.id === currentExercise?.id) + 1)} / {filteredExercises.length}
    </span>
    <button
      onClick={() => {
        const currentIdx = filteredExercises.findIndex(ex => ex.id === currentExercise?.id);
        if (currentIdx < filteredExercises.length - 1) {
          const nextEx = filteredExercises[currentIdx + 1];
          const globalIdx = exercises.findIndex(ex => ex.id === nextEx.id);
          goToExercise(globalIdx);
        }
      }}
      disabled={filteredExercises.findIndex(ex => ex.id === currentExercise?.id) >= filteredExercises.length - 1}
      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Next exercise"
    >
      Next
    </button>
  </div>
  
  <select
    value={currentExercise?.id || ''}
    onChange={(e) => {
      const globalIdx = exercises.findIndex(ex => ex.id === e.target.value);
      if (globalIdx !== -1) goToExercise(globalIdx);
    }}
    className="px-3 py-2 rounded-lg text-sm max-w-[200px] sm:max-w-[300px]"
    style={{ 
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-color)'
    }}
    aria-label="Select exercise"
  >
    {filteredExercises.map((ex) => (
      <option key={ex.id} value={ex.id}>
        {ex.title}
      </option>
    ))}
  </select>
</div>
```

Also, add this effect to sync current exercise when filter changes (add after line 47):

```tsx
// When category filter changes, ensure current exercise is valid for filter
useEffect(() => {
  if (selectedCategory !== 'all' && currentExercise) {
    if (currentExercise.type !== selectedCategory) {
      // Current exercise doesn't match filter - select first filtered exercise
      const firstFiltered = filteredExercises[0];
      if (firstFiltered) {
        const globalIdx = exercises.findIndex(ex => ex.id === firstFiltered.id);
        if (globalIdx !== -1) goToExercise(globalIdx);
      }
    }
  }
}, [selectedCategory, currentExercise, filteredExercises, exercises, goToExercise]);
```

### B. Complete App.tsx Modal Fix

Replace lines 155-177 with:

```tsx
{/* Settings Modal */}
{showSettings && (
  <div 
    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    onClick={() => setShowSettings(false)}
    role="dialog"
    aria-modal="true"
    aria-labelledby="settings-title"
  >
    <div 
      className="rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in"
      style={{ backgroundColor: 'var(--bg-primary)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 id="settings-title" className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h2>
        <button
          onClick={() => setShowSettings(false)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Close settings"
        >
          <span aria-hidden="true">X</span>
        </button>
      </div>
      <SettingsPanel />
    </div>
  </div>
)}
```

Add keyboard handler after line 22:

```tsx
// Keyboard handler for closing modals
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showSettings) setShowSettings(false);
      if (showAudioControls) setShowAudioControls(false);
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [showSettings, showAudioControls]);
```

---

*Report generated by UI/UX Analysis Agent*
