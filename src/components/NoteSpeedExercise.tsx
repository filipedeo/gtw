import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Exercise } from '../types/exercise';
import { FretPosition, areNotesEqual, Instrument } from '../types/guitar';
import { useGuitarStore } from '../stores/guitarStore';
import { playNote, initAudio, stopAllNotes } from '../lib/audioEngine';
import Fretboard from './Fretboard';
import {
  generateQuestion,
  isAnswerCorrect,
  isPositionCorrect,
  validPositionsForNote,
  formatDrillKey,
  loadPersonalBest,
  savePersonalBest,
} from '../lib/noteSpeed';
type DrillDirection = 'name-the-note' | 'locate-the-note';

interface NoteSpeedExerciseProps {
  exercise: Exercise;
}

const DRILL_DURATION_S = 60;
const NoteSpeedExercise: React.FC<NoteSpeedExerciseProps> = ({ exercise }) => {
  const {
    instrument,
    stringCount,
    tuning,
    setHighlightedPositions,
    setSecondaryHighlightedPositions,
    setMaskedPositions,
    setRootNote,
    clearHighlights,
  } = useGuitarStore();

  // ---- Drill state (managed locally — this is a timed drill, not useExercise) ----
  const [phase, setPhase] = useState<'idle' | 'running' | 'finished'>('idle');
  const [direction, setDirection] = useState<DrillDirection>('name-the-note');
  const [timeLeft, setTimeLeft] = useState(DRILL_DURATION_S);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [attempts, setAttempts] = useState(0);
  const [personalBest, setPersonalBest] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  // ---- Current question ----
  const [currentPosition, setCurrentPosition] = useState<FretPosition | null>(null);
  const [targetNote, setTargetNote] = useState<string>('');
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [revealedPositions, setRevealedPositions] = useState<FretPosition[]>([]);
  // ---- Refs ----
  const isMountedRef = useRef(true);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const handleAnswerRef = useRef<(answer: string) => void>(() => {});
  const handleFretClickRef = useRef<(position: FretPosition) => void>(() => {});

  const drillKey = formatDrillKey(instrument as Instrument, stringCount);

  // Load personal best on mount.
  useEffect(() => {
    setPersonalBest(loadPersonalBest(drillKey));
  }, [drillKey]);

  // ---- Timer ----
  useEffect(() => {
    if (phase !== 'running') return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up — finish the drill.
          clearInterval(intervalRef.current);
          finishDrill();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ---- Unmount cleanup ----
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
      clearInterval(intervalRef.current);
      stopAllNotes();
      clearHighlights();
    };
  }, [clearHighlights]);

  // ---- Question generation ----
  const nextQuestion = useCallback(() => {
    if (!isMountedRef.current) return;
    stopAllNotes();
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];

    if (direction === 'name-the-note') {
      // Generate a random position + multiple-choice options.
      const q = generateQuestion(stringCount, tuning, exercise.difficulty);
      setCurrentPosition(q.position);
      setTargetNote(q.noteName);
      setOptions(q.options);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setShowFeedback(false);
      setRevealedPositions([]);

      // Highlight the target position on the fretboard; mask its name.
      setHighlightedPositions([q.position]);
      setSecondaryHighlightedPositions([]);
      setMaskedPositions([q.position]);
      setRootNote(null);

      // Play the note.
      const timer = setTimeout(() => {
        playNote(q.fullNote, { duration: 1.0, velocity: 0.6 });
      }, 150);
      timeoutsRef.current.push(timer);
    } else {
      // Locate direction: pick a random note name, show it, user clicks the fret.
      const q = generateQuestion(stringCount, tuning, exercise.difficulty);
      setCurrentPosition(q.position);
      setTargetNote(q.noteName);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setShowFeedback(false);
      setRevealedPositions([]);

      // No highlight — the user must find the note. Clear everything.
      setHighlightedPositions([]);
      setSecondaryHighlightedPositions([]);
      setMaskedPositions([]);
      setRootNote(null);

      // Play the target note so the user can also hear it.
      const timer = setTimeout(() => {
        playNote(q.fullNote, { duration: 1.0, velocity: 0.6 });
      }, 150);
      timeoutsRef.current.push(timer);
    }
  }, [
    direction,
    stringCount,
    tuning,
    exercise.difficulty,
    setHighlightedPositions,
    setSecondaryHighlightedPositions,
    setMaskedPositions,
    setRootNote,
  ]);

  const nextQuestionRef = useRef(nextQuestion);
  nextQuestionRef.current = nextQuestion;

  // ---- Start / finish ----
  const startDrill = useCallback(async () => {
    await initAudio();
    if (!isMountedRef.current) return;
    scoreRef.current = 0;
    setScore(0);
    setAttempts(0);
    setIsNewBest(false);
    setTimeLeft(DRILL_DURATION_S);
    setPhase('running');
    // Generate first question after state settles.
    setTimeout(() => nextQuestionRef.current(), 0);
  }, []);

  const finishDrill = useCallback(() => {
    if (!isMountedRef.current) return;
    stopAllNotes();
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
    setPhase('finished');
    clearHighlights();
    setMaskedPositions([]);

    // Persist personal best using the ref (avoids side effects in a state updater).
    const finalScore = scoreRef.current;
    const beaten = savePersonalBest(drillKey, finalScore);
    setIsNewBest(beaten);
    if (beaten) {
      setPersonalBest(finalScore);
    }
  }, [clearHighlights, drillKey, setMaskedPositions]);

  // ---- Answer handling (name-the-note direction) ----
  const handleAnswer = useCallback(
    (answer: string) => {
      if (selectedAnswer !== null || phase !== 'running') return;

      setSelectedAnswer(answer);
      const correct = isAnswerCorrect(answer, targetNote);
      setIsCorrect(correct);
      setShowFeedback(true);
      setAttempts((a) => a + 1);
      if (correct) { scoreRef.current += 1; setScore(scoreRef.current); }

      // Reveal the note on the fretboard + unmask.
      if (currentPosition) {
        setRevealedPositions([currentPosition]);
        setMaskedPositions([]);
      }

      // Auto-advance after a short reveal.
      const timer = setTimeout(() => {
        nextQuestion();
      }, 450);
      timeoutsRef.current.push(timer);
    },
    [selectedAnswer, phase, targetNote, currentPosition, nextQuestion, setMaskedPositions]
  );

  handleAnswerRef.current = handleAnswer;

  // ---- Fret click handling (locate-the-note direction) ----
  const handleFretClick = useCallback(
    (position: FretPosition) => {
      if (phase !== 'running') return;
      if (direction !== 'locate-the-note') return;

      const correct = isPositionCorrect(position, targetNote, tuning, stringCount, exercise.difficulty);
      setIsCorrect(correct);
      setShowFeedback(true);
      setAttempts((a) => a + 1);

      if (correct) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
        setRevealedPositions([position]);
        setHighlightedPositions([position]);

        const timer = setTimeout(() => {
          nextQuestion();
        }, 400);
        timeoutsRef.current.push(timer);
      } else {
        // Flash the correct positions briefly, then advance.
        const valid = validPositionsForNote(targetNote, tuning, stringCount, exercise.difficulty);
        setHighlightedPositions(valid);
        const timer = setTimeout(() => {
          nextQuestion();
        }, 900);
        timeoutsRef.current.push(timer);
      }
    },
    [phase, direction, targetNote, tuning, stringCount, exercise.difficulty, nextQuestion, setHighlightedPositions]
  );

  handleFretClickRef.current = handleFretClick;

  // ---- Keyboard shortcuts (1-4 for name-the-note) ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'running' || direction !== 'name-the-note' || selectedAnswer !== null) return;

      const keyMap: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 };
      if (e.key in keyMap) {
        const index = keyMap[e.key];
        if (index < options.length) {
          e.preventDefault();
          handleAnswerRef.current(options[index]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, direction, selectedAnswer, options]);

  // ---- Direction toggle resets the current question ----
  const switchDirection = (dir: DrillDirection) => {
    if (dir === direction) return;
    setDirection(dir);
    if (phase === 'running') {
      clearHighlights();
      setMaskedPositions([]);
      // Slight delay to let state settle.
      setTimeout(() => nextQuestionRef.current(), 0);
    }
  };

  // ---- Render ----
  const accuracy = attempts > 0 ? Math.round((score / attempts) * 100) : 0;

  if (phase === 'idle') {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="eyebrow" style={{ color: 'var(--accent-primary)' }}>
            Timed Drill · {DRILL_DURATION_S}s
          </p>
          <h3 className="text-xl font-bold mt-2 mb-3" style={{ color: 'var(--text-primary)' }}>
            Note Speed Trainer
          </h3>
          <p className="text-sm max-w-md mx-auto mb-6" style={{ color: 'var(--text-secondary)' }}>
            Name as many fretboard notes as you can in {DRILL_DURATION_S} seconds.
            The clock starts when you press Start.
          </p>

          {/* Direction toggle */}
          <div className="flex justify-center gap-2 mb-6">
            <button
              onClick={() => switchDirection('name-the-note')}
              className="px-4 py-2 rounded-[var(--rad-md)] text-sm font-medium transition-colors"
              style={{
                backgroundColor: direction === 'name-the-note' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: direction === 'name-the-note' ? 'var(--on-accent)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Name the Note
            </button>
            <button
              onClick={() => switchDirection('locate-the-note')}
              className="px-4 py-2 rounded-[var(--rad-md)] text-sm font-medium transition-colors"
              style={{
                backgroundColor: direction === 'locate-the-note' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: direction === 'locate-the-note' ? 'var(--on-accent)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Locate the Note
            </button>
          </div>

          {personalBest > 0 && (
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Personal best: <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{personalBest}</span>
            </p>
          )}

          <button
            onClick={startDrill}
            className="btn-primary px-8 py-3 text-base"
          >
            Start {DRILL_DURATION_S}s Drill
          </button>

          <p className="text-xs mt-4 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
            {direction === 'name-the-note'
              ? 'A fret position will be highlighted. Pick the correct note name from 4 options. Use keys 1-4.'
              : 'A note name will be shown. Click the correct fret position on the fretboard to find it.'}
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="eyebrow" style={{ color: 'var(--accent-primary)' }}>
            Drill Complete
          </p>
          <div className="my-6">
            <div
              className="text-5xl font-bold"
              style={{ color: 'var(--accent-primary)' }}
            >
              {score}
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              correct in {DRILL_DURATION_S}s
            </p>
          </div>

          <div className="flex justify-center gap-8 mb-6">
            <div>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Accuracy
              </p>
              <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {accuracy}%
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Attempts
              </p>
              <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {attempts}
              </p>
            </div>
          </div>

          {isNewBest ? (
            <div
              className="inline-block px-4 py-2 rounded-[var(--rad-full)] text-sm font-bold mb-6"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--on-accent)',
              }}
            >
              New best!
            </div>
          ) : (
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Personal best: <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{personalBest}</span>
            </p>
          )}

          <div>
            <button
              onClick={startDrill}
              className="btn-primary px-6 py-2"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Running phase ----
  return (
    <div className="space-y-4">
      {/* Live stats bar */}
      <div className="flex items-center justify-between">
        <div
          className="px-4 py-2 rounded-[var(--rad-md)]"
          style={{
            backgroundColor: timeLeft <= 10 ? 'var(--danger)' : 'var(--surface-sunken)',
            color: timeLeft <= 10 ? 'white' : 'var(--fg-strong)',
            fontWeight: 700,
            fontSize: '1.25rem',
            minWidth: '4rem',
            textAlign: 'center',
          }}
          aria-label={`Time remaining: ${timeLeft} seconds`}
        >
          {timeLeft}s
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
            {score}
          </div>
          <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            correct · {attempts} attempts
          </div>
        </div>
      </div>

      {/* Direction toggle (compact, during drill) */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => switchDirection('name-the-note')}
          className="px-3 py-1.5 rounded-[var(--rad-md)] text-xs font-medium transition-colors"
          style={{
            backgroundColor: direction === 'name-the-note' ? 'var(--accent-primary)' : 'var(--surface-sunken)',
            color: direction === 'name-the-note' ? 'var(--on-accent)' : 'var(--fg-muted)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Name
        </button>
        <button
          onClick={() => switchDirection('locate-the-note')}
          className="px-3 py-1.5 rounded-[var(--rad-md)] text-xs font-medium transition-colors"
          style={{
            backgroundColor: direction === 'locate-the-note' ? 'var(--accent-primary)' : 'var(--surface-sunken)',
            color: direction === 'locate-the-note' ? 'var(--on-accent)' : 'var(--fg-muted)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Locate
        </button>
      </div>

      {/* Fretboard */}
      <div className="card p-4">
        <Fretboard
          interactive={direction === 'locate-the-note'}
          hideNoteNames={direction === 'name-the-note'}
          revealedPositions={revealedPositions}
          onNoteClick={(position) => handleFretClickRef.current(position)}
        />
      </div>

      {/* Question prompt */}
      <div className="text-center">
        {direction === 'name-the-note' ? (
          <p className="text-lg font-medium" style={{ color: 'var(--fg-strong)' }}>
            What note is highlighted?
            {currentPosition && (
              <span className="text-sm ml-2" style={{ color: 'var(--fg-muted)' }}>
                (String {stringCount - currentPosition.string}, Fret {currentPosition.fret})
              </span>
            )}
          </p>
        ) : (
          <p className="text-lg font-medium" style={{ color: 'var(--fg-strong)' }}>
            Find every{' '}
            <span
              className="px-2 py-0.5 rounded-[var(--rad-md)] font-bold"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--on-accent)' }}
            >
              {targetNote}
            </span>
            {' '}on the fretboard
          </p>
        )}
      </div>

      {/* Answer options (name-the-note only) */}
      {direction === 'name-the-note' && (
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto"
          role="group"
          aria-label="Answer options. Press 1, 2, 3, or 4 to select an answer"
        >
          {options.map((option, index) => {
            let buttonStyle: React.CSSProperties = {
              padding: '1rem 1.5rem',
              borderRadius: 'var(--rad-md)',
              fontWeight: 'bold',
              fontSize: '1.125rem',
              transition: 'all 0.15s',
              border: 'none',
              cursor: selectedAnswer === null ? 'pointer' : 'default',
            };

            if (selectedAnswer === null) {
              buttonStyle.backgroundColor = 'var(--surface-sunken)';
              buttonStyle.color = 'var(--fg-strong)';
            } else if (areNotesEqual(option, targetNote)) {
              buttonStyle.backgroundColor = 'var(--success)';
              buttonStyle.color = 'white';
            } else if (option === selectedAnswer) {
              buttonStyle.backgroundColor = 'var(--danger)';
              buttonStyle.color = 'white';
            } else {
              buttonStyle.backgroundColor = 'var(--surface-sunken)';
              buttonStyle.color = 'var(--fg-muted)';
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
      )}

      {/* Feedback flash */}
      {showFeedback && (
        <div
          className="text-center p-3 rounded-[var(--rad-md)] animate-fade-in"
          style={{
            backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          }}
          role="alert"
          aria-live="assertive"
        >
          <p
            className="font-medium"
            style={{ color: isCorrect ? 'var(--success)' : 'var(--danger)' }}
          >
            {isCorrect ? 'Correct!' : `That was ${targetNote}`}
          </p>
        </div>
      )}

      {/* Personal best line */}
      {personalBest > 0 && (
        <p className="text-center text-xs" style={{ color: 'var(--fg-muted)' }}>
          Personal best: {personalBest}
        </p>
      )}
    </div>
  );
};

export default NoteSpeedExercise;
