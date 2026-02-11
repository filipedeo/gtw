import React, { useState, useMemo, useEffect } from 'react';
import { useProgressStore } from '../stores/progressStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { getExercises } from '../api/exercises';
import { Exercise } from '../types/exercise';

type TimePreset = '15' | '30' | '60';

interface PlanItem {
  exercise: Exercise;
  category: string;
  categoryLabel: string;
  timeMinutes: number;
  completed: boolean;
}

const CATEGORY_TIME_ALLOCATIONS: Record<string, Record<string, number>> = {
  '15': {
    'note-identification': 3,
    'modal-practice': 5,
    'chord-voicing': 5,
    'ear-training': 2,
  },
  '30': {
    'note-identification': 5,
    'modal-practice': 7,
    'chord-voicing': 8,
    'ear-training': 5,
    'caged-system': 5,
  },
  '60': {
    'note-identification': 10,
    'modal-practice': 10,
    'chord-voicing': 10,
    'ear-training': 10,
    'caged-system': 10,
    'interval-recognition': 10,
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  'note-identification': 'Note Identification',
  'modal-practice': 'Modal Practice',
  'chord-voicing': 'Chord Voicings',
  'ear-training': 'Ear Training',
  'caged-system': 'CAGED System',
  'interval-recognition': 'Interval Recognition',
};

const CATEGORY_COLORS: Record<string, string> = {
  'note-identification': 'var(--accent-primary)',
  'modal-practice': '#8b5cf6',
  'chord-voicing': 'var(--success)',
  'ear-training': 'var(--warning)',
  'caged-system': '#ec4899',
  'interval-recognition': '#06b6d4',
};

const SessionPlanner: React.FC = () => {
  const [selectedTime, setSelectedTime] = useState<TimePreset | null>(null);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [sessionActive, setSessionActive] = useState(false);

  const { progress, getNextReviews, spacedRepetition } = useProgressStore();
  const { setCurrentExercise, exercises: storeExercises, goToExercise } = useExerciseStore();

  // Load exercises on mount
  useEffect(() => {
    getExercises().then(setAllExercises);
  }, []);

  // Pick the best exercise for a given category
  const pickExerciseForCategory = useMemo(() => {
    return (category: string): Exercise | null => {
      const categoryExercises = allExercises.filter((ex) => ex.type === category);
      if (categoryExercises.length === 0) return null;

      // 1. Check for exercises due for spaced repetition review
      const dueReviews = getNextReviews();
      const dueInCategory = categoryExercises.filter((ex) =>
        dueReviews.some((review) => review.exerciseId === ex.id)
      );
      if (dueInCategory.length > 0) {
        return dueInCategory[0];
      }

      // 2. Check for exercises in weak areas
      const weakAreas = progress.weakAreas;
      const weakExercises = categoryExercises.filter((ex) =>
        weakAreas.some(
          (area) =>
            ex.type.includes(area.toLowerCase()) ||
            ex.title.toLowerCase().includes(area.toLowerCase())
        )
      );
      if (weakExercises.length > 0) {
        return weakExercises[0];
      }

      // 3. Pick the exercise with the fewest attempts (least practiced)
      const sorted = [...categoryExercises].sort((a, b) => {
        const attemptsA = progress.exerciseProgress[a.id]?.totalAttempts ?? 0;
        const attemptsB = progress.exerciseProgress[b.id]?.totalAttempts ?? 0;
        return attemptsA - attemptsB;
      });

      return sorted[0];
    };
  }, [allExercises, progress, getNextReviews, spacedRepetition]);

  // Generate a plan when a time preset is selected
  const generatePlan = (preset: TimePreset) => {
    const allocations = CATEGORY_TIME_ALLOCATIONS[preset];
    if (!allocations) return;

    const items: PlanItem[] = [];

    for (const [category, timeMinutes] of Object.entries(allocations)) {
      const exercise = pickExerciseForCategory(category);
      if (exercise) {
        items.push({
          exercise,
          category,
          categoryLabel: CATEGORY_LABELS[category] || category,
          timeMinutes,
          completed: false,
        });
      }
    }

    setPlan(items);
    setSessionActive(false);
  };

  const handleTimeSelect = (preset: TimePreset) => {
    setSelectedTime(preset);
    generatePlan(preset);
  };

  const togglePlanItem = (index: number) => {
    setPlan((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleNavigateToExercise = (exercise: Exercise) => {
    // Find the exercise index in the store's exercise list
    const idx = storeExercises.findIndex((ex) => ex.id === exercise.id);
    if (idx >= 0) {
      goToExercise(idx);
    } else {
      // Fallback: set the exercise directly
      setCurrentExercise(exercise);
    }
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
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {completedCount}/{plan.length} completed
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
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

          {/* Plan items */}
          <ul className="space-y-1.5 list-none p-0 m-0" aria-label="Practice plan">
            {plan.map((item, index) => (
              <li
                key={item.exercise.id}
                className="flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer group"
                style={{
                  backgroundColor: item.completed
                    ? 'rgba(16, 185, 129, 0.08)'
                    : 'var(--bg-tertiary)',
                  opacity: item.completed ? 0.7 : 1,
                }}
                onClick={() => handleNavigateToExercise(item.exercise)}
                role="button"
                aria-label={`${item.exercise.title} - ${item.timeMinutes} minutes${item.completed ? ' (completed)' : ''}`}
              >
                {/* Checkbox */}
                <button
                  className="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: item.completed
                      ? 'var(--success)'
                      : CATEGORY_COLORS[item.category] || 'var(--border-color)',
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
                      ✓
                    </span>
                  )}
                </button>

                {/* Category color indicator */}
                <div
                  className="flex-shrink-0 w-1 h-8 rounded-full"
                  style={{
                    backgroundColor: CATEGORY_COLORS[item.category] || 'var(--text-muted)',
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
                    backgroundColor: `${CATEGORY_COLORS[item.category] || 'var(--text-muted)'}20`,
                    color: CATEGORY_COLORS[item.category] || 'var(--text-muted)',
                  }}
                >
                  {item.timeMinutes}m
                </span>
              </li>
            ))}
          </ul>

          {/* Start session button */}
          {!sessionActive && (
            <button
              className="w-full mt-3 py-2 px-4 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
              }}
              onClick={handleStartSession}
              aria-label="Start practice session"
            >
              Start Session
            </button>
          )}

          {/* Regenerate button */}
          {selectedTime && (
            <button
              className="w-full mt-1 py-1.5 px-4 rounded-lg text-xs transition-all"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-color)',
              }}
              onClick={() => generatePlan(selectedTime)}
              aria-label="Regenerate practice plan"
            >
              Regenerate Plan
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {!selectedTime && (
        <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
          Select a session length to generate a practice plan
        </p>
      )}
    </div>
  );
};

export default SessionPlanner;
