import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Exercise } from '../types/exercise';
import { useExercise } from '../hooks/useExercise';
import { startMetronome, stopMetronome, initAudio, playNote, onMetronomeBeat } from '../lib/audioEngine';
import { clampBpm } from '../utils/metronome';
import { Card, Button, Chip } from './ui';
import { PlayIcon, ResetIcon, TargetIcon } from './icons';
import {
  RhythmPattern,
  NOTE_BEATS,
  NOTE_LABELS,
  DEFAULT_BPM_BY_DIFFICULTY,
  expectedOnsetTimes,
  gradeTaps,
  getPattern,
  barDurationSeconds,
  GradeResult,
} from '../lib/rhythm';

interface RhythmExerciseProps {
  exercise: Exercise;
}

type Phase = 'idle' | 'count-in' | 'playing' | 'listening' | 'count-in-2' | 'tapping' | 'result';
type Mode = 'reading' | 'tap-back';

const TOTAL_ROUNDS = 5;
const PASS_THRESHOLD = 70; // % accuracy to count as "correct"

const PHASE_LABELS: Record<Phase, string> = {
  'idle': 'Press Start to begin',
  'count-in': 'Count in — get ready',
  'playing': 'Play along! Tap on each note',
  'listening': 'Listen to the rhythm',
  'count-in-2': 'Get ready to tap it back',
  'tapping': 'Tap it back!',
  'result': 'Round complete',
};

