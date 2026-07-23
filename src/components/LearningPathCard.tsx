import React, { useEffect, useMemo, useState } from 'react';
import { useExerciseStore } from '../stores/exerciseStore';
import { useProgressStore } from '../stores/progressStore';
import { useGuitarStore } from '../stores/guitarStore';
import { getExercises } from '../api/exercises';
import { getLearningPath } from '../lib/learningPath';
import type { Exercise } from '../types/exercise';
import { Button } from './ui';

// Guided-path surface (roadmap P1#1): overall progress + one-tap resume /
// "up next", derived from the pure learningPath engine. Deliberately compact —
// the category nav already lets the learner browse the full catalogue.
const LearningPathCard: React.FC = () => {
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const { instrument } = useGuitarStore();
  const { progress, goal, lastExerciseId } = useProgressStore();
  const { exercises: storeExercises, setCurrentExercise, goToExercise, setSelectedCategory } =
    useExerciseStore();

  useEffect(() => {
    getExercises().then(setAllExercises);
  }, []);

  const instrumentExercises = useMemo(
    () => allExercises.filter((e) => !e.instruments || e.instruments.includes(instrument)),
    [allExercises, instrument],
  );

  const path = useMemo(
    () => getLearningPath(instrumentExercises, progress, goal ?? undefined),
    [instrumentExercises, progress, goal],
  );

  if (path.length === 0) return null;

  const doneCount = path.filter((s) => s.status === 'done').length;
  const total = path.length;
  const pct = Math.round((doneCount / total) * 100);
  const current = path.find((s) => s.status === 'current')?.exercise ?? null;

  // Continue = last-viewed exercise when it's still in the path; else the next
  // step on the path (or nothing when everything's been practised).
  const resumeFromLast = lastExerciseId
    ? instrumentExercises.find((e) => e.id === lastExerciseId) ?? null
    : null;
  const resumeExercise = resumeFromLast ?? current;
  const isContinue = resumeExercise !== null && resumeExercise === resumeFromLast;

  const navigate = (exercise: Exercise) => {
    setSelectedCategory('all');
    const idx = storeExercises.findIndex((e) => e.id === exercise.id);
    if (idx >= 0) goToExercise(idx);
    else setCurrentExercise(exercise);
    requestAnimationFrame(() => {
      document
        .querySelector('[data-exercise-container]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="card" role="region" aria-label="Learning path">
      <div className="flex items-center justify-between mb-2">
        <span className="eyebrow">Learning path</span>
        <span className="text-xs text-fg-muted tabular-nums">
          {doneCount} / {total} practised
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-sunken overflow-hidden mb-3" aria-hidden="true">
        <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      {resumeExercise ? (
        <>
          <p className="text-xs text-fg-muted mb-1">
            {isContinue ? 'Continue where you left off' : 'Up next'}
          </p>
          <p className="font-semibold text-fg-strong mb-3 leading-tight">{resumeExercise.title}</p>
          <Button variant="primary" onClick={() => navigate(resumeExercise)}>
            {isContinue ? 'Continue' : 'Start'}
          </Button>
        </>
      ) : (
        <p className="text-sm text-fg-muted">
          You've practised every exercise on the path — keep reviewing to stay sharp.
        </p>
      )}
    </div>
  );
};

export default LearningPathCard;
