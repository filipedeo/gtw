import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Exercise } from '../types/exercise';
import { useExercise } from '../hooks/useExercise';
import { playChord, playNote, initAudio, stopAllNotes } from '../lib/audioEngine';
import { Progression, buildProgressionChords } from '../lib/theoryEngine';

interface ChordProgressionExerciseProps {
  exercise: Exercise;
}

// Sharps array for MIDI/note generation
const KEYS_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const EXERCISE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'Bb'];

const BASIC_PROGRESSIONS: Progression[] = [
  { numerals: ['I', 'IV', 'V', 'I'], degrees: [1, 4, 5, 1], name: 'Classic Cadence' },
  { numerals: ['I', 'V', 'IV', 'I'], degrees: [1, 5, 4, 1] },
  { numerals: ['I', 'IV', 'I', 'V'], degrees: [1, 4, 1, 5] },
  { numerals: ['V', 'IV', 'I'], degrees: [5, 4, 1], name: 'Rock Cadence' },
  { numerals: ['I', 'V', 'I'], degrees: [1, 5, 1] },
  { numerals: ['I', 'IV', 'V'], degrees: [1, 4, 5] },
];

const POP_PROGRESSIONS: Progression[] = [
  { numerals: ['I', 'V', 'vi', 'IV'], degrees: [1, 5, 6, 4], name: 'Axis of Awesome' },
  { numerals: ['I', 'vi', 'IV', 'V'], degrees: [1, 6, 4, 5], name: '50s Progression' },
  { numerals: ['vi', 'IV', 'I', 'V'], degrees: [6, 4, 1, 5] },
  { numerals: ['I', 'IV', 'vi', 'V'], degrees: [1, 4, 6, 5] },
  { numerals: ['vi', 'V', 'IV', 'V'], degrees: [6, 5, 4, 5] },
  { numerals: ['I', 'vi', 'ii', 'V'], degrees: [1, 6, 2, 5] },
  { numerals: ['ii', 'V', 'I'], degrees: [2, 5, 1], name: 'Jazz ii-V-I' },
];

const ADVANCED_PROGRESSIONS: Progression[] = [
  { numerals: ['ii', 'V', 'I'], degrees: [2, 5, 1], name: 'Jazz ii-V-I' },
  { numerals: ['I', 'bVII', 'IV'], degrees: [1, 'b7', 4], name: 'Mixolydian Vamp' },
  { numerals: ['iii', 'vi', 'ii', 'V'], degrees: [3, 6, 2, 5], name: 'Circle of Fourths' },
  { numerals: ['I', 'IV', 'bVII', 'IV'], degrees: [1, 4, 'b7', 4] },
  { numerals: ['vi', 'bVII', 'I'], degrees: [6, 'b7', 1], name: 'Aeolian Cadence' },
  { numerals: ['I', 'iii', 'IV', 'iv'], degrees: [1, 3, 4, '4m'], name: 'Creep Progression' },
  { numerals: ['I', 'vi', 'ii', 'V'], degrees: [1, 6, 2, 5], name: 'Rhythm Changes' },
];

function generateChordNotes(root: string, intervals: number[]): string[] {
  let rootIndex = KEYS_SHARP.indexOf(root);
  if (rootIndex === -1) rootIndex = 0;
  const octave = 3;

  return intervals.map((interval) => {
    const noteIndex = (rootIndex + interval) % 12;
    const noteOctave = octave + Math.floor((rootIndex + interval) / 12);
    return `${KEYS_SHARP[noteIndex]}${noteOctave}`;
  });
}

function generateBassNote(root: string): string {
  let rootIndex = KEYS_SHARP.indexOf(root);
  if (rootIndex === -1) rootIndex = 0;
  return `${KEYS_SHARP[rootIndex]}2`;
}

function formatProgression(numerals: string[]): string {
  return numerals.join(' - ');
}