const RhythmExercise: React.FC<RhythmExerciseProps> = ({ exercise }) => {
  const { score, questionNumber, isComplete, recordAnswer, scorePercentage, resetExercise } = useExercise({
    exerciseId: exercise.id,
    exerciseType: exercise.type,
    totalQuestions: TOTAL_ROUNDS,
  });

  // --- UI state ---
  const [phase, setPhase] = useState<Phase>('idle');
  const [mode, setMode] = useState<Mode>('reading');
  const [bpm, setBpm] = useState(() => DEFAULT_BPM_BY_DIFFICULTY[exercise.difficulty] ?? 80);
  const [pattern, setPattern] = useState<RhythmPattern>(() => getPattern(exercise.difficulty, 0));
  const [activeNoteIndex, setActiveNoteIndex] = useState(-1);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [tapCount, setTapCount] = useState(0);
  const [tapFlash, setTapFlash] = useState(false);

  // --- Refs (timing-sensitive, avoid stale closures in beat listener) ---
  const isMountedRef = useRef(true);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const beatUnsubRef = useRef<(() => void) | null>(null);
  const startTimeRef = useRef(0);
  const beatsInPhaseRef = useRef(0);
  const phaseRef = useRef<Phase>('idle');
  const modeRef = useRef<Mode>('reading');
  const bpmRef = useRef(bpm);
  const patternRef = useRef(pattern);
  const tapTimesRef = useRef<number[]>([]);
  const roundCounterRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { patternRef.current = pattern; }, [pattern]);

  // --- Derived values ---
  const toleranceSec = useMemo(() => 0.2 * (60 / bpm), [bpm]);

  // --- Cleanup helpers ---
  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  }, []);

  const cleanup = useCallback(() => {
    clearAllTimeouts();
    beatUnsubRef.current?.();
    beatUnsubRef.current = null;
    stopMetronome();
    setActiveNoteIndex(-1);
    setCurrentBeat(-1);
  }, [clearAllTimeouts]);

  // Mount/unmount lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearAllTimeouts();
      beatUnsubRef.current?.();
      beatUnsubRef.current = null;
      stopMetronome();
    };
  }, [clearAllTimeouts]);

  // --- Phase transition logic (metronome-aligned) ---
  const transitionPhase = useCallback(() => {
    const p = phaseRef.current;
    const m = modeRef.current;
    const pat = patternRef.current;
    const currentBpm = bpmRef.current;

    if (p === 'count-in') {
      if (m === 'reading') {
        // Start play-along: user reads pattern and taps along
        phaseRef.current = 'playing';
        setPhase('playing');
        startTimeRef.current = performance.now();
        tapTimesRef.current = [];
        setTapCount(0);
        scheduleNoteHighlights(pat, currentBpm);
      } else {
        // Start listening: app plays the pattern
        phaseRef.current = 'listening';
        setPhase('listening');
        startTimeRef.current = performance.now();
        schedulePatternPlayback(pat, currentBpm);
      }
    } else if (p === 'listening') {
      // After listening, count in again before user taps
      phaseRef.current = 'count-in-2';
      setPhase('count-in-2');
      setActiveNoteIndex(-1);
      beatsInPhaseRef.current = 0;
    } else if (p === 'count-in-2') {
      // Start tapping phase
      phaseRef.current = 'tapping';
      setPhase('tapping');
      startTimeRef.current = performance.now();
      tapTimesRef.current = [];
      setTapCount(0);
    } else if (p === 'playing' || p === 'tapping') {
      finishRound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Schedule visual note highlights + audio playback ---
  function scheduleNoteHighlights(pat: RhythmPattern, currentBpm: number) {
    clearAllTimeouts();
    const onsets = expectedOnsetTimes(pat, currentBpm);
    for (let i = 0; i < onsets.length; i++) {
      const id = setTimeout(() => {
        if (isMountedRef.current && (phaseRef.current === 'playing' || phaseRef.current === 'listening')) {
          setActiveNoteIndex(i);
        }
      }, onsets[i] * 1000);
      timeoutsRef.current.push(id);
    }
    const barMs = barDurationSeconds(pat.beatsPerBar, currentBpm) * 1000;
    const endId = setTimeout(() => {
      if (isMountedRef.current) setActiveNoteIndex(-1);
    }, barMs);
    timeoutsRef.current.push(endId);
  }

  function schedulePatternPlayback(pat: RhythmPattern, currentBpm: number) {
    clearAllTimeouts();
    const onsets = expectedOnsetTimes(pat, currentBpm);
    for (let i = 0; i < onsets.length; i++) {
      const id = setTimeout(() => {
        if (isMountedRef.current && phaseRef.current === 'listening') {
          setActiveNoteIndex(i);
          playNote('E5', { duration: 0.08, velocity: 0.7 });
        }
      }, onsets[i] * 1000);
      timeoutsRef.current.push(id);
    }
    const barMs = barDurationSeconds(pat.beatsPerBar, currentBpm) * 1000;
    const endId = setTimeout(() => {
      if (isMountedRef.current) setActiveNoteIndex(-1);
    }, barMs);
    timeoutsRef.current.push(endId);
  }

  // --- Finish round: grade taps ---
  function finishRound() {
    const pat = patternRef.current;
    const currentBpm = bpmRef.current;
    const expected = expectedOnsetTimes(pat, currentBpm);
    const gradeResult = gradeTaps(expected, tapTimesRef.current, toleranceSec);

    phaseRef.current = 'result';
    setResult(gradeResult);
    setPhase('result');
    setActiveNoteIndex(-1);
    stopMetronome();
    beatUnsubRef.current?.();
    beatUnsubRef.current = null;
    clearAllTimeouts();

    recordAnswer(gradeResult.accuracy >= PASS_THRESHOLD);
  }

  // --- Beat listener (handles count-in and phase transitions) ---
  const handleBeat = useCallback((beat: number, _isAccent: boolean) => {
    if (!isMountedRef.current) return;
    const p = phaseRef.current;
    if (p === 'idle' || p === 'result') return;

    setCurrentBeat(beat);

    const beatsPerBar = patternRef.current.beatsPerBar;
    beatsInPhaseRef.current++;

    // After one full bar of count-in (or count-in-2), transition on the downbeat
    if (beat === 0 && beatsInPhaseRef.current > beatsPerBar) {
      beatsInPhaseRef.current = 1;
      transitionPhase();
    }
  }, [transitionPhase]);

  // --- Start a round ---
  const handleStart = useCallback(async () => {
    if (!isMountedRef.current) return;
    await initAudio();
    cleanup();

    const pat = getPattern(exercise.difficulty, roundCounterRef.current);
    roundCounterRef.current++;
    setPattern(pat);
    patternRef.current = pat;

    setResult(null);
    setTapCount(0);
    setActiveNoteIndex(-1);
    setCurrentBeat(-1);
    tapTimesRef.current = [];
    beatsInPhaseRef.current = 0;

    phaseRef.current = 'count-in';
    setPhase('count-in');

    beatUnsubRef.current = onMetronomeBeat(handleBeat);

    await startMetronome({
      bpm: bpmRef.current,
      timeSignature: [pat.beatsPerBar, 4],
      volume: 0.7,
      accentFirst: true,
      subdivision: 1,
    });
  }, [exercise.difficulty, cleanup, handleBeat]);

  // --- Tap handler ---
  const handleTap = useCallback(() => {
    const p = phaseRef.current;
    if (p !== 'playing' && p !== 'tapping') return;

    const tapTime = (performance.now() - startTimeRef.current) / 1000;
    tapTimesRef.current.push(tapTime);
    setTapCount(tapTimesRef.current.length);

    // Visual flash
    setTapFlash(true);
    const flashId = setTimeout(() => {
      if (isMountedRef.current) setTapFlash(false);
    }, 100);
    timeoutsRef.current.push(flashId);
  }, []);

  // --- Next round ---
  const handleNextRound = useCallback(() => {
    if (isComplete) return;
    handleStart();
  }, [isComplete, handleStart]);

  // --- Reset everything ---
  const handleReset = useCallback(() => {
    cleanup();
    roundCounterRef.current = 0;
    setResult(null);
    setTapCount(0);
    setActiveNoteIndex(-1);
    setCurrentBeat(-1);
    phaseRef.current = 'idle';
    setPhase('idle');
    resetExercise();
  }, [cleanup, resetExercise]);

  // --- Mode switch ---
  const handleModeChange = useCallback((newMode: Mode) => {
    if (newMode === mode) return;
    cleanup();
    setResult(null);
    setTapCount(0);
    setActiveNoteIndex(-1);
    setCurrentBeat(-1);
    phaseRef.current = 'idle';
    setPhase('idle');
    setMode(newMode);
  }, [mode, cleanup]);

  // --- BPM adjust ---
  const adjustBpm = useCallback((delta: number) => {
    setBpm((prev) => clampBpm(prev + delta));
  }, []);

  // --- Keyboard: Space to tap ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const p = phaseRef.current;
        if (p === 'playing' || p === 'tapping') {
          e.preventDefault();
          handleTap();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTap]);

  // --- Pattern visibility ---
  const showPattern = phase === 'idle' || phase === 'count-in' || phase === 'playing' ||
    phase === 'listening' || phase === 'count-in-2' || phase === 'result';
  const hidePatternDuringTapBack = mode === 'tap-back' && (phase === 'tapping' || phase === 'count-in-2');
  const patternVisible = showPattern && !hidePatternDuringTapBack;

  const canTap = phase === 'playing' || phase === 'tapping';
  const isRunning = phase !== 'idle' && phase !== 'result';

  return (
    <div className="space-y-5">
      {/* Score bar */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-fg-muted">
          Round {Math.min(questionNumber, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}
        </div>
        <div className="text-sm font-medium text-fg-strong">
          Score: {score.correct}/{score.total}
          {score.total > 0 && (
            <span className="ml-2 text-fg-subtle">({scorePercentage}%)</span>
          )}
        </div>
      </div>

      {/* Mode + BPM controls */}
      <Card elevation={1} flush className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-fg-subtle">Mode</span>
            <Chip selected={mode === 'reading'} onClick={() => handleModeChange('reading')}>
              Reading
            </Chip>
            <Chip selected={mode === 'tap-back'} onClick={() => handleModeChange('tap-back')}>
              Tap-Back
            </Chip>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-fg-subtle">BPM</span>
            <Button size="sm" variant="secondary" onClick={() => adjustBpm(-5)} disabled={isRunning}>
              −
            </Button>
            <span className="min-w-[3ch] text-center font-mono text-sm text-fg-strong">{bpm}</span>
            <Button size="sm" variant="secondary" onClick={() => adjustBpm(5)} disabled={isRunning}>
              +
            </Button>
          </div>
        </div>
      </Card>

      {/* Phase status */}
      <div className="text-center">
        <p className="text-lg font-medium text-fg-strong" aria-live="polite">
          {isComplete ? 'Exercise complete!' : PHASE_LABELS[phase]}
        </p>
        {(phase === 'count-in' || phase === 'count-in-2') && (
          <p className="text-sm text-fg-muted mt-1">
            Count-in: beat {Math.min(beatsInPhaseRef.current + 1, pattern.beatsPerBar)} / {pattern.beatsPerBar}
          </p>
        )}
      </div>

      {/* Beat indicator */}
      <div className="flex items-center justify-center gap-2" role="img" aria-label={`${pattern.beatsPerBar} beats per bar`}>
        {Array.from({ length: pattern.beatsPerBar }, (_, i) => (
          <span
            key={i}
            className="inline-block rounded-full transition-transform duration-75"
            style={{
              width: 12,
              height: 12,
              backgroundColor: currentBeat === i
                ? (i === 0 ? 'var(--accent-secondary)' : 'var(--accent)')
                : 'var(--line)',
              transform: currentBeat === i ? 'scale(1.4)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      {/* Pattern visualization */}
      {patternVisible ? (
        <PatternBar
          pattern={pattern}
          activeNoteIndex={activeNoteIndex}
          result={phase === 'result' ? result : null}
        />
      ) : (
        <div
          className="rounded-[var(--rad-lg)] border border-line bg-surface-sunken flex items-center justify-center"
          style={{ height: 80 }}
        >
          <p className="text-sm text-fg-muted">Tap the rhythm from memory</p>
        </div>
      )}

      {/* Tap button */}
      <div className="flex justify-center">
        <button
          onClick={handleTap}
          disabled={!canTap}
          aria-label="Tap"
          className="font-bold rounded-[var(--rad-full)] transition-all duration-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
          style={{
            width: 120,
            height: 120,
            fontSize: '1.25rem',
            backgroundColor: tapFlash ? 'var(--accent-active)' : canTap ? 'var(--accent)' : 'var(--surface-sunken)',
            color: canTap ? 'var(--on-accent)' : 'var(--fg-subtle)',
            border: '2px solid ' + (canTap ? 'var(--accent-hover)' : 'var(--line)'),
            transform: tapFlash ? 'scale(0.92)' : 'scale(1)',
            cursor: canTap ? 'pointer' : 'default',
          }}
        >
          TAP
        </button>
      </div>
      {canTap && (
        <p className="text-center text-xs text-fg-subtle">
          Press Space or click TAP on each note onset
          {tapCount > 0 && <span className="ml-2 text-fg-muted">— taps: {tapCount}</span>}
        </p>
      )}

      {/* Result display */}
      {phase === 'result' && result && (
        <Card elevation={1}>
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <TargetIcon size={24} style={{ color: 'var(--accent-secondary)' }} />
              <span className="text-4xl font-bold text-fg-strong">{result.accuracy}%</span>
            </div>
            <div className="flex justify-center gap-6 text-sm">
              <span className="text-fg-muted">
                Hits: <span className="font-bold text-fg-strong">{result.hits}</span>
              </span>
              <span className="text-fg-muted">
                Missed: <span className="font-bold text-fg-strong">{result.misses}</span>
              </span>
              <span className="text-fg-muted">
                Extra: <span className="font-bold text-fg-strong">{result.extra}</span>
              </span>
            </div>
            <p className="text-xs text-fg-subtle">
              {result.accuracy >= PASS_THRESHOLD
                ? 'Great timing! Round passed.'
                : 'Keep practicing — aim for tighter timing.'}
            </p>
            {!isComplete ? (
              <Button variant="primary" onClick={handleNextRound} className="mt-2">
                <PlayIcon size={16} /> Next Round
              </Button>
            ) : (
              <div className="space-y-2 pt-2">
                <p className="text-sm font-medium text-fg-strong">
                  Final: {score.correct}/{score.total} ({scorePercentage}%)
                </p>
                <Button variant="secondary" onClick={handleReset}>
                  <ResetIcon size={16} /> Restart Exercise
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Start / Reset controls */}
      {phase === 'idle' && !isComplete && (
        <div className="flex justify-center">
          <Button variant="primary" size="md" onClick={handleStart}>
            <PlayIcon size={18} /> Start
          </Button>
        </div>
      )}
      {isRunning && (
        <div className="flex justify-center">
          <Button variant="danger" size="sm" onClick={handleReset}>
            Stop
          </Button>
        </div>
      )}

      {/* Instructions */}
      {phase === 'idle' && (
        <Card elevation={0} flush className="p-4">
          <h4 className="text-sm font-medium text-fg-strong mb-2">How it works</h4>
          <ul className="text-xs text-fg-muted space-y-1 list-disc list-inside">
            {mode === 'reading' ? (
              <>
                <li>Read the rhythm pattern shown as note blocks</li>
                <li>A one-bar count-in plays, then the metronome continues</li>
                <li>Tap Space or the TAP button on each note onset</li>
                <li>Your timing is graded against the expected onset times</li>
              </>
            ) : (
              <>
                <li>Listen to the rhythm played by the app</li>
                <li>After a count-in, tap the rhythm back from memory</li>
                <li>Tap Space or the TAP button on each note onset</li>
                <li>Your timing is graded against the expected onset times</li>
              </>
            )}
            <li>Each round uses a different pattern at {bpm} BPM</li>
          </ul>
        </Card>
      )}
    </div>
  );
};

// --- Pattern visualization sub-component ---

interface PatternBarProps {
  pattern: RhythmPattern;
  activeNoteIndex: number;
  result: GradeResult | null;
}

const PatternBar: React.FC<PatternBarProps> = ({ pattern, activeNoteIndex, result }) => {
  return (
    <div
      className="flex gap-1 rounded-[var(--rad-lg)] border border-line bg-surface-sunken p-2"
      style={{ height: 80 }}
      role="img"
      aria-label={`Rhythm pattern: ${pattern.notes.map((n) => NOTE_LABELS[n]).join(', ')}`}
    >
      {pattern.notes.map((note, i) => {
        const beats = NOTE_BEATS[note];
        const isActive = i === activeNoteIndex;
        const isHit = result?.matchedTapIndices[i] !== undefined && result.matchedTapIndices[i] >= 0;
        const isMiss = result?.matchedTapIndices[i] === -1;

        return (
          <div
            key={i}
            className="flex flex-col items-center justify-center rounded-[var(--rad-md)] transition-colors duration-75"
            style={{
              flexGrow: beats,
              flexBasis: 0,
              minWidth: 28,
              backgroundColor: isActive
                ? 'var(--accent)'
                : isHit
                  ? 'rgba(5, 150, 105, 0.2)'
                  : isMiss
                    ? 'rgba(220, 38, 38, 0.15)'
                    : 'var(--surface)',
              border: `1px solid ${isActive ? 'var(--accent-hover)' : isMiss ? 'var(--danger)' : 'var(--line)'}`,
              color: isActive ? 'var(--on-accent)' : 'var(--fg-muted)',
            }}
          >
            <span className="text-[10px] font-medium leading-tight text-center px-1">
              {NOTE_LABELS[note]}
            </span>
            {result && (
              <span
                className="text-sm font-bold mt-0.5"
                style={{ color: isHit ? 'var(--success)' : isMiss ? 'var(--danger)' : 'var(--fg-subtle)' }}
              >
                {isHit ? '✓' : isMiss ? '✗' : ''}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RhythmExercise;
