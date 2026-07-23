import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useProgressStore } from '../stores/progressStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { useGuitarStore } from '../stores/guitarStore';
import { getExercises, formatTypeLabel } from '../api/exercises';
import { Exercise } from '../types/exercise';
import { distributeMinutes, maxExercisesForDuration, clampSessionIndex } from '../utils/sessionPlan';

type TimePreset = '15' | '30' | '60';

interface PlanItem {
  exercise: Exercise;
  category: string;
  categoryLabel: string;
  timeMinutes: number;
  completed: boolean;
}

/** Color palette for category chips/indicators. Falls back to cycling through the palette. */
const CATEGORY_COLOR_MAP: Record<string, string> = {
  'note-identification': 'var(--accent-primary)',
  'modal-practice': '#8b5cf6',
  'chord-voicing': 'var(--success)',
  'ear-training': 'var(--warning)',
  'caged-system': '#ec4899',
  'interval-recognition': '#06b6d4',
  'three-nps': '#f97316',
  'pentatonic': '#14b8a6',
};

const FALLBACK_COLORS = ['#6366f1', '#a855f7', '#0ea5e9', '#84cc16', '#f43f5e', '#eab308'];

function getCategoryColor(type: string, index: number): string {
  return CATEGORY_COLOR_MAP[type] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

const UNDO_TIMEOUT_MS = 5000;

const SessionPlanner: React.FC = () => {
  const [selectedTime, setSelectedTime] = useState<TimePreset | null>(null);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [sessionActive, setSessionActive] = useState(false);
  // Position of the exercise currently being practiced within an active session.
  const [currentIndex, setCurrentIndex] = useState(0);
  const [removedItem, setRemovedItem] = useState<{ item: PlanItem; index: number } | null>(null);
  const [undoTimerId, setUndoTimerId] = useState<ReturnType<typeof setTimeout> | null>(null);

  const { instrument } = useGuitarStore();
  const { progress, getNextReviews } = useProgressStore();
  const { setCurrentExercise, exercises: storeExercises, goToExercise, setSelectedCategory } =
    useExerciseStore();

  // Filter exercises by current instrument
  const instrumentExercises = useMemo(() =>
    allExercises.filter(ex => {
      const instruments = ex.instruments ?? ['guitar', 'bass'];
      return instruments.includes(instrument);
    }),
    [allExercises, instrument]
  );

  // Derive categories from instrument-filtered exercises
  const allCategories = useMemo(() => {
    const seen = new Map<string, number>();
    for (const ex of instrumentExercises) {
      seen.set(ex.type, (seen.get(ex.type) ?? 0) + 1);
    }
    return Array.from(seen.entries()).map(([type], i) => ({
      type,
      label: formatTypeLabel(type),
      color: getCategoryColor(type, i),
    }));
  }, [instrumentExercises]);

  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(() => new Set());

  // Sync enabled categories and clear stale plan when instrument changes
  useEffect(() => {
    setEnabledCategories(new Set(allCategories.map((c) => c.type)));
    setPlan([]);
    setSelectedTime(null);
    setSessionActive(false);
    setCurrentIndex(0);
  }, [allCategories]);

  // Load exercises on mount
  useEffect(() => {
    getExercises().then(setAllExercises);
  }, []);

  // Clean up undo timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerId) clearTimeout(undoTimerId);
    };
  }, [undoTimerId]);

  // Pick a random exercise for a given category, weighted by priority
  const pickExerciseForCategory = useCallback(
    (category: string): Exercise | null => {
      const categoryExercises = instrumentExercises.filter((ex) => ex.type === category);
      if (categoryExercises.length === 0) return null;

      // Build a weighted pool: due reviews first, weak areas next, then least practiced
      const dueReviews = getNextReviews();
      const dueInCategory = categoryExercises.filter((ex) =>
        dueReviews.some((review) => review.exerciseId === ex.id)
      );
      if (dueInCategory.length > 0) {
        return dueInCategory[Math.floor(Math.random() * dueInCategory.length)];
      }

      // Weak areas are stored as display labels (e.g. "Note Identification"),
      // while ex.type is hyphenated (e.g. "note-identification"). Normalize both
      // sides (lowercase + collapse hyphens/spaces) so the labels actually match.
      const normalize = (s: string) => s.toLowerCase().replace(/[\s-]+/g, ' ').trim();
      const weakAreas = progress.weakAreas.map(normalize);
      const weakExercises = categoryExercises.filter((ex) =>
        weakAreas.includes(normalize(formatTypeLabel(ex.type)))
      );
      if (weakExercises.length > 0) {
        return weakExercises[Math.floor(Math.random() * weakExercises.length)];
      }

      // Sort by fewest attempts, then pick randomly from the bottom half
      const sorted = [...categoryExercises].sort((a, b) => {
        const attemptsA = progress.exerciseProgress[a.id]?.totalAttempts ?? 0;
        const attemptsB = progress.exerciseProgress[b.id]?.totalAttempts ?? 0;
        return attemptsA - attemptsB;
      });
      const poolSize = Math.max(1, Math.ceil(sorted.length / 2));
      return sorted[Math.floor(Math.random() * poolSize)];
    },
    [instrumentExercises, progress, getNextReviews]
  );

  // Generate a plan from enabled categories and time preset
  const generatePlan = useCallback(
    (preset: TimePreset) => {
      const categories = allCategories.filter((c) => enabledCategories.has(c.type));
      if (categories.length === 0) return;

      const totalMinutes = parseInt(preset);

      // Cap the number of exercises so each still gets a sensible minimum block
      // of time, then pick one (priority-weighted) exercise per selected
      // category up to that cap.
      const maxItems = maxExercisesForDuration(totalMinutes);
      const chosen: { exercise: Exercise; category: string; categoryLabel: string }[] = [];
      for (const cat of categories) {
        if (chosen.length >= maxItems) break;
        const exercise = pickExerciseForCategory(cat.type);
        if (exercise) {
          chosen.push({ exercise, category: cat.type, categoryLabel: cat.label });
        }
      }
      if (chosen.length === 0) return;

      // Distribute the requested minutes across the chosen exercises so their
      // per-exercise durations sum to EXACTLY the requested session length.
      // (Previously Math.floor + a fixed per-category block left minutes
      // unallocated, e.g. a requested 30-min plan only summing to ~24 min.)
      const minutes = distributeMinutes(totalMinutes, chosen.length);
      const items: PlanItem[] = chosen.map((c, i) => ({
        exercise: c.exercise,
        category: c.category,
        categoryLabel: c.categoryLabel,
        timeMinutes: minutes[i],
        completed: false,
      }));

      setPlan(items);
      setSessionActive(false);
      setCurrentIndex(0);
      dismissUndo();
    },
    [enabledCategories, pickExerciseForCategory]
  );

  const handleTimeSelect = (preset: TimePreset) => {
    setSelectedTime(preset);
    generatePlan(preset);
  };

  const toggleCategory = (type: string) => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        // Don't allow disabling all categories
        if (next.size <= 1) return prev;
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const togglePlanItem = (index: number) => {
    setPlan((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const dismissUndo = useCallback(() => {
    if (undoTimerId) clearTimeout(undoTimerId);
    setRemovedItem(null);
    setUndoTimerId(null);
  }, [undoTimerId]);

  const removePlanItem = (index: number) => {
    if (undoTimerId) clearTimeout(undoTimerId);

    const removed = plan[index];
    setRemovedItem({ item: removed, index });
    setPlan((prev) => prev.filter((_, i) => i !== index));
    // Keep the session pointer on the same item when an earlier one is removed.
    setCurrentIndex((ci) => (index < ci ? ci - 1 : ci));

    const timerId = setTimeout(() => {
      setRemovedItem(null);
      setUndoTimerId(null);
    }, UNDO_TIMEOUT_MS);
    setUndoTimerId(timerId);
  };

  const undoRemove = () => {
    if (!removedItem) return;
    if (undoTimerId) clearTimeout(undoTimerId);

    setPlan((prev) => {
      const newPlan = [...prev];
      newPlan.splice(removedItem.index, 0, removedItem.item);
      return newPlan;
    });
    // Shift the session pointer back if the item is restored at/before it.
    setCurrentIndex((ci) => (removedItem.index <= ci ? ci + 1 : ci));
    setRemovedItem(null);
    setUndoTimerId(null);
  };

  const handleNavigateToExercise = (exercise: Exercise) => {
    setSelectedCategory('all');
    const idx = storeExercises.findIndex((ex) => ex.id === exercise.id);
    if (idx >= 0) {
      goToExercise(idx);
    } else {
      setCurrentExercise(exercise);
    }
    requestAnimationFrame(() => {
      document.querySelector('[data-exercise-container]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleStartSession = () => {
    setSessionActive(true);
    setCurrentIndex(0);
    if (plan.length > 0) {
      handleNavigateToExercise(plan[0].exercise);
    }
  };

  const completedCount = plan.filter((item) => item.completed).length;
  const totalTime = plan.reduce((sum, item) => sum + item.timeMinutes, 0);

  // --- Driven session tracker (N-of-M position + advance control) ---
  const safeIndex = clampSessionIndex(currentIndex, plan.length);
  const currentItem = plan.length > 0 ? plan[safeIndex] : null;
  const allCompleted = plan.length > 0 && plan.every((item) => item.completed);

  // Jump to a specific item in the session (updates the pointer + navigates).
  const goToPlanIndex = (index: number) => {
    if (index < 0 || index >= plan.length) return;
    setCurrentIndex(index);
    handleNavigateToExercise(plan[index].exercise);
  };

  // Advance control: mark the current exercise done and move to the next one.
  const advanceSession = () => {
    setPlan((prev) => prev.map((it, i) => (i === safeIndex ? { ...it, completed: true } : it)));
    if (safeIndex < plan.length - 1) {
      goToPlanIndex(safeIndex + 1);
    }
  };

  const goToPreviousInSession = () => {
    if (safeIndex > 0) goToPlanIndex(safeIndex - 1);
  };

  // Clicking a plan row makes it the current session item (while a session runs).
  const handleItemClick = (index: number) => {
    if (sessionActive) setCurrentIndex(index);
    handleNavigateToExercise(plan[index].exercise);
  };

  return (
    <div className="card">
      <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
        Session Planner
      </h3>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {allCategories.map((cat) => {
          const enabled = enabledCategories.has(cat.type);
          return (
            <button
              key={cat.type}
              className="px-2 py-1 phone-touch rounded-full text-xs font-medium transition-all"
              style={{
                backgroundColor: enabled ? `${cat.color}20` : 'var(--bg-tertiary)',
                color: enabled ? cat.color : 'var(--text-muted)',
                border: `1px solid ${enabled ? cat.color : 'transparent'}`,
                opacity: enabled ? 1 : 0.5,
              }}
              onClick={() => toggleCategory(cat.type)}
              aria-pressed={enabled}
              aria-label={`${enabled ? 'Disable' : 'Enable'} ${cat.label} exercises`}
              title={enabled ? `Remove ${cat.label} from plan` : `Add ${cat.label} to plan`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Time selection */}
      <div className="flex gap-2 mb-4" role="group" aria-label="Session duration">
        {(['15', '30', '60'] as TimePreset[]).map((preset) => (
          <button
            key={preset}
            className="flex-1 phone-touch py-2 px-3 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor:
                selectedTime === preset ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: selectedTime === preset ? 'white' : 'var(--text-secondary)',
              border: `1px solid ${
                selectedTime === preset ? 'var(--accent-primary)' : 'var(--border-color)'
              }`,
            }}
            onClick={() => handleTimeSelect(preset)}
            aria-pressed={selectedTime === preset}
            aria-label={`${preset} minute session`}
          >
            {preset} min
          </button>
        ))}
      </div>

      {/* Generated plan */}
      {plan.length > 0 && (
        <div className="space-y-2">
          {/* Plan header */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {completedCount}/{plan.length} completed
            </p>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {totalTime} min total
            </p>
          </div>

          {/* Progress bar */}
          <div
            className="h-1.5 rounded-full mb-3"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${plan.length > 0 ? (completedCount / plan.length) * 100 : 0}%`,
                backgroundColor: 'var(--success)',
              }}
              role="progressbar"
              aria-valuenow={completedCount}
              aria-valuemin={0}
              aria-valuemax={plan.length}
              aria-label="Session progress"
            />
          </div>

          {/* Active session tracker */}
          {sessionActive && currentItem && (
            <div
              className="mb-3 p-3 rounded-lg"
              style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
            >
              {allCompleted ? (
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: 'var(--success)' }}>
                    Session complete! &#127881;
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    All {plan.length} exercises done.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent-primary)' }}>
                      Now practicing
                    </span>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      Exercise {safeIndex + 1} of {plan.length}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {currentItem.exercise.title}
                  </p>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                    {currentItem.categoryLabel} &middot; {currentItem.timeMinutes} min
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={goToPreviousInSession}
                      disabled={safeIndex === 0}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                      aria-label="Go to previous exercise in session"
                    >
                      &#8592; Prev
                    </button>
                    <button
                      onClick={advanceSession}
                      className="flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                      style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
                      aria-label={safeIndex === plan.length - 1 ? 'Finish session' : 'Complete and go to next exercise'}
                    >
                      {safeIndex === plan.length - 1 ? 'Finish \u2713' : 'Next \u2192'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Undo banner */}
          {removedItem && (
            <div
              className="flex items-center justify-between p-2 rounded-lg text-sm animate-fade-in"
              style={{
                backgroundColor: 'rgba(251, 146, 60, 0.12)',
                border: '1px solid rgba(251, 146, 60, 0.3)',
              }}
              role="alert"
            >
              <span style={{ color: 'var(--text-secondary)' }}>
                Removed &ldquo;{removedItem.item.exercise.title}&rdquo;
              </span>
              <button
                className="text-xs font-semibold px-2 py-1 rounded transition-colors"
                style={{
                  backgroundColor: 'var(--warning)',
                  color: 'white',
                }}
                onClick={undoRemove}
                aria-label={`Undo removing ${removedItem.item.exercise.title}`}
              >
                Undo
              </button>
            </div>
          )}

          {/* Plan items */}
          <ul className="space-y-0 list-none p-0 m-0" aria-label="Practice plan">
            {plan.map((item, index) => (
              <li
                key={item.exercise.id}
                className="flex items-center gap-2 p-2.5 rounded-lg transition-all cursor-pointer group"
                style={{
                  backgroundColor: item.completed
                    ? 'rgba(16, 185, 129, 0.08)'
                    : 'var(--bg-tertiary)',
                  opacity: item.completed ? 0.7 : 1,
                  borderBottom: index < plan.length - 1 ? '1px solid var(--border-color)' : 'none',
                  boxShadow: sessionActive && index === safeIndex ? '0 0 0 2px var(--accent-primary)' : 'none',
                }}
                onClick={() => handleItemClick(index)}
                role="button"
                aria-label={`${item.exercise.title} - ${item.timeMinutes} minutes${item.completed ? ' (completed)' : ''}. Click to open exercise.`}
              >
                {/* Checkbox */}
                <button
                  className="flex-shrink-0 w-5 h-5 phone-touch-sq rounded border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: item.completed
                      ? 'var(--success)'
                      : CATEGORY_COLOR_MAP[item.category] || 'var(--border-color)',
                    backgroundColor: item.completed ? 'var(--success)' : 'transparent',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlanItem(index);
                  }}
                  aria-label={`Mark ${item.exercise.title} as ${item.completed ? 'incomplete' : 'complete'}`}
                  aria-checked={item.completed}
                  role="checkbox"
                >
                  {item.completed && (
                    <span className="text-white text-xs" aria-hidden="true">
                      &#10003;
                    </span>
                  )}
                </button>

                {/* Category color indicator */}
                <div
                  className="flex-shrink-0 w-1 h-8 rounded-full"
                  style={{
                    backgroundColor: CATEGORY_COLOR_MAP[item.category] || 'var(--text-muted)',
                  }}
                  aria-hidden="true"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{
                      color: item.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: item.completed ? 'line-through' : 'none',
                    }}
                  >
                    {item.exercise.title}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {item.categoryLabel}
                  </p>
                </div>

                {/* Time */}
                <span
                  className="flex-shrink-0 text-xs font-mono px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: `${CATEGORY_COLOR_MAP[item.category] || 'var(--text-muted)'}20`,
                    color: CATEGORY_COLOR_MAP[item.category] || 'var(--text-muted)',
                  }}
                >
                  {item.timeMinutes}m
                </span>

                {/* Remove button */}
                <button
                  className="flex-shrink-0 w-6 h-6 phone-touch-sq rounded flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--error)',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    removePlanItem(index);
                  }}
                  aria-label={`Remove ${item.exercise.title} from plan`}
                  title="Remove from plan"
                >
                  <span className="text-xs" aria-hidden="true">&#10005;</span>
                </button>
              </li>
            ))}
          </ul>

          {/* Start session button */}
          {!sessionActive && (
            <button
              className="w-full mt-3 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
              }}
              onClick={handleStartSession}
              aria-label="Start practice session"
            >
              <span aria-hidden="true">&#9654;</span>
              Start Session
            </button>
          )}

          {/* Regenerate button */}
          {selectedTime && (
            <button
              className="w-full mt-1 py-1.5 px-4 rounded-lg text-xs transition-all flex items-center justify-center gap-1"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-color)',
              }}
              onClick={() => generatePlan(selectedTime)}
              aria-label="Regenerate practice plan"
            >
              <span aria-hidden="true">&#8635;</span>
              Regenerate Plan
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {!selectedTime && (
        <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
          Select exercise types above, then pick a session length
        </p>
      )}
    </div>
  );
};

export default SessionPlanner;
