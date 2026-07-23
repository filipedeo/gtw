import React, { useState } from 'react';
import { useProgressStore } from '../stores/progressStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { useGuitarStore } from '../stores/guitarStore';
import {
  buildReviewQueue,
  nextInQueue,
  queueProgress,
  type ReviewQueueEntry,
} from '../lib/reviewSession';

// One-tap spaced-repetition review session. When SM-2 has exercises due, this
// surfaces a "Review due (N)" call to action; starting it walks the learner
// through every due exercise, most-overdue first, with a persistent progress
// banner. Purely additive over the stores + the reviewSession engine.

const ReviewSessionCard: React.FC = () => {
  const { getNextReviews } = useProgressStore();
  const { exercises, setSelectedCategory, setCurrentExercise, goToExercise } =
    useExerciseStore();
  const { instrument } = useGuitarStore();

  const [session, setSession] = useState<ReviewQueueEntry[] | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const dueReviews = getNextReviews();
  const dueCount = dueReviews.length;

  const launch = (exerciseId: string) => {
    setSelectedCategory('all');
    const idx = exercises.findIndex((e) => e.id === exerciseId);
    if (idx >= 0) {
      goToExercise(idx);
    } else {
      const ex = exercises.find((e) => e.id === exerciseId);
      if (ex) setCurrentExercise(ex);
    }
    setCurrentId(exerciseId);
    if (typeof document !== 'undefined') {
      requestAnimationFrame(() => {
        document
          .querySelector('[data-exercise-container]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const startSession = () => {
    const queue = buildReviewQueue(dueReviews, exercises, instrument);
    if (queue.length === 0) return;
    setSession(queue);
    launch(queue[0].exerciseId);
  };

  const goNext = () => {
    if (!session) return;
    const next = nextInQueue(session, currentId);
    if (next) {
      launch(next.exerciseId);
    } else {
      endSession();
    }
  };

  const endSession = () => {
    setSession(null);
    setCurrentId(null);
  };

  // Active session: persistent progress banner.
  if (session) {
    const { position, total } = queueProgress(session, currentId);
    const current = session.find((q) => q.exerciseId === currentId);
    const isLast = !nextInQueue(session, currentId);
    return (
      <div
        className="rounded-lg border border-accent/40 bg-accent/5 p-4"
        role="region"
        aria-label="Review session in progress"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              Review session
            </p>
            <p className="truncate text-sm text-fg">
              {position > 0 ? `Reviewing ${position} of ${total}` : `${total} due`}
              {current ? ` — ${current.title}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={endSession}
              className="rounded-md px-3 py-1.5 text-sm text-fg-muted hover:text-fg"
            >
              End
            </button>
            <button
              type="button"
              onClick={goNext}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent hover:opacity-90"
            >
              {isLast ? 'Finish review' : 'Next \u2192'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No session running: only nudge when something is actually due.
  if (dueCount === 0) return null;

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/5 p-4"
      role="region"
      aria-label="Spaced repetition reviews due"
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          Review due
        </p>
        <p className="text-sm text-fg">
          {dueCount} {dueCount === 1 ? 'exercise is' : 'exercises are'} ready to
          review
        </p>
      </div>
      <button
        type="button"
        onClick={startSession}
        className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:opacity-90"
      >
        Start review
      </button>
    </div>
  );
};

export default ReviewSessionCard;
