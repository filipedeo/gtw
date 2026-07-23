import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Exercise } from '../types/exercise';
import { Card, Button, Select, Chip } from './ui';
import ChordDiagram from './ChordDiagram';
import {
  CHORDS,
  ChordCategory,
  DRILL_SECONDS,
  changesPerMinute,
  formatCpm,
  getChordById,
  loadPersonalBest,
  pairLabel,
  savePersonalBest,
} from '../lib/chordLibrary';

interface ChordLibraryExerciseProps {
  exercise: Exercise;
}

type Tab = 'dictionary' | 'trainer';

const CATEGORIES: { id: ChordCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'major', label: 'Major' },
  { id: 'minor', label: 'Minor' },
  { id: 'dominant-7', label: 'Dominant 7' },
  { id: 'maj7', label: 'Maj 7' },
  { id: 'min7', label: 'Min 7' },
  { id: 'barre', label: 'Barre' },
];

const ChordLibraryExercise: React.FC<ChordLibraryExerciseProps> = ({ exercise }) => {
  // Default tab from exercise id: trainer entry opens the trainer tab.
  const initialTab: Tab = exercise.id === 'chord-library-2' ? 'trainer' : 'dictionary';
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="space-y-6">
      {/* Tab switch */}
      <div className="flex gap-2">
        <Chip selected={tab === 'dictionary'} onClick={() => setTab('dictionary')}>
          Dictionary
        </Chip>
        <Chip selected={tab === 'trainer'} onClick={() => setTab('trainer')}>
          Change Trainer
        </Chip>
      </div>

      {tab === 'dictionary' ? <Dictionary /> : <ChangeTrainer />}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Dictionary tab
// ---------------------------------------------------------------------------

const Dictionary: React.FC = () => {
  const [filter, setFilter] = useState<ChordCategory | 'all'>('all');

  const shown = useMemo(
    () => (filter === 'all' ? CHORDS : CHORDS.filter((c) => c.category === filter)),
    [filter]
  );

  return (
    <div className="space-y-5">
      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat.id}
            selected={filter === cat.id}
            onClick={() => setFilter(cat.id)}
          >
            {cat.label}
          </Chip>
        ))}
      </div>

      {/* Chord grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {shown.map((chord) => (
          <Card
            key={chord.id}
            elevation={1}
            flush
            className="flex flex-col items-center pt-3 pb-2"
          >
            <ChordDiagram chord={chord} width={140} />
          </Card>
        ))}
      </div>

      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
        {shown.length} chord{shown.length === 1 ? '' : 's'}. Finger numbers shown inside each dot;{' '}
        <span aria-hidden="true">x</span> = muted, <span aria-hidden="true">o</span> = open string.
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// One-minute change trainer
// ---------------------------------------------------------------------------

type Phase = 'idle' | 'running' | 'done';

const ChangeTrainer: React.FC = () => {
  const [chordAId, setChordAId] = useState<string>('G');
  const [chordBId, setChordBId] = useState<string>('C');
  const [phase, setPhase] = useState<Phase>('idle');
  const [changes, setChanges] = useState(0);
  const [elapsed, setElapsed] = useState(0); // seconds, live
  const [lastCpm, setLastCpm] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [best, setBest] = useState(() => loadPersonalBest(chordAId, chordBId));

  const startedAtRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;

  const chordA = useMemo(() => getChordById(chordAId), [chordAId]);
  const chordB = useMemo(() => getChordById(chordBId), [chordBId]);

  // Refresh personal best when the pair changes (and not mid-drill).
  useEffect(() => {
    if (phase === 'idle') setBest(loadPersonalBest(chordAId, chordBId));
  }, [chordAId, chordBId, phase]);

  const tick = useCallback(() => {
    if (phaseRef.current !== 'running') return;
    const sec = (Date.now() - startedAtRef.current) / 1000;
    setElapsed(sec);
    if (sec >= DRILL_SECONDS) {
      finishDrill();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const finishDrill = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setPhase('done');
    setElapsed(DRILL_SECONDS);
    setChanges((finalCount) => {
      const cpm = changesPerMinute(finalCount, DRILL_SECONDS);
      setLastCpm(cpm);
      const saved = savePersonalBest(chordAId, chordBId, finalCount, cpm);
      setIsNewBest(saved);
      setBest(loadPersonalBest(chordAId, chordBId));
      return finalCount;
    });
  }, [chordAId, chordBId]);

  const startDrill = useCallback(() => {
    setChanges(0);
    setElapsed(0);
    setLastCpm(null);
    setIsNewBest(false);
    setPhase('running');
    startedAtRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const resetDrill = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setPhase('idle');
    setChanges(0);
    setElapsed(0);
    setLastCpm(null);
    setIsNewBest(false);
  }, []);

  const recordChange = useCallback(() => {
    if (phaseRef.current !== 'running') return;
    setChanges((c) => c + 1);
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Spacebar = record a change while running; also starts when idle.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      if (phaseRef.current === 'running') {
        recordChange();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [recordChange]);

  const liveCpm = phase === 'running' ? changesPerMinute(changes, Math.max(1, elapsed)) : lastCpm ?? 0;
  const secondsLeft = Math.max(0, DRILL_SECONDS - elapsed);

  return (
    <div className="space-y-6">
      {/* Chord pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--fg-muted)' }} htmlFor="chord-a">
            Chord A
          </label>
          <Select
            id="chord-a"
            value={chordAId}
            onChange={(e) => setChordAId(e.target.value)}
            disabled={phase === 'running'}
          >
            {CHORDS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--fg-muted)' }} htmlFor="chord-b">
            Chord B
          </label>
          <Select
            id="chord-b"
            value={chordBId}
            onChange={(e) => setChordBId(e.target.value)}
            disabled={phase === 'running'}
          >
            {CHORDS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Two diagrams side by side */}
      <Card elevation={1} flush className="flex items-center justify-around gap-4 py-6">
        <ChordDiagram chord={chordA} width={160} highlight />
        <div className="text-2xl font-semibold" style={{ color: 'var(--fg-subtle)' }} aria-hidden="true">
          ↔
        </div>
        <ChordDiagram chord={chordB} width={160} highlight />
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <Card elevation={0} flush className="py-3">
          <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
            Changes
          </div>
          <div className="text-3xl font-bold" style={{ color: 'var(--fg-strong)' }}>
            {changes}
          </div>
        </Card>
        <Card elevation={0} flush className="py-3">
          <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
            CPM
          </div>
          <div className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>
            {formatCpm(liveCpm)}
          </div>
        </Card>
        <Card elevation={0} flush className="py-3">
          <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
            Time
          </div>
          <div className="text-3xl font-bold" style={{ color: 'var(--fg-strong)' }}>
            {phase === 'running' ? secondsLeft.toFixed(0) : phase === 'done' ? 0 : DRILL_SECONDS}
            <span className="text-sm font-normal" style={{ color: 'var(--fg-muted)' }}>s</span>
          </div>
        </Card>
      </div>

      {/* Personal best for this pair */}
      <div
        className="text-sm text-center py-2 rounded-[var(--rad-md)]"
        style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--fg-muted)' }}
      >
        {best ? (
          <>
            Best for <strong style={{ color: 'var(--fg-strong)' }}>{pairLabel(chordAId, chordBId)}</strong>:{' '}
            <strong style={{ color: 'var(--accent)' }}>{best.changes}</strong> changes (
            {formatCpm(best.cpm)} CPM)
          </>
        ) : (
          <>No personal best yet for {pairLabel(chordAId, chordBId)}.</>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-3">
        {phase === 'idle' && (
          <Button size="md" onClick={startDrill} className="min-h-[var(--target-min)] px-8 text-base">
            Start 60s Drill
          </Button>
        )}
        {phase === 'running' && (
          <>
            <Button
              size="md"
              onClick={recordChange}
              className="min-h-[64px] px-10 text-lg w-full sm:w-auto"
            >
              Changed! (tap or Space)
            </Button>
            <Button variant="ghost" size="sm" onClick={resetDrill}>
              Stop early
            </Button>
          </>
        )}
        {phase === 'done' && (
          <>
            <div className="text-center">
              <div className="text-lg font-semibold" style={{ color: 'var(--fg-strong)' }}>
                {changes} changes in 60s
              </div>
              <div className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                {formatCpm(lastCpm ?? 0)} changes per minute
              </div>
              {isNewBest && (
                <div className="mt-1 font-medium" style={{ color: 'var(--success)' }}>
                  New personal best!
                </div>
              )}
            </div>
            <Button size="md" onClick={startDrill} className="px-8">
              Try Again
            </Button>
          </>
        )}
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--fg-muted)' }}>
        Tip: press <kbd>Space</kbd> each time you cleanly switch between the two chords. Your best is
        saved per pair and persists across reloads.
      </p>
    </div>
  );
};


export default ChordLibraryExercise;
