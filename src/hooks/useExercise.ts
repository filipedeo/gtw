import { useState, useCallback, useEffect, useRef } from 'react';
import { useExerciseStore } from '../stores/exerciseStore';
import { useProgressStore } from '../stores/progressStore';

interface UseExerciseOptions {
  exerciseId: string;
  exerciseType?: string;
  totalQuestions?: number;
  onComplete?: (score: number) => void;
}

interface UseExerciseReturn {
  // State
  score: { correct: number; total: number };
  questionNumber: number;
  isComplete: boolean;
  isActive: boolean;

  // Actions
  recordAnswer: (correct: boolean) => void;
  resetExercise: () => void;

  // Computed
  scorePercentage: number;
  questionsRemaining: number;
}

const DEFAULT_TOTAL_QUESTIONS = 10;

export function useExercise(options: UseExerciseOptions): UseExerciseReturn {
  const { exerciseId, exerciseType, totalQuestions = DEFAULT_TOTAL_QUESTIONS, onComplete } = options;

  // Store hooks
  const { isActive, recordAttempt, endExercise, startTime } = useExerciseStore();
  const { recordExerciseCompletion, updateReviewItem } = useProgressStore();

  // Local state
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isComplete, setIsComplete] = useState(false);

  // Ref to track if completion has been called to prevent double-firing
  const completionCalledRef = useRef(false);

  // Reset state when exercise becomes active
  useEffect(() => {
    if (isActive) {
      setScore({ correct: 0, total: 0 });
      setIsComplete(false);
      completionCalledRef.current = false;
    }
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Reset completion ref on unmount
      completionCalledRef.current = false;
    };
  }, []);

  const recordAnswer = useCallback(
    (correct: boolean) => {
      if (!isActive || isComplete) return;

      // Use functional updater to avoid stale score closure
      setScore(prevScore => {
        const newScore = {
          correct: prevScore.correct + (correct ? 1 : 0),
          total: prevScore.total + 1,
        };

        // Check if exercise is complete
        if (newScore.total >= totalQuestions) {
          if (completionCalledRef.current) return newScore;
          completionCalledRef.current = true;

          setIsComplete(true);

          // Calculate final score
          const finalScore = newScore.correct / newScore.total;
          const timeSpent = startTime ? (Date.now() - startTime) / 1000 : 0;

          // Record to progress/spaced repetition system
          recordExerciseCompletion(exerciseId, finalScore, timeSpent, exerciseType);

          // Update review item with quality based on score
          // Quality: 5 = perfect, 4 = good, 3 = acceptable, 2 = hard, 1 = failed
          const quality = finalScore >= 0.8 ? 5 : finalScore >= 0.6 ? 3 : 1;
          updateReviewItem(exerciseId, quality);

          // End exercise in store
          endExercise({
            exerciseId,
            score: finalScore,
            timeSpent,
            attempts: newScore.total,
            completedAt: new Date(),
          });

          // Call completion callback if provided
          if (onComplete) {
            onComplete(finalScore);
          }
        }

        return newScore;
      });

      // Record attempt in exercise store
      recordAttempt(correct);
    },
    [
      isActive,
      isComplete,
      totalQuestions,
      startTime,
      exerciseId,
      exerciseType,
      recordAttempt,
      recordExerciseCompletion,
      updateReviewItem,
      endExercise,
      onComplete,
    ]
  );

  const resetExercise = useCallback(() => {
    setScore({ correct: 0, total: 0 });
    setIsComplete(false);
    completionCalledRef.current = false;
  }, []);

  // Computed values
  const scorePercentage = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
  const questionsRemaining = totalQuestions - score.total;
  const questionNumber = Math.min(score.total + 1, totalQuestions);

  return {
    // State
    score,
    questionNumber,
    isComplete,
    isActive,

    // Actions
    recordAnswer,
    resetExercise,

    // Computed
    scorePercentage,
    questionsRemaining,
  };
}

export default useExercise;
