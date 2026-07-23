import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Exercise } from '../types/exercise';
import { useExercise } from '../hooks/useExercise';
import { useChallengeMode } from '../hooks/useChallengeMode';
import ChallengeBanner from './ChallengeBanner';
import { playNote, playChord, initAudio, stopAllNotes } from '../lib/audioEngine';
import {
  AdvancedEarQuestion,
  AdvancedEarSubMode,
  IntervalDirection,
  PlayEvent,
  generateAdvancedEarQuestion,
  subModeFromExerciseId,
} from '../lib/advancedEar';
import { Button, Chip } from './ui';

interface AdvancedEarTrainingExerciseProps {
  exercise: Exercise;
}

const TOTAL_QUESTIONS = 10;

const AdvancedEarTrainingExercise: React.FC<AdvancedEarTrainingExerciseProps> = ({ exercise }) => {
  const { score, questionNumber, isActive, recordAnswer, scorePercentage } = useExercise({
    exerciseId: exercise.id,
    exerciseType: exercise.type,
    totalQuestions: TOTAL_QUESTIONS,
  });
  const [challengeEnabled, setChallengeEnabled] = useState(false);
  const challenge = useChallengeMode({ exerciseId: exercise.id });

  const subMode = useMemo<AdvancedEarSubMode>(
    () => subModeFromExerciseId(exercise.id),
    [exercise.id]
  );

  // Configurable interval direction (only relevant to the interval sub-mode).
  const [direction, setDirection] = useState<IntervalDirection>('ascending');

  const [question, setQuestion] = useState<AdvancedEarQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleAnswerRef = useRef<(answer: string) => void>(() => {});

  // Track mount + every pending timer so scheduled audio and the
  // next-question advance can be cancelled on unmount (no ringing notes
  // after navigation, no setState post-unmount).
  const isMountedRef = useRef(true);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Keep a stable ref so toggling direction doesn't re-trigger audio on its own.
  const directionRef = useRef(direction);
  directionRef.current = direction;

  const playEvents = useCallback((events: PlayEvent[]) => {
    let delay = 0;
    for (const ev of events) {
      const dur = ev.duration;
      const fire = () => {
        if (!isMountedRef.current) return;
        if (ev.notes.length === 1) {
          playNote(ev.notes[0], { duration: dur, velocity: 0.65 });
        } else {
          playChord(ev.notes, { duration: dur, velocity: 0.55 });
        }
      };
      if (delay === 0) {
        fire();
      } else {
        const id = setTimeout(fire, delay);
        timeoutsRef.current.push(id);
      }
      delay += dur * 1000 * 0.9;
    }
  }, []);

  const generateQuestion = useCallback(async () => {
    await initAudio();
    if (!isMountedRef.current) return;
    stopAllNotes();
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];

    const q = generateAdvancedEarQuestion(subMode, {
      difficulty: exercise.difficulty,
      rng: Math.random,
      direction: directionRef.current,
    });

    setQuestion(q);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowFeedback(false);

    // Slight delay so the UI settles before audio starts.
    const startId = setTimeout(() => {
      if (isMountedRef.current) playEvents(q.events);
    }, 300);
    timeoutsRef.current.push(startId);
  }, [subMode, exercise.difficulty, playEvents]);

  const generateQuestionRef = useRef(generateQuestion);
  generateQuestionRef.current = generateQuestion;

  useEffect(() => {
    isMountedRef.current = true;
    if (isActive) {
      generateQuestionRef.current();
    }
    return () => {
      isMountedRef.current = false;
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
      stopAllNotes();
    };
  }, [isActive]);

  const handlePlayAgain = useCallback(() => {
    if (question) playEvents(question.events);
  }, [question, playEvents]);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (selectedAnswer !== null || !isActive || !question) return;

      setSelectedAnswer(answer);
      const correct = answer === question.correct;
      setIsCorrect(correct);
      setShowFeedback(true);
      recordAnswer(correct);
      if (challengeEnabled) challenge.onScored(correct);

      // Reinforce by replaying.
      handlePlayAgain();

      const nextTimer = setTimeout(() => {
        if (isMountedRef.current && score.total + 1 < TOTAL_QUESTIONS) {
          generateQuestion();
        }
      }, 2500);
      timeoutsRef.current.push(nextTimer);
    },
    [selectedAnswer, isActive, question, recordAnswer, score.total, handlePlayAgain, generateQuestion, challengeEnabled, challenge.onScored]
  );

  handleAnswerRef.current = handleAnswer;

  // Keyboard 1-N shortcuts.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive || selectedAnswer !== null || !question) return;
      const idx = Number(e.key) - 1;
      if (!Number.isNaN(idx) && idx >= 0 && idx < question.options.length) {
        e.preventDefault();
        handleAnswerRef.current(question.options[idx]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, selectedAnswer, question]);

  const promptLabel = useMemo(() => {
    switch (subMode) {
      case 'scale':
        return 'Scale / Mode by Ear';
      case 'cadence':
        return 'Cadence by Ear';
      case 'interval':
        return 'Interval by Ear';
      case 'degree':
        return 'Scale Degree by Ear';
    }
  }, [subMode]);

  if (!question) {
    return (
      <div className="text-center p-8" style={{ color: 'var(--text-muted)' }}>
        Press Start to begin {promptLabel}.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score Display */}
      <div className="flex justify-between items-center">
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Question {questionNumber} of {TOTAL_QUESTIONS}
        </div>
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Score: {score.correct}/{score.total}
          {score.total > 0 && (
            <span style={{ color: 'var(--text-muted)' }} className="ml-2">
              ({scorePercentage}%)
            </span>
          )}
        </div>
      </div>

      {/* Challenge mode toggle */}
      <div className="flex justify-end">
        <Chip
          selected={challengeEnabled}
          onClick={() => setChallengeEnabled(!challengeEnabled)}
        >
          Challenge
        </Chip>
      </div>

      {challengeEnabled && (
        <ChallengeBanner
          active={challenge.active}
          timeLeft={challenge.timeLeft}
          answered={challenge.answered}
          score={challenge.score}
          personalBest={challenge.personalBest}
          isNewBest={challenge.isNewBest}
          onStart={challenge.start}
          onStop={challenge.stop}
        />
      )}

      {/* Interval direction controls (interval sub-mode only) */}
      {subMode === 'interval' && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Direction:
          </span>
          {(['ascending', 'descending', 'harmonic'] as IntervalDirection[]).map((d) => (
            <Chip
              key={d}
              selected={direction === d}
              onClick={() => setDirection(d)}
              disabled={selectedAnswer !== null}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </Chip>
          ))}
        </div>
      )}

      {/* Audio prompt */}
      <div className="card p-8 text-center">
        <p className="eyebrow mb-2">{promptLabel}</p>
        <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
          {question.prompt}
        </p>
        <div className="mt-4">
          <Button
            variant="secondary"
            size="md"
            onClick={handlePlayAgain}
            disabled={selectedAnswer !== null}
          >
            Play Again
          </Button>
        </div>
      </div>

      {/* Answer Options */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto"
        role="group"
        aria-label={`Answer options. Press number keys 1 through ${question.options.length} to select an answer`}
      >
        {question.options.map((option, index) => {
          let buttonStyle: React.CSSProperties = {
            padding: '1rem',
            borderRadius: '0.5rem',
            fontWeight: 'bold',
            transition: 'all 0.2s',
            border: 'none',
            cursor: selectedAnswer === null ? 'pointer' : 'default',
          };

          if (selectedAnswer === null) {
            buttonStyle.backgroundColor = 'var(--bg-tertiary)';
            buttonStyle.color = 'var(--text-primary)';
          } else if (option === question.correct) {
            buttonStyle.backgroundColor = 'var(--success)';
            buttonStyle.color = 'white';
          } else if (option === selectedAnswer) {
            buttonStyle.backgroundColor = 'var(--error)';
            buttonStyle.color = 'white';
          } else {
            buttonStyle.backgroundColor = 'var(--bg-tertiary)';
            buttonStyle.color = 'var(--text-muted)';
            buttonStyle.opacity = 0.5;
          }

          return (
            <button
              key={option}
              onClick={() => handleAnswer(option)}
              disabled={selectedAnswer !== null}
              style={buttonStyle}
              className="hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              aria-label={`Option ${index + 1}: ${option}. Press ${index + 1} to select`}
              aria-pressed={selectedAnswer === option}
            >
              <span className="sr-only">{index + 1}: </span>
              {option}
            </button>
          );
        })}
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
        <span aria-hidden="true">Tip: Press number keys to quickly select an answer</span>
        <span className="sr-only">
          Use number keys 1 through {question.options.length} to select answers
        </span>
      </p>

      {/* Feedback */}
      {showFeedback && (
        <div
          className="text-center p-4 rounded-lg animate-fade-in"
          style={{
            backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          }}
          role="alert"
          aria-live="assertive"
        >
          <p
            className="font-medium text-lg"
            style={{ color: isCorrect ? 'var(--success)' : 'var(--error)' }}
          >
            <span aria-hidden="true">{isCorrect ? '✓' : '✗'}</span>
            {isCorrect ? ' Correct!' : ` Incorrect. The answer was ${question.correct}`}
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
};

export default AdvancedEarTrainingExercise;
