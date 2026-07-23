import { useState, useCallback, useEffect, useRef } from 'react';
import { loadBest, saveBest } from '../lib/challenge';

interface UseChallengeModeOptions {
  exerciseId: string;
  /** Countdown duration in seconds. 0 disables the timer (question-cap only). */
  durationSec?: number;
  /** Optional question cap — challenge ends after this many answers. 0 = no cap. */
  limitQuestions?: number;
}

interface UseChallengeModeReturn {
  active: boolean;
  start: () => void;
  stop: () => void;
  timeLeft: number;
  answered: number;
  score: number;
  personalBest: number;
  isNewBest: boolean;
  onScored: (correct: boolean) => void;
}

const DEFAULT_DURATION_SEC = 60;

/**
 * Challenge mode wrapper — layers ON TOP of any exercise hook (useExercise).
 *
 * The host exercise calls `onScored(correct)` in addition to its normal
 * `recordAnswer` flow. This hook does NOT touch exerciseStore/useExercise
 * internals; it only tracks a local correct count and an optional countdown /
 * question cap, then persists a personal best via `saveBest` on end.
 */
export function useChallengeMode({
  exerciseId,
  durationSec = DEFAULT_DURATION_SEC,
  limitQuestions = 0,
}: UseChallengeModeOptions): UseChallengeModeReturn {
  const [active, setActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(durationSec);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [personalBest, setPersonalBest] = useState(() => loadBest(exerciseId));
  const [isNewBest, setIsNewBest] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist best + flip inactive. Called once when the challenge ends.
  const endChallenge = useCallback(
    (finalScore: number) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setActive(false);
      const beaten = saveBest(exerciseId, finalScore);
      if (beaten) {
        setPersonalBest(finalScore);
        setIsNewBest(true);
      } else {
        setIsNewBest(false);
      }
    },
    [exerciseId]
  );

  const stop = useCallback(() => {
    endChallenge(score);
  }, [endChallenge, score]);

  const start = useCallback(() => {
    setScore(0);
    setAnswered(0);
    setTimeLeft(durationSec);
    setIsNewBest(false);
    setActive(true);
  }, [durationSec]);

  // Countdown timer — only when a duration > 0 is configured.
  useEffect(() => {
    if (!active || durationSec <= 0) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer hit zero — end the challenge with the current score.
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          // Defer the state update to avoid a stale-score closure: read the
          // latest score via a functional updater chain.
          setScore((s) => {
            setActive(false);
            const beaten = saveBest(exerciseId, s);
            if (beaten) {
              setPersonalBest(s);
              setIsNewBest(true);
            }
            return s;
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, durationSec, exerciseId]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const onScored = useCallback(
    (correct: boolean) => {
      if (!active) return;

      setScore((prev) => {
        const next = prev + (correct ? 1 : 0);
        // Check question cap after updating answered count.
        setAnswered((prevAns) => {
          const nextAns = prevAns + 1;
          if (limitQuestions > 0 && nextAns >= limitQuestions) {
            // Question cap reached — end the challenge.
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setActive(false);
            const beaten = saveBest(exerciseId, next);
            if (beaten) {
              setPersonalBest(next);
              setIsNewBest(true);
            }
          }
          return nextAns;
        });
        return next;
      });
    },
    [active, limitQuestions, exerciseId]
  );

  return {
    active,
    start,
    stop,
    timeLeft,
    answered,
    score,
    personalBest,
    isNewBest,
    onScored,
  };
}

export default useChallengeMode;
