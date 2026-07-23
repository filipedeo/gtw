import { useState, useRef, useCallback, useMemo } from 'react';
import { useGuitarStore } from '../stores/guitarStore';
import { useProgressStore } from '../stores/progressStore';
import { getNoteAtPosition } from '../utils/fretboardCalculations';
import { degreeForNote } from '../utils/degreeLabels';
import type { FretPosition } from '../types/guitar';

// Optional objective self-test for study-mode exercises: hide the labels, then
// ask the learner to locate a specific scale degree on the neck. Local state
// only — it MUST NOT touch useExercise/exerciseStore (that singleton's
// endExercise would flip the global `isActive` the host exercise's position
// effect guards on, and would double-count SM-2 against the same exercise id).
// It records ONE objective completion straight to progressStore on finish.

interface UseActiveRecallOptions {
  exerciseId: string;
  exerciseType: string;
  totalQuestions?: number;
}

export interface ActiveRecall {
  /** rootNote + highlighted pattern present, so a degree check is possible. */
  available: boolean;
  active: boolean;
  toggle: () => void;
  /** e.g. "Find the b3" — null when inactive/complete. */
  prompt: string | null;
  question: number;
  total: number;
  score: { correct: number; total: number };
  isComplete: boolean;
  feedback: 'correct' | 'wrong' | null;
  /** Positions to reveal after an answer — feed to <Fretboard revealedPositions>. */
  revealed: FretPosition[];
  /** Hide all note names while testing — feed to <Fretboard hideNoteNames>. */
  hideNames: boolean;
  /** Feed to <Fretboard onNoteClick> while active. */
  onFretClick: (pos: FretPosition, note: string) => void;
  next: () => void;
  restart: () => void;
}

export function useActiveRecall({
  exerciseId,
  exerciseType,
  totalQuestions = 10,
}: UseActiveRecallOptions): ActiveRecall {
  const { highlightedPositions, rootNote, scaleContext, tuning, stringCount } = useGuitarStore();
  const { recordExerciseCompletion, updateReviewItem } = useProgressStore();

  const [active, setActive] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [targetDegree, setTargetDegree] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const startedAtRef = useRef(0);
  const recordedRef = useRef(false);

  const available = rootNote != null && highlightedPositions.length > 0;

  // Degree of the note at a highlighted position (null if unresolvable). Shared
  // by target-picking, click grading, and reveal so they stay in lockstep.
  const degreeAt = useCallback(
    (pos: FretPosition): string | null =>
      degreeForNote(rootNote, scaleContext, getNoteAtPosition(pos, tuning, stringCount)),
    [rootNote, scaleContext, tuning, stringCount],
  );

  const pickTargetDegree = useCallback((): string | null => {
    const pool = highlightedPositions;
    for (let i = 0; i < 8 && pool.length > 0; i++) {
      const deg = degreeAt(pool[Math.floor(Math.random() * pool.length)]);
      if (deg) return deg;
    }
    for (const pos of pool) {
      const deg = degreeAt(pos);
      if (deg) return deg;
    }
    return null;
  }, [highlightedPositions, degreeAt]);

  const revealed = useMemo<FretPosition[]>(() => {
    if (!active || !feedback || !targetDegree) return [];
    return highlightedPositions.filter((p) => degreeAt(p) === targetDegree);
  }, [active, feedback, targetDegree, highlightedPositions, degreeAt]);

  const start = useCallback(() => {
    setActive(true);
    setIsComplete(false);
    setScore({ correct: 0, total: 0 });
    setFeedback(null);
    recordedRef.current = false;
    startedAtRef.current = Date.now();
    setTargetDegree(pickTargetDegree());
  }, [pickTargetDegree]);

  const stop = useCallback(() => {
    setActive(false);
    setFeedback(null);
    setTargetDegree(null);
    setIsComplete(false);
  }, []);

  const toggle = useCallback(() => {
    if (active) stop();
    else start();
  }, [active, start, stop]);

  const onFretClick = useCallback(
    (_pos: FretPosition, note: string) => {
      if (!active || feedback || !targetDegree) return;
      const correct = degreeForNote(rootNote, scaleContext, note) === targetDegree;
      setFeedback(correct ? 'correct' : 'wrong');
      setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    },
    [active, feedback, targetDegree, rootNote, scaleContext],
  );

  const next = useCallback(() => {
    if (score.total >= totalQuestions) {
      if (!recordedRef.current) {
        recordedRef.current = true;
        const accuracy = score.total > 0 ? score.correct / score.total : 0;
        const quality = accuracy >= 0.9 ? 5 : accuracy >= 0.7 ? 4 : accuracy >= 0.5 ? 3 : 2;
        recordExerciseCompletion(exerciseId, accuracy, (Date.now() - startedAtRef.current) / 1000, exerciseType);
        updateReviewItem(exerciseId, quality);
      }
      setIsComplete(true);
      setFeedback(null);
      return;
    }
    setFeedback(null);
    setTargetDegree(pickTargetDegree());
  }, [score, totalQuestions, exerciseId, exerciseType, recordExerciseCompletion, updateReviewItem, pickTargetDegree]);

  return {
    available,
    active: active && available,
    toggle,
    prompt: active && targetDegree && !isComplete ? `Find the ${targetDegree}` : null,
    question: Math.min(score.total + 1, totalQuestions),
    total: totalQuestions,
    score,
    isComplete,
    feedback,
    revealed,
    hideNames: active && !isComplete,
    onFretClick,
    next,
    restart: start,
  };
}

export default useActiveRecall;
