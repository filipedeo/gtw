import React, { useState, useEffect, useCallback } from 'react';
import { Exercise } from '../types/exercise';
import { FretPosition, NOTE_NAMES } from '../types/guitar';
import { useGuitarStore } from '../stores/guitarStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { useProgressStore } from '../stores/progressStore';
import { getNoteAtPosition, getRandomPosition } from '../utils/fretboardCalculations';
import { playNote, initAudio } from '../lib/audioEngine';
import Fretboard from './Fretboard';

interface IntervalRecognitionExerciseProps {
  exercise: Exercise;
}

// Interval definitions with semitones and song references
const INTERVALS = [
  { name: 'Minor 2nd', short: 'm2', semitones: 1, song: '"Jaws" theme' },
  { name: 'Major 2nd', short: 'M2', semitones: 2, song: '"Happy Birthday" (first two notes)' },
  { name: 'Minor 3rd', short: 'm3', semitones: 3, song: '"Greensleeves" (first two notes)' },
  { name: 'Major 3rd', short: 'M3', semitones: 4, song: '"Kumbaya" (first two notes)' },
  { name: 'Perfect 4th', short: 'P4', semitones: 5, song: '"Here Comes the Bride"' },
  { name: 'Tritone', short: 'TT', semitones: 6, song: '"The Simpsons" theme' },
  { name: 'Perfect 5th', short: 'P5', semitones: 7, song: '"Star Wars" theme' },
  { name: 'Minor 6th', short: 'm6', semitones: 8, song: '"The Entertainer"' },
  { name: 'Major 6th', short: 'M6', semitones: 9, song: '"My Bonnie Lies Over the Ocean"' },
  { name: 'Minor 7th', short: 'm7', semitones: 10, song: '"Somewhere" (West Side Story)' },
  { name: 'Major 7th', short: 'M7', semitones: 11, song: '"Take On Me" (first two notes)' },
  { name: 'Octave', short: 'P8', semitones: 12, song: '"Somewhere Over the Rainbow"' },
];

// Get intervals based on difficulty
function getIntervalsForDifficulty(difficulty: number): typeof INTERVALS {
  if (difficulty <= 1) {
    // Easy: P4, P5 only
    return INTERVALS.filter(i => ['P4', 'P5'].includes(i.short));
  } else if (difficulty <= 2) {
    // Medium: Add M3, m3
    return INTERVALS.filter(i => ['m3', 'M3', 'P4', 'P5'].includes(i.short));
  } else {
    // Hard: All intervals
    return INTERVALS;
  }
}

