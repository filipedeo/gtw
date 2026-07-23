import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Exercise } from '../types/exercise';
import { useExercise } from '../hooks/useExercise';
import { useChallengeMode } from '../hooks/useChallengeMode';
import ChallengeBanner from './ChallengeBanner';
import { Chip } from './ui';
import {
  CIRCLE_OF_FIFTHS,
  KeyInfo,
  getAccidentalNotes,
  keySignatureLabel,
  relativeMinorOf,
  neighborKey,
} from '../lib/circleOfFifths';
import CircleOfFifthsWheel from './CircleOfFifthsWheel';

interface CircleOfFifthsExerciseProps {
  exercise: Exercise;
}

type QuestionKind =
  | 'count'
  | 'key-from-count'
  | 'relative-minor'
  | 'relative-major'
  | 'neighbor';

interface Question {
  prompt: string;
  correct: string;
  options: string[];
  explanation: string;
  /** The major key the question is about — highlighted on the wheel at reveal. */
  subjectMajor: string;
}

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

const unique = (arr: string[]): string[] => Array.from(new Set(arr));

// Build a 4-option set: the correct answer plus up to 3 unique distractors.
function pickOptions(correct: string, pool: string[]): string[] {
  const distractors = shuffle(pool.filter((v) => v !== correct)).slice(0, 3);
  return shuffle([correct, ...distractors]);
}

// Keys included at each difficulty (widening outward from C on the circle).
function keysForDifficulty(difficulty: number): KeyInfo[] {
  if (difficulty <= 1) {
    // Sharp side + C: C, G, D, A, E
    return CIRCLE_OF_FIFTHS.filter((k) => k.position >= 0 && k.position <= 4);
  }
  if (difficulty <= 2) {
    // Add the near flat side: |position| <= 4 (9 keys)
    return CIRCLE_OF_FIFTHS.filter((k) => Math.abs(k.position) <= 4);
  }
  return CIRCLE_OF_FIFTHS; // all 15
}

function kindsForDifficulty(difficulty: number): QuestionKind[] {
  if (difficulty <= 1) return ['count', 'relative-minor'];
  if (difficulty <= 2)
    return ['count', 'key-from-count', 'relative-minor', 'relative-major'];
  return ['count', 'key-from-count', 'relative-minor', 'relative-major', 'neighbor'];
}

