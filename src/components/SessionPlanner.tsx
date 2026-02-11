import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useProgressStore } from '../stores/progressStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { getExercises, getExerciseCategories } from '../api/exercises';
import { Exercise } from '../types/exercise';

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
  const [removedItem, setRemovedItem] = useState<{ item: PlanItem; index: number } | null>(null);
  const [undoTimerId, setUndoTimerId] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Derive categories dynamically from exercise data — new types are included automatically
  const allCategories = useMemo(() => {
    const cats = getExerciseCategories();
    return cats.map((cat, i) => ({
      type: cat.type,
      label: cat.label,
      color: getCategoryColor(cat.type, i),
    }));
  }, []);

  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(
    () => new Set(getExerciseCategories().map((c) => c.type))
  );

  const { progress, getNextReviews, spacedRepetition } = useProgressStore();
  const { setCurrentExercise, exercises: storeExercises, goToExercise, setSelectedCategory } =
    useExerciseStore();

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
      const categoryExercises = allExercises.filter((ex) => ex.type === category);
      if (categoryExercises.length === 0) return null;

      // Build a weighted pool: due reviews first, weak areas next, then least practiced
      const dueReviews = getNextReviews();
      const dueInCategory = categoryExercises.filter((ex) =>
        dueReviews.some((review) => review.exerciseId === ex.id)
      );
      if (dueInCategory.length > 0) {
        return dueInCategory[Math.floor(Math.random() * dueInCategory.length)];
      }

      const weakAreas = progress.weakAreas;
      const weakExercises = categoryExercises.filter((ex) =>
        weakAreas.some(
          (area) =>
            ex.type.includes(area.toLowerCase()) ||
            ex.title.toLowerCase().includes(area.toLowerCase())
        )
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
    [allExercises, progress, getNextReviews, spacedRepetition]
  );

  // Generate a plan from enabled categories and time preset
  const generatePlan = useCallback(
    (preset: TimePreset) => {
      const categories = allCategories.filter((c) => enabledCategories.has(c.type));
      if (categories.length === 0) return;

      const totalMinutes = parseInt(preset);
      const perCategory = Math.max(2, Math.floor(totalMinutes / categories.length));

      const items: PlanItem[] = [];
      for (const cat of categories) {
        const exercise = pickExerciseForCategory(cat.type);
        if (exercise) {
          items.push({
            exercise,
            category: cat.type,
            categoryLabel: cat.label,
            timeMinutes: perCategory,
            completed: false,
          });
        }
      }

      setPlan(items);
      setSessionActive(false);
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
    if (plan.length > 0) {
      handleNavigateToExercise(plan[0].exercise);
    }
  };

  const completedCount = plan.filter((item) => item.completed).length;
  const totalTime = plan.reduce((sum, item) => sum + item.timeMinutes, 0);

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
              className="px-2 py-1 rounded-full text-xs font-medium transition-all"
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
            className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
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
                }}
                onClick={() => handleNavigateToExercise(item.exercise)}
                role="button"
                aria-label={`${item.exercise.title} - ${item.timeMinutes} minutes${item.completed ? ' (completed)' : ''}. Click to open exercise.`}
              >
                {/* Checkbox */}
                <button
                  className="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
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
                  className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
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
