import React from 'react';
import { useProgressStore } from '../stores/progressStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { useGuitarStore } from '../stores/guitarStore';
import { recommendNext, type RecommendationReason } from '../lib/practicePlan';

// Small "what should I do next?" nudge. Surfaces spaced-repetition reviews that
// are due and a single recommended exercise, with a one-tap launch. Pure
// presentation over the practicePlan engine + the stores.

const REASON_META: Record<
  RecommendationReason,
  { badge: string; cta: string }
> = {
  review: { badge: 'Review due', cta: 'Review now' },
  'weak-area': { badge: 'Weak spot', cta: 'Practise' },
  new: { badge: 'Something new', cta: 'Start' },
  refresh: { badge: 'Keep it fresh', cta: 'Practise' },
};

const PracticePlanCard: React.FC = () => {
  const { progress, getNextReviews } = useProgressStore();
  const { exercises, setSelectedCategory, setCurrentExercise, goToExercise } =
    useExerciseStore();
  const { instrument } = useGuitarStore();

  const dueReviews = getNextReviews();

  // Only recommend exercises playable on the current instrument.
  const available = exercises.filter(
    (e) => !e.instruments || e.instruments.includes(instrument)
  );

  const recommendation = recommendNext(available, progress, dueReviews);

  if (!recommendation) return null;

  const { exercise, reason, detail } = recommendation;
  const meta = REASON_META[reason];

  const launch = () => {
    // Mirror the session planner's navigation so the exercise view is reached
    // regardless of which panel this card is rendered in.
    setSelectedCategory('all');
    const idx = exercises.findIndex((e) => e.id === exercise.id);
    if (idx >= 0) {
      goToExercise(idx);
    } else {
      setCurrentExercise(exercise);
    }
    if (typeof document !== 'undefined') {
      requestAnimationFrame(() => {
        document
          .querySelector('[data-exercise-container]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const dueCount = dueReviews.length;

  return (
    <div className="card" data-testid="practice-plan-card">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          Up next
        </h3>
        {dueCount > 0 && (
          <span
            className="text-xs font-medium px-2 py-1 rounded-full"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            aria-label={`${dueCount} exercise${dueCount === 1 ? '' : 's'} due for review`}
          >
            {dueCount} due
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div
            className="text-xs uppercase tracking-wide mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            {meta.badge}
          </div>
          <div className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {exercise.title}
          </div>
          <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {detail}
          </div>
        </div>

        <button
          type="button"
          onClick={launch}
          className="btn-primary shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          aria-label={`${meta.cta}: ${exercise.title}`}
        >
          {meta.cta}
        </button>
      </div>
    </div>
  );
};

export default PracticePlanCard;