const CircleOfFifthsExercise: React.FC<CircleOfFifthsExerciseProps> = ({ exercise }) => {
  const { score, questionNumber, isActive, recordAnswer, scorePercentage } = useExercise({
    exerciseId: exercise.id,
    exerciseType: exercise.type,
    totalQuestions: 10,
  });
  const [challengeEnabled, setChallengeEnabled] = useState(false);
  const challenge = useChallengeMode({ exerciseId: exercise.id });

  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleAnswerRef = useRef<(answer: string) => void>(() => {});
  const isMountedRef = useRef(true);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const keys = useMemo(() => keysForDifficulty(exercise.difficulty), [exercise.difficulty]);
  const kinds = useMemo(() => kindsForDifficulty(exercise.difficulty), [exercise.difficulty]);

  const generateQuestion = useCallback(() => {
    const majors = keys.map((k) => k.major);
    const minors = keys.map((k) => `${k.relativeMinor}m`);
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const pickKey = () => keys[Math.floor(Math.random() * keys.length)];

    let q: Question;

    switch (kind) {
      case 'count': {
        const key = pickKey();
        const correct = keySignatureLabel(key.major);
        const labels = unique(keys.map((k) => keySignatureLabel(k.major)));
        const notes = getAccidentalNotes(key.major);
        q = {
          prompt: `How many sharps or flats are in the key of ${key.major} major?`,
          correct,
          subjectMajor: key.major,
          options: pickOptions(correct, labels),
          explanation: notes.length
            ? `${key.major} major has ${correct}: ${notes.join(', ')}.`
            : `${key.major} major has ${correct}.`,
        };
        break;
      }
      case 'key-from-count': {
        const key = pickKey();
        const label = keySignatureLabel(key.major);
        q = {
          prompt: `Which major key has ${label}?`,
          correct: key.major,
          subjectMajor: key.major,
          options: pickOptions(key.major, majors),
          explanation: `${label} is the signature of ${key.major} major.`,
        };
        break;
      }
      case 'relative-minor': {
        const key = pickKey();
        const correct = relativeMinorOf(key.major)!;
        q = {
          prompt: `What is the relative minor of ${key.major} major?`,
          correct,
          subjectMajor: key.major,
          options: pickOptions(correct, minors),
          explanation: `${key.major} major and ${correct} share the same key signature (${keySignatureLabel(
            key.major
          )}).`,
        };
        break;
      }
      case 'relative-major': {
        const key = pickKey();
        const minor = `${key.relativeMinor}m`;
        q = {
          prompt: `What is the relative major of ${key.relativeMinor} minor?`,
          correct: key.major,
          subjectMajor: key.major,
          options: pickOptions(key.major, majors),
          explanation: `${minor} and ${key.major} major share the same key signature (${keySignatureLabel(
            key.major
          )}).`,
        };
        break;
      }
      case 'neighbor': {
        const direction: 'clockwise' | 'counterclockwise' =
          Math.random() > 0.5 ? 'clockwise' : 'counterclockwise';
        const candidates = keys.filter((k) => neighborKey(k.major, direction));
        const key = candidates[Math.floor(Math.random() * candidates.length)];
        const correct = neighborKey(key.major, direction)!;
        const move =
          direction === 'clockwise'
            ? 'clockwise (up a perfect fifth)'
            : 'counter-clockwise (down a perfect fifth)';
        q = {
          prompt: `Moving ${move} around the circle of fifths from ${key.major}, what is the next key?`,
          correct,
          subjectMajor: correct,
          options: pickOptions(correct, majors),
          explanation: `A perfect fifth ${
            direction === 'clockwise' ? 'above' : 'below'
          } ${key.major} is ${correct}.`,
        };
        break;
      }
    }

    setQuestion(q);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowFeedback(false);
  }, [keys, kinds]);

  const generateQuestionRef = useRef(generateQuestion);
  generateQuestionRef.current = generateQuestion;

  useEffect(() => {
    if (isActive) {
      generateQuestionRef.current();
    }
  }, [isActive]);

  // Cancel pending timers on unmount.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
    };
  }, []);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (selectedAnswer !== null || !isActive || !question) return;

      setSelectedAnswer(answer);
      const correct = answer === question.correct;
      setIsCorrect(correct);
      setShowFeedback(true);
      recordAnswer(correct);
      if (challengeEnabled) challenge.onScored(correct);

      const nextTimer = setTimeout(() => {
        if (isMountedRef.current && score.total + 1 < 10) {
          generateQuestion();
        }
      }, 2500);
      timeoutsRef.current.push(nextTimer);
    },
    [selectedAnswer, isActive, question, recordAnswer, score.total, generateQuestion, challengeEnabled, challenge.onScored]
  );

  handleAnswerRef.current = handleAnswer;

  // Keyboard 1-4 shortcuts.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive || selectedAnswer !== null || !question) return;
      const keyMap: { [key: string]: number } = { '1': 0, '2': 1, '3': 2, '4': 3 };
      if (e.key in keyMap) {
        const index = keyMap[e.key];
        if (index < question.options.length) {
          e.preventDefault();
          handleAnswerRef.current(question.options[index]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, selectedAnswer, question]);

  if (!question) {
    return (
      <div className="text-center p-8" style={{ color: 'var(--text-muted)' }}>
        Press Start to begin the circle of fifths trainer.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score Display */}
      <div className="flex justify-between items-center">
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Question {questionNumber} of 10
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

      {/* Question */}
      <div className="card p-6 text-center">
        <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
          {question.prompt}
        </p>
      </div>

      {/* Answer Options */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto"
        role="group"
        aria-label="Answer options. Press 1, 2, 3, or 4 to select an answer"
      >
        {question.options.map((option, index) => {
          const buttonStyle: React.CSSProperties = {
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
              className="hover:opacity-90 flex flex-col items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              aria-label={`Option ${index + 1}: ${option}. Press ${index + 1} to select`}
              aria-pressed={selectedAnswer === option}
            >
              <span className="sr-only">{index + 1}: </span>
              <span className="text-lg">{option}</span>
            </button>
          );
        })}
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
        <span aria-hidden="true">Tip: Press 1, 2, 3, or 4 to quickly select an answer</span>
        <span className="sr-only">Use number keys 1 through 4 to select answers</span>
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

      {/* Circle of Fifths — visual reference; highlights the answer's key on reveal (P4#6) */}
      <div className="card">
        <span className="eyebrow block mb-2">Circle of Fifths</span>
        <CircleOfFifthsWheel highlightMajor={showFeedback ? question.subjectMajor : null} />
      </div>
    </div>
  );
};

export default CircleOfFifthsExercise;