const ChordProgressionExercise: React.FC<ChordProgressionExerciseProps> = ({ exercise }) => {
  const { score, questionNumber, isActive, recordAnswer, scorePercentage } = useExercise({
    exerciseId: exercise.id,
    exerciseType: exercise.type,
    totalQuestions: 10,
  });

  const [currentKey, setCurrentKey] = useState('C');
  const [correctAnswer, setCorrectAnswer] = useState<string>('');
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [audioChords, setAudioChords] = useState<Array<{ bass: string; notes: string[] }>>([]);
  const [correctProgression, setCorrectProgression] = useState<Progression | null>(null);

  const handleAnswerRef = useRef<(answer: string) => void>(() => {});

  const pool = exercise.id === 'chord-prog-1'
    ? BASIC_PROGRESSIONS
    : exercise.id === 'chord-prog-2'
    ? POP_PROGRESSIONS
    : ADVANCED_PROGRESSIONS;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive || selectedAnswer !== null) return;

      const keyMap: { [key: string]: number } = { '1': 0, '2': 1, '3': 2, '4': 3 };
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
  }, [isActive, selectedAnswer, options]);

  const playProgressionAudio = useCallback((chords: Array<{ bass: string; notes: string[] }>) => {
    const initialDelay = 0.3;
    const chordDuration = 1.2;
    const gap = 0.15;

    chords.forEach((chord, i) => {
      const delay = initialDelay + i * (chordDuration + gap);
      playNote(chord.bass, { duration: chordDuration, velocity: 0.45, delay: delay - 0.02 });
      playChord(chord.notes, { duration: chordDuration, velocity: 0.55, delay });
    });
  }, []);

  const generateQuestion = useCallback(async () => {
    await initAudio();
    stopAllNotes();

    // Pick random key
    const key = EXERCISE_KEYS[Math.floor(Math.random() * EXERCISE_KEYS.length)];
    setCurrentKey(key);

    // Pick random progression
    const progression = pool[Math.floor(Math.random() * pool.length)];
    setCorrectProgression(progression);

    // Build chords
    const chordData = buildProgressionChords(key, progression.degrees);
    const chords = chordData.map((c) => ({
      bass: generateBassNote(c.root),
      notes: generateChordNotes(c.root, c.intervals),
    }));
    setAudioChords(chords);

    // Set correct answer
    const answer = formatProgression(progression.numerals);
    setCorrectAnswer(answer);

    // Generate wrong options (same length preferred)
    const correctLength = progression.numerals.length;
    const sameLengthPool = pool.filter(
      (p) => p.numerals.length === correctLength && formatProgression(p.numerals) !== answer
    );
    const otherPool = pool.filter(
      (p) => p.numerals.length !== correctLength && formatProgression(p.numerals) !== answer
    );

    // Shuffle helper
    const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

    let wrongOptions = shuffle(sameLengthPool).slice(0, 3);
    if (wrongOptions.length < 3) {
      wrongOptions = [...wrongOptions, ...shuffle(otherPool).slice(0, 3 - wrongOptions.length)];
    }

    const allOptions = shuffle([
      answer,
      ...wrongOptions.map((p) => formatProgression(p.numerals)),
    ]);
    setOptions(allOptions);

    // Reset state
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowFeedback(false);

    // Play progression
    playProgressionAudio(chords);
  }, [pool, playProgressionAudio]);

  useEffect(() => {
    if (isActive) {
      generateQuestion();
    }
  }, [isActive, generateQuestion]);

  const handlePlayAgain = async () => {
    await initAudio();
    playProgressionAudio(audioChords);
  };

  const handleAnswer = useCallback((answer: string) => {
    if (selectedAnswer !== null || !isActive) return;

    setSelectedAnswer(answer);
    const correct = answer === correctAnswer;
    setIsCorrect(correct);
    setShowFeedback(true);

    recordAnswer(correct);

    // Replay to reinforce
    handlePlayAgain();

    // Auto-advance
    setTimeout(() => {
      if (score.total + 1 < 10) {
        generateQuestion();
      }
    }, 2500);
  }, [selectedAnswer, isActive, correctAnswer, score.total, recordAnswer, generateQuestion]);

  // Keep ref in sync
  handleAnswerRef.current = handleAnswer;

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

      {/* Prompt Area */}
      <div
        className="p-8 rounded-lg text-center"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <div className="text-6xl mb-4">🎵</div>
        <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
          What chord progression is this?
        </p>
        <button
          onClick={handlePlayAgain}
          className="btn-secondary mt-4 flex items-center gap-2 mx-auto"
          disabled={selectedAnswer !== null}
        >
          🔊 Play Again
        </button>
      </div>

      {/* Answer Options - 2x2 grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto"
        role="group"
        aria-label="Answer options. Press number keys 1 through 4 to select an answer"
      >
        {options.map((option, index) => {
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
          } else if (option === correctAnswer) {
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
            {isCorrect ? ' Correct!' : ` Incorrect. The answer was ${correctAnswer}`}
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            In the key of {currentKey} major
            {correctProgression?.name && ` — "${correctProgression.name}"`}
          </p>
        </div>
      )}

      {/* Reference Guide */}
      <div
        className="p-4 rounded-lg"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <h4 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Quick Reference
        </h4>
        <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <p><strong>Uppercase (I, IV, V):</strong> Major chords — bright sound</p>
          <p><strong>Lowercase (ii, iii, vi):</strong> Minor chords — darker sound</p>
          <p><strong>Bass movement:</strong> Listen to the lowest note stepping between chords</p>
        </div>
      </div>
    </div>
  );
};

export default ChordProgressionExercise;