const IntervalRecognitionExercise: React.FC<IntervalRecognitionExerciseProps> = ({ exercise }) => {
  const { stringCount, tuning, setHighlightedPositions, clearHighlights } = useGuitarStore();
  const { isActive, recordAttempt, endExercise, startTime } = useExerciseStore();
  const { recordExerciseCompletion, updateReviewItem } = useProgressStore();
  
  const [rootPosition, setRootPosition] = useState<FretPosition | null>(null);
  const [targetPosition, setTargetPosition] = useState<FretPosition | null>(null);
  const [correctInterval, setCorrectInterval] = useState<typeof INTERVALS[0] | null>(null);
  const [options, setOptions] = useState<typeof INTERVALS>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showFeedback, setShowFeedback] = useState(false);
  const [playDirection, setPlayDirection] = useState<'ascending' | 'descending'>('ascending');

  const availableIntervals = getIntervalsForDifficulty(exercise.difficulty);

  const generateQuestion = useCallback(async () => {
    await initAudio();
    
    // Pick a random interval from available ones
    const interval = availableIntervals[Math.floor(Math.random() * availableIntervals.length)];
    
    // Generate root position (leave room for interval)
    const maxFret = exercise.difficulty <= 1 ? 7 : 12;
    const root = getRandomPosition(stringCount, maxFret, 0);
    
    // Calculate target position (same string, different fret)
    const direction = Math.random() > 0.5 ? 'ascending' : 'descending';
    const targetFret = direction === 'ascending' 
      ? root.fret + interval.semitones 
      : root.fret - interval.semitones;
    
    // If target fret is invalid, flip direction
    let finalTargetFret = targetFret;
    let finalDirection = direction;
    if (targetFret < 0 || targetFret > 22) {
      finalDirection = direction === 'ascending' ? 'descending' : 'ascending';
      finalTargetFret = finalDirection === 'ascending' 
        ? root.fret + interval.semitones 
        : root.fret - interval.semitones;
    }
    
    // If still invalid, just use ascending from a lower fret
    if (finalTargetFret < 0 || finalTargetFret > 22) {
      const newRoot = { ...root, fret: Math.min(root.fret, 10) };
      finalTargetFret = newRoot.fret + interval.semitones;
      finalDirection = 'ascending';
      setRootPosition(newRoot);
    } else {
      setRootPosition(root);
    }
    
    const target: FretPosition = { string: root.string, fret: finalTargetFret };
    
    // Generate wrong options
    const wrongOptions = availableIntervals
      .filter(i => i.short !== interval.short)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    const allOptions = [interval, ...wrongOptions].sort(() => Math.random() - 0.5);
    
    setTargetPosition(target);
    setCorrectInterval(interval);
    setOptions(allOptions);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowFeedback(false);
    setPlayDirection(finalDirection);
    
    // Highlight both positions
    setHighlightedPositions([root, target]);
    
    // Play the interval
    const rootNote = getNoteAtPosition(root, tuning, stringCount);
    const targetNote = getNoteAtPosition(target, tuning, stringCount);
    
    setTimeout(() => {
      if (finalDirection === 'ascending') {
        playNote(rootNote, { duration: 0.8, velocity: 0.7 });
        setTimeout(() => playNote(targetNote, { duration: 0.8, velocity: 0.7 }), 600);
      } else {
        playNote(targetNote, { duration: 0.8, velocity: 0.7 });
        setTimeout(() => playNote(rootNote, { duration: 0.8, velocity: 0.7 }), 600);
      }
    }, 300);
    
  }, [stringCount, tuning, exercise.difficulty, availableIntervals, setHighlightedPositions]);

  useEffect(() => {
    if (isActive) {
      generateQuestion();
    } else {
      clearHighlights();
    }
    
    return () => {
      clearHighlights();
    };
  }, [isActive, generateQuestion, clearHighlights]);

  const handlePlayAgain = () => {
    if (!rootPosition || !targetPosition) return;
    
    const rootNote = getNoteAtPosition(rootPosition, tuning, stringCount);
    const targetNote = getNoteAtPosition(targetPosition, tuning, stringCount);
    
    if (playDirection === 'ascending') {
      playNote(rootNote, { duration: 0.8, velocity: 0.7 });
      setTimeout(() => playNote(targetNote, { duration: 0.8, velocity: 0.7 }), 600);
    } else {
      playNote(targetNote, { duration: 0.8, velocity: 0.7 });
      setTimeout(() => playNote(rootNote, { duration: 0.8, velocity: 0.7 }), 600);
    }
  };

  const handleAnswer = (answer: string) => {
    if (selectedAnswer !== null || !isActive || !correctInterval) return;
    
    setSelectedAnswer(answer);
    const correct = answer === correctInterval.short;
    setIsCorrect(correct);
    setShowFeedback(true);
    
    recordAttempt(correct);
    setScore(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1
    }));
    
    // Play the interval again
    handlePlayAgain();
    
    setTimeout(() => {
      if (score.total + 1 >= 10) {
        const finalScore = (score.correct + (correct ? 1 : 0)) / (score.total + 1);
        const timeSpent = startTime ? (Date.now() - startTime) / 1000 : 0;
        
        recordExerciseCompletion(exercise.id, finalScore, timeSpent);
        updateReviewItem(exercise.id, finalScore >= 0.8 ? 5 : finalScore >= 0.6 ? 3 : 1);
        
        endExercise({
          exerciseId: exercise.id,
          score: finalScore,
          timeSpent,
          attempts: score.total + 1,
          completedAt: new Date(),
        });
      } else {
        generateQuestion();
      }
    }, 2500);
  };

  if (!isActive) {
    return (
      <div className="text-center py-8">
        <p style={{ color: 'var(--text-secondary)' }} className="mb-4">
          Click "Start Exercise" to begin interval recognition training.
        </p>
        <div className="flex justify-center gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          <span>Difficulty: {exercise.difficulty}/5</span>
          <span>|</span>
          <span>Intervals: {availableIntervals.map(i => i.short).join(', ')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score Display */}
      <div className="flex justify-between items-center">
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Question {score.total + 1} of 10
        </div>
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Score: {score.correct}/{score.total}
          {score.total > 0 && (
            <span style={{ color: 'var(--text-muted)' }} className="ml-2">
              ({Math.round((score.correct / score.total) * 100)}%)
            </span>
          )}
        </div>
      </div>

      {/* Fretboard */}
      <div className="card p-4">
        <Fretboard interactive={false} />
      </div>

      {/* Question */}
      <div className="text-center">
        <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          What interval is being played?
        </p>
        <div className="flex items-center justify-center gap-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Direction: {playDirection === 'ascending' ? '↑ Ascending' : '↓ Descending'}
          </p>
          <button
            onClick={handlePlayAgain}
            className="btn-secondary text-sm flex items-center gap-1"
            disabled={selectedAnswer !== null}
          >
            🔊 Play Again
          </button>
        </div>
      </div>

      {/* Answer Options */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
        {options.map((option) => {
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
          } else if (option.short === correctInterval?.short) {
            buttonStyle.backgroundColor = 'var(--success)';
            buttonStyle.color = 'white';
          } else if (option.short === selectedAnswer) {
            buttonStyle.backgroundColor = 'var(--error)';
            buttonStyle.color = 'white';
          } else {
            buttonStyle.backgroundColor = 'var(--bg-tertiary)';
            buttonStyle.color = 'var(--text-muted)';
            buttonStyle.opacity = 0.5;
          }
          
          return (
            <button
              key={option.short}
              onClick={() => handleAnswer(option.short)}
              disabled={selectedAnswer !== null}
              style={buttonStyle}
              className="hover:opacity-90 flex flex-col items-center"
            >
              <span className="text-lg">{option.short}</span>
              <span className="text-xs opacity-75">{option.name}</span>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {showFeedback && correctInterval && (
        <div 
          className="text-center p-4 rounded-lg animate-fade-in"
          style={{ 
            backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          }}
        >
          <p 
            className="font-medium text-lg"
            style={{ color: isCorrect ? 'var(--success)' : 'var(--error)' }}
          >
            {isCorrect ? '✓ Correct!' : `✗ Incorrect. The answer was ${correctInterval.name}`}
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            Song reference: {correctInterval.song}
          </p>
        </div>
      )}

      {/* Interval Reference */}
      <div 
        className="p-4 rounded-lg"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <h4 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Interval Reference
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          {availableIntervals.map(interval => (
            <div key={interval.short} className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>{interval.short}:</span>
              <span style={{ color: 'var(--text-muted)' }}>{interval.semitones} semitones</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IntervalRecognitionExercise;
