import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Exercise } from '../types/exercise';
import { FretPosition, NOTE_NAMES, normalizeNoteName, areNotesEqual } from '../types/guitar';
import { useGuitarStore } from '../stores/guitarStore';
import { useExercise } from '../hooks/useExercise';
import { usePlayAlong } from '../hooks/usePlayAlong';
import { getNoteAtPosition, getRandomPosition } from '../utils/fretboardCalculations';
import { playNote, initAudio, stopAllNotes } from '../lib/audioEngine';
import { matchesTarget } from '../lib/playAlong';
import Fretboard from './Fretboard';
import { SegmentedControl } from './ui';
import { VolumeIcon, CheckIcon, XIcon, MicIcon } from './icons';

interface NoteIdentificationExerciseProps {
  exercise: Exercise;
}

const NoteIdentificationExercise: React.FC<NoteIdentificationExerciseProps> = ({ exercise }) => {
  const { stringCount, tuning, setHighlightedPositions, setSecondaryHighlightedPositions, setMaskedPositions, setRootNote, clearHighlights } = useGuitarStore();
  const { score, questionNumber, isActive, recordAnswer, scorePercentage } = useExercise({
    exerciseId: exercise.id,
    exerciseType: exercise.type,
    totalQuestions: 10,
  });
  
  const [currentPosition, setCurrentPosition] = useState<FretPosition | null>(null);
  const [correctNote, setCorrectNote] = useState<string>('');
  const [fullNote, setFullNote] = useState<string>('');
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [revealedPositions, setRevealedPositions] = useState<FretPosition[]>([]);

  // "Play it (mic)" play-along mode: listen to the user's guitar and accept a
  // sustained in-tune match of the hidden target note as the correct answer,
  // routed through the same handleAnswer flow as a button pick.
  const [micMode, setMicMode] = useState<'off' | 'on'>('off');
  const { listening, error: micError, latest, start: startMic, stop: stopMic } = usePlayAlong();
  // Count consecutive matching pitch frames; >=3 sustained frames => a hit.
  const matchStreakRef = useRef(0);

  // Keep a ref to handleAnswer so keyboard handler always uses latest version
  const handleAnswerRef = useRef<(answer: string) => void>(() => {});

  // Track mount state and every pending setTimeout so we can cancel scheduled
  // audio / next-question timers on unmount (prevents notes ringing after
  // navigation and store mutations after the component is gone).
  const isMountedRef = useRef(true);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Keyboard shortcut handler for answer selection (1, 2, 3, 4 keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive || selectedAnswer !== null) return;

      const keyMap: { [key: string]: number } = {
        '1': 0,
        '2': 1,
        '3': 2,
        '4': 3,
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

  // Determine max fret based on difficulty
  const maxFret = exercise.difficulty <= 1 ? 5 : exercise.difficulty <= 2 ? 12 : 22;

  const generateQuestion = useCallback(async () => {
    // Ensure audio is ready
    await initAudio();
    // Bail if the component unmounted during async init — avoids mutating the
    // guitar store (highlights/root note) and scheduling audio after navigation.
    if (!isMountedRef.current) return;
    stopAllNotes();

    // Cancel any audio still scheduled from a previous question so rapid
    // re-generation doesn't stack overlapping notes.
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
    
    // Generate random position
    const position = getRandomPosition(stringCount, maxFret, 0);
    const note = getNoteAtPosition(position, tuning, stringCount);
    const rawNoteName = note.replace(/\d/, ''); // Remove octave number
    
    // Normalize the note name to use sharps (handles enharmonic equivalents)
    const noteName = normalizeNoteName(rawNoteName);
    
    // Generate options (correct + 3 wrong)
    // Use areNotesEqual to properly filter out enharmonic equivalents
    const wrongOptions = NOTE_NAMES
      .filter(n => !areNotesEqual(n, noteName))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    const allOptions = [noteName, ...wrongOptions].sort(() => Math.random() - 0.5);
    
    setCurrentPosition(position);
    setCorrectNote(noteName);
    setFullNote(note);
    setOptions(allOptions);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowFeedback(false);
    setRevealedPositions([]); // Hide note name until answered
    
    // Highlight the position on fretboard
    setHighlightedPositions([position]);
    // A single target only — clear any stale secondary dots left by a previous
    // scale/arpeggio exercise so exactly one dot is highlighted on every viewport.
    setSecondaryHighlightedPositions([]);
    // Mask this target's note name on EVERY fretboard (incl. the persistent top
    // board that doesn't pass hideNoteNames) so the answer isn't leaked.
    setMaskedPositions([position]);
    setRootNote(null);
    
    // Play the note so user can hear it
    const playTimer = setTimeout(() => {
      playNote(note, { duration: 1.5, velocity: 0.7 });
    }, 300);
    timeoutsRef.current.push(playTimer);
    
  }, [stringCount, tuning, maxFret, setHighlightedPositions, setSecondaryHighlightedPositions, setMaskedPositions, setRootNote]);

  // Keep a stable ref so tuning/stringCount changes don't auto-trigger audio
  const generateQuestionRef = useRef(generateQuestion);
  generateQuestionRef.current = generateQuestion;

  // Generate first question when exercise starts (only on isActive transition)
  useEffect(() => {
    if (isActive) {
      generateQuestionRef.current();
    } else {
      clearHighlights();
      setRevealedPositions([]);
    }

    return () => {
      clearHighlights();
      setRevealedPositions([]);
    };
  }, [isActive, clearHighlights]);

  // Cancel pending timers and silence audio on unmount so notes don't ring
  // after navigation and next-question timers can't re-schedule audio.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      timeoutsRef.current.forEach(t => clearTimeout(t));
      timeoutsRef.current = [];
      stopAllNotes();
    };
  }, []);

  const handlePlayAgain = () => {
    if (fullNote) {
      playNote(fullNote, { duration: 1.5, velocity: 0.7 });
    }
  };

  const handleAnswer = useCallback((answer: string) => {
    if (selectedAnswer !== null || !isActive || !currentPosition) return;

    setSelectedAnswer(answer);
    // Use enharmonic-aware comparison
    const correct = areNotesEqual(answer, correctNote);
    setIsCorrect(correct);
    setShowFeedback(true);
    
    // Reveal the note on the fretboard
    setRevealedPositions([currentPosition]);
    // Unmask on the shared boards so the persistent top board reveals it too.
    setMaskedPositions([]);
    
    // Record answer using the hook (handles scoring, completion, and progress tracking)
    recordAnswer(correct);
    
    // Play the note again to reinforce
    playNote(fullNote, { duration: 1, velocity: 0.6 });
    
    // Move to next question after delay (hook handles completion check)
    const nextTimer = setTimeout(() => {
      if (score.total + 1 < 10) {
        generateQuestion();
      }
    }, 2000);
    timeoutsRef.current.push(nextTimer);
  }, [selectedAnswer, isActive, currentPosition, correctNote, fullNote, score.total, recordAnswer, generateQuestion, setMaskedPositions]);

  // Keep ref in sync with latest handleAnswer
  handleAnswerRef.current = handleAnswer;

  // Open / close the mic when the play-along toggle flips. The hook releases
  // the AudioContext on unmount, so we only react to the user's intent here.
  useEffect(() => {
    if (micMode === 'on') {
      startMic();
    } else {
      stopMic();
    }
  }, [micMode, startMic, stopMic]);

  // Treat a sustained, in-tune match of the hidden target note as a correct
  // pick. Each new pitch frame re-runs this effect; we count consecutive
  // matches and route a hit through the existing handleAnswer flow once three
  // frames in a row agree (~150 ms sustained at the autocorrelation cadence).
  useEffect(() => {
    if (micMode !== 'on' || selectedAnswer !== null || !isActive || !correctNote) {
      matchStreakRef.current = 0;
      return;
    }

    if (matchesTarget(latest, correctNote)) {
      matchStreakRef.current += 1;
      if (matchStreakRef.current >= 3) {
        matchStreakRef.current = 0;
        handleAnswerRef.current(correctNote);
      }
    } else {
      matchStreakRef.current = 0;
    }
  }, [latest, micMode, selectedAnswer, isActive, correctNote]);

  // Mic play-along is only "live" when toggled on and the mic opened cleanly;
  // a denied mic falls back to the unchanged multiple-choice flow.
  const micActive = micMode === 'on' && !micError;

  return (
    <div className="space-y-6">
      {/* Score Display */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-fg tabular-nums">
          Question {questionNumber} of 10
        </div>
        <div className="text-sm font-medium text-fg-strong tabular-nums">
          Score: {score.correct}/{score.total}
          {score.total > 0 && (
            <span className="ml-2 text-fg-muted" >
              ({scorePercentage}%)
            </span>
          )}
        </div>
      </div>

      {/* Embedded Fretboard for this exercise */}
      <div className="card p-4">
        <Fretboard 
          interactive={false}
          hideNoteNames={true}
          revealedPositions={revealedPositions}
        />
      </div>

      {/* Question */}
      <div className="text-center">
        <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          What note is highlighted on the fretboard?
        </p>
        <div className="flex items-center justify-center gap-4">
          {currentPosition && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              String {stringCount - currentPosition.string}, Fret {currentPosition.fret}
            </p>
          )}
          <button
            onClick={handlePlayAgain}
            className="btn-secondary text-sm flex items-center gap-1"
            disabled={selectedAnswer !== null}
          >
            <VolumeIcon size={16} /> Play Again
          </button>
        </div>
      </div>

      {/* Play it (mic) — play-along toggle */}
      <div className="flex justify-center">
        <SegmentedControl
          ariaLabel="Answer mode"
          value={micMode}
          onChange={(v) => setMicMode(v)}
          options={[
            { value: 'off', label: 'Choose' },
            { value: 'on', label: <span className="inline-flex items-center gap-1.5"><MicIcon size={16} /> Play it (mic)</span> },
          ]}
        />
      </div>

      {micError && (
        <p className="text-center text-sm text-danger" role="alert">
          {micError} Staying in multiple-choice mode.
        </p>
      )}

      {micActive && (
        <div className="card p-4 text-center">
          <p className="text-sm font-medium flex items-center justify-center gap-2 text-fg-strong">
            <MicIcon size={18} />
            {listening ? 'Listening — play the highlighted note on your guitar' : 'Starting microphone…'}
          </p>
          {latest && (
            <p className="text-xs mt-1 tabular-nums text-fg-muted">
              Hearing {latest.noteName} ({latest.cents > 0 ? '+' : ''}{latest.cents}¢)
            </p>
          )}
        </div>
      )}

      {!micActive && (<>
      {/* Answer Options */}
      <div 
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto"
        role="group"
        aria-label="Answer options. Press 1, 2, 3, or 4 to select an answer"
      >
        {options.map((option, index) => {
          let buttonStyle: React.CSSProperties = {
            padding: '1rem 1.5rem',
            borderRadius: '0.5rem',
            fontWeight: 'bold',
            fontSize: '1.125rem',
            transition: 'all 0.2s',
            border: 'none',
            cursor: selectedAnswer === null ? 'pointer' : 'default',
          };
          
          if (selectedAnswer === null) {
            buttonStyle.backgroundColor = 'var(--bg-tertiary)';
            buttonStyle.color = 'var(--text-primary)';
          } else if (option === correctNote) {
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
        <span aria-hidden="true">Tip: Press 1, 2, 3, or 4 to quickly select an answer</span>
        <span className="sr-only">Use number keys 1 through 4 to select answers</span>
      </p>
      </>)}

      {/* Feedback */}
      {showFeedback && (
        <div 
          className={`text-center p-4 rounded-lg animate-fade-in ${isCorrect ? 'bg-success-bg' : 'bg-danger-bg'}`}
          role="alert"
          aria-live="assertive"
        >
          <p
            className={`font-medium text-lg flex items-center gap-2 ${isCorrect ? 'text-success' : 'text-danger'}`}
          >
            <span aria-hidden="true">{isCorrect ? <CheckIcon size={20} /> : <XIcon size={20} />}</span>
            {isCorrect ? ' Correct!' : ` Incorrect. The answer was ${correctNote}`}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {fullNote} - String {currentPosition ? stringCount - currentPosition.string : ''}, Fret {currentPosition?.fret}
          </p>
        </div>
      )}
    </div>
  );
};

export default NoteIdentificationExercise;