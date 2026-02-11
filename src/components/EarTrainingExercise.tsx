import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Exercise } from '../types/exercise';
import { useExercise } from '../hooks/useExercise';
import { playChord, playNote, initAudio, stopAllNotes } from '../lib/audioEngine';

interface EarTrainingExerciseProps {
  exercise: Exercise;
}

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
// Internal sharps array for MIDI/note generation
const KEYS_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Chord quality definitions
const CHORD_QUALITIES = {
  basic: [
    { name: 'Major', intervals: [0, 4, 7], description: 'Bright, happy' },
    { name: 'Minor', intervals: [0, 3, 7], description: 'Dark, sad' },
  ],
  seventh: [
    { name: 'Major 7th', intervals: [0, 4, 7, 11], description: 'Dreamy, jazzy' },
    { name: 'Minor 7th', intervals: [0, 3, 7, 10], description: 'Mellow, smooth' },
    { name: 'Dominant 7th', intervals: [0, 4, 7, 10], description: 'Tense, wants to resolve' },
  ],
};

// Scale degree names
const SCALE_DEGREES = ['1', '2', '3', '4', '5', '6', '7'];

type ExerciseMode = 'chord-basic' | 'chord-seventh' | 'scale-degree';

const EarTrainingExercise: React.FC<EarTrainingExerciseProps> = ({ exercise }) => {
  const { score, questionNumber, isActive, recordAnswer, scorePercentage } = useExercise({
    exerciseId: exercise.id,
    totalQuestions: 10,
  });
  
  const [mode, setMode] = useState<ExerciseMode>('chord-basic');
  const [currentKey, setCurrentKey] = useState('C');
  const [correctAnswer, setCorrectAnswer] = useState<string>('');
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentChordNotes, setCurrentChordNotes] = useState<string[]>([]);
  const [currentScaleNote, setCurrentScaleNote] = useState<string>('');

  // Keep a ref to handleAnswer so keyboard handler always uses latest version
  const handleAnswerRef = useRef<(answer: string) => void>(() => {});

  // Keyboard shortcut handler for answer selection (1, 2, 3, 4, etc. keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive || selectedAnswer !== null) return;

      const keyMap: { [key: string]: number } = {
        '1': 0,
        '2': 1,
        '3': 2,
        '4': 3,
        '5': 4,
        '6': 5,
        '7': 6,
      };

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

  // Determine mode based on exercise
  useEffect(() => {
    if (exercise.id.includes('ear-1')) setMode('chord-basic');
    else if (exercise.id.includes('ear-2')) setMode('chord-seventh');
    else if (exercise.id.includes('ear-3')) setMode('scale-degree');
  }, [exercise.id]);

  const generateChordNotes = useCallback((rootNote: string, intervals: number[]): string[] => {
    const rootName = rootNote.replace(/\d/, '');
    // Use sharps array for MIDI math; find index via both arrays
    let rootIndex = KEYS_SHARP.indexOf(rootName);
    if (rootIndex === -1) rootIndex = KEYS.indexOf(rootName);
    const octave = 3;

    return intervals.map((interval) => {
      const noteIndex = (rootIndex + interval) % 12;
      const noteOctave = octave + Math.floor((rootIndex + interval) / 12);
      return `${KEYS_SHARP[noteIndex]}${noteOctave}`;
    });
  }, []);

  const generateQuestion = useCallback(async () => {
    await initAudio();
    stopAllNotes();

    // Pick a random key
    const key = KEYS[Math.floor(Math.random() * KEYS.length)];
    setCurrentKey(key);
    
    if (mode === 'chord-basic') {
      const qualities = CHORD_QUALITIES.basic;
      const quality = qualities[Math.floor(Math.random() * qualities.length)];
      const notes = generateChordNotes(key, quality.intervals);
      
      setCorrectAnswer(quality.name);
      setOptions(qualities.map(q => q.name).sort(() => Math.random() - 0.5));
      setCurrentChordNotes(notes);
      
      // Play the chord
      setTimeout(() => playChord(notes, { duration: 2, velocity: 0.6 }), 300);
      
    } else if (mode === 'chord-seventh') {
      const qualities = CHORD_QUALITIES.seventh;
      const quality = qualities[Math.floor(Math.random() * qualities.length)];
      const notes = generateChordNotes(key, quality.intervals);
      
      setCorrectAnswer(quality.name);
      setOptions(qualities.map(q => q.name).sort(() => Math.random() - 0.5));
      setCurrentChordNotes(notes);
      
      setTimeout(() => playChord(notes, { duration: 2, velocity: 0.6 }), 300);
      
    } else if (mode === 'scale-degree') {
      // First establish the key with a I chord
      const tonicChord = generateChordNotes(key, [0, 4, 7]);
      
      // Pick a random scale degree
      const degreeIndex = Math.floor(Math.random() * 7);
      const degree = SCALE_DEGREES[degreeIndex];
      
      // Major scale intervals
      const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11];
      const noteInterval = majorScaleIntervals[degreeIndex];
      let keyIdx = KEYS_SHARP.indexOf(key);
      if (keyIdx === -1) keyIdx = KEYS.indexOf(key);
      const noteIndex = (keyIdx + noteInterval) % 12;
      const note = `${KEYS_SHARP[noteIndex]}4`;
      
      setCorrectAnswer(degree);
      setOptions([...SCALE_DEGREES].sort(() => Math.random() - 0.5));
      setCurrentChordNotes(tonicChord);
      setCurrentScaleNote(note);
      
      // Play tonic chord, then the note
      setTimeout(() => {
        playChord(tonicChord, { duration: 1.5, velocity: 0.5 });
        setTimeout(() => playNote(note, { duration: 1.5, velocity: 0.7 }), 1800);
      }, 300);
    }
    
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowFeedback(false);
  }, [mode, generateChordNotes]);

  useEffect(() => {
    if (isActive) {
      generateQuestion();
    }
  }, [isActive, generateQuestion]);

  const handlePlayAgain = async () => {
    await initAudio();
    
    if (mode === 'scale-degree') {
      playChord(currentChordNotes, { duration: 1.5, velocity: 0.5 });
      setTimeout(() => playNote(currentScaleNote, { duration: 1.5, velocity: 0.7 }), 1800);
    } else {
      playChord(currentChordNotes, { duration: 2, velocity: 0.6 });
    }
  };

  const handleAnswer = useCallback((answer: string) => {
    if (selectedAnswer !== null || !isActive) return;

    setSelectedAnswer(answer);
    const correct = answer === correctAnswer;
    setIsCorrect(correct);
    setShowFeedback(true);

    // Record answer using the hook (handles scoring, completion, and progress tracking)
    recordAnswer(correct);

    // Play again to reinforce
    handlePlayAgain();

    // Move to next question after delay (hook handles completion check)
    setTimeout(() => {
      if (score.total + 1 < 10) {
        generateQuestion();
      }
    }, 2500);
  }, [selectedAnswer, isActive, correctAnswer, score.total, recordAnswer, handlePlayAgain, generateQuestion]);

  // Keep ref in sync with latest handleAnswer
  handleAnswerRef.current = handleAnswer;

  const getQuestionText = () => {
    switch (mode) {
      case 'chord-basic':
        return 'Is this chord Major or Minor?';
      case 'chord-seventh':
        return 'What type of 7th chord is this?';
      case 'scale-degree':
        return `In the key of ${currentKey}, what scale degree is this note?`;
      default:
        return 'Listen and identify:';
    }
  };

  const getHint = () => {
    if (mode === 'chord-basic') {
      return CHORD_QUALITIES.basic.find(q => q.name === correctAnswer)?.description;
    } else if (mode === 'chord-seventh') {
      return CHORD_QUALITIES.seventh.find(q => q.name === correctAnswer)?.description;
    }
    return null;
  };

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

      {/* Visual Indicator */}
      <div 
        className="p-8 rounded-lg text-center"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <div className="text-6xl mb-4">🎧</div>
        <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
          {getQuestionText()}
        </p>
        <button
          onClick={handlePlayAgain}
          className="btn-secondary mt-4 flex items-center gap-2 mx-auto"
          disabled={selectedAnswer !== null}
        >
          🔊 Play Again
        </button>
      </div>

      {/* Answer Options */}
      <div 
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto"
        role="group"
        aria-label={`Answer options. Press number keys 1 through ${options.length} to select an answer`}
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
        <span className="sr-only">Use number keys 1 through {options.length} to select answers</span>
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
          {getHint() && (
            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
              Hint: {getHint()}
            </p>
          )}
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
          {mode === 'chord-basic' && (
            <>
              <p><strong>Major:</strong> Bright, happy, resolved</p>
              <p><strong>Minor:</strong> Dark, sad, introspective</p>
            </>
          )}
          {mode === 'chord-seventh' && (
            <>
              <p><strong>Major 7th:</strong> Dreamy, sophisticated</p>
              <p><strong>Minor 7th:</strong> Mellow, smooth</p>
              <p><strong>Dominant 7th:</strong> Tense, bluesy</p>
            </>
          )}
          {mode === 'scale-degree' && (
            <>
              <p><strong>1 (Do):</strong> Home, stable</p>
              <p><strong>5 (Sol):</strong> Strong, supportive</p>
              <p><strong>7 (Ti):</strong> Leading tone, wants to resolve to 1</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EarTrainingExercise;
