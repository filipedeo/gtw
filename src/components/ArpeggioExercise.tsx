import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Exercise } from '../types/exercise';
import { FretPosition, Tuning, normalizeNoteName } from '../types/guitar';
import { useGuitarStore } from '../stores/guitarStore';
import { useAudioStore } from '../stores/audioStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { getScalePositions, getPositionsForNote } from '../utils/fretboardCalculations';
import { getChordNotes } from '../lib/theoryEngine';
import { startDrone, stopDrone, playNote, initAudio } from '../lib/audioEngine';
import Fretboard from './Fretboard';
import DisplayModeToggle from './DisplayModeToggle';
import PracticeRating from './PracticeRating';

interface ArpeggioExerciseProps {
  exercise: Exercise;
}

type ChordQuality = 'maj7' | 'min7' | 'dom7' | 'min7b5' | 'dim7' | 'aug';

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const QUALITY_OPTIONS: { value: ChordQuality; label: string; symbol: string }[] = [
  { value: 'maj7', label: 'Major 7', symbol: 'maj7' },
  { value: 'min7', label: 'Minor 7', symbol: 'm7' },
  { value: 'dom7', label: 'Dominant 7', symbol: '7' },
  { value: 'min7b5', label: 'Half-Diminished', symbol: 'm7b5' },
  { value: 'dim7', label: 'Diminished 7', symbol: 'dim7' },
  { value: 'aug', label: 'Augmented', symbol: 'aug' },
];

const EXERCISE_QUALITY_MAP: Record<string, ChordQuality> = {
  'bass-arp-1': 'maj7',
  'bass-arp-2': 'min7',
  'bass-arp-3': 'dom7',
  'bass-arp-4': 'min7',
  'guitar-arp-1': 'maj7',
  'guitar-arp-2': 'min7',
  'guitar-arp-3': 'dom7',
  'guitar-arp-4': 'dim7',
  'guitar-arp-5': 'aug',
  'guitar-arp-6': 'min7b5',
};

/** Map our quality labels to Tonal chord symbols */
function getChordSymbol(quality: ChordQuality): string {
  switch (quality) {
    case 'maj7': return 'maj7';
    case 'min7': return 'm7';
    case 'dom7': return '7';
    case 'min7b5': return 'm7b5';
    case 'dim7': return 'dim7';
    case 'aug': return 'aug';
  }
}

/** Human-readable chord tone labels */
function getChordToneLabels(quality: ChordQuality): string[] {
  switch (quality) {
    case 'maj7': return ['Root', 'Major 3rd', 'Perfect 5th', 'Major 7th'];
    case 'min7': return ['Root', 'Minor 3rd', 'Perfect 5th', 'Minor 7th'];
    case 'dom7': return ['Root', 'Major 3rd', 'Perfect 5th', 'Minor 7th'];
    case 'min7b5': return ['Root', 'Minor 3rd', 'Diminished 5th', 'Minor 7th'];
    case 'dim7': return ['Root', 'Minor 3rd', 'Diminished 5th', 'Diminished 7th'];
    case 'aug': return ['Root', 'Major 3rd', 'Augmented 5th'];
  }
}

/**
 * Compute a single playable arpeggio path: one position per chord tone on
 * consecutive strings, forming a sweep-pickable shape.
 * Returns positions ordered from lowest string to highest.
 */
function getArpeggioPath(
  chordNotes: string[],
  tuning: Tuning,
  stringCount: number,
  maxFret: number
): FretPosition[] {
  const notePositions = chordNotes.map(note =>
    getPositionsForNote(note, tuning, stringCount, maxFret)
  );

  let bestPath: FretPosition[] = [];
  let bestSpan = Infinity;

  // Try each possible starting string (need room for all notes on consecutive strings)
  for (let startStr = 0; startStr <= stringCount - chordNotes.length; startStr++) {
    // For each chord tone, get candidate positions on its target string
    const candidates = chordNotes.map((_, i) =>
      notePositions[i].filter(p => p.string === startStr + i)
    );

    // Skip if any note has no position on its target string
    if (candidates.some(c => c.length === 0)) continue;

    // Try centering around each candidate of the first note
    for (const firstPos of candidates[0]) {
      const path = [firstPos];

      for (let i = 1; i < candidates.length; i++) {
        // Pick the candidate closest to the first position's fret
        const closest = candidates[i].reduce((best, pos) =>
          Math.abs(pos.fret - firstPos.fret) < Math.abs(best.fret - firstPos.fret) ? pos : best
        );
        path.push(closest);
      }

      const frets = path.map(p => p.fret);
      const span = Math.max(...frets) - Math.min(...frets);

      if (span < bestSpan) {
        bestSpan = span;
        bestPath = path;
      }
    }
  }

  return bestPath;
}

const ArpeggioExercise: React.FC<ArpeggioExerciseProps> = ({ exercise }) => {
  const {
    instrument,
    stringCount,
    tuning,
    fretCount,
    setHighlightedPositions,
    setSecondaryHighlightedPositions,
    setRootNote,
    clearHighlights,
  } = useGuitarStore();
  const isGuitar = instrument === 'guitar';
  const { droneConfig, setDroneConfig, isDroneActive, setDroneActive } = useAudioStore();
  const { isActive } = useExerciseStore();

  const [selectedKey, setSelectedKey] = useState('C');
  const [selectedQuality, setSelectedQuality] = useState<ChordQuality>('maj7');
  const [showAllPositions, setShowAllPositions] = useState(true);
  const [isPlayingArpeggio, setIsPlayingArpeggio] = useState(false);
  const [activeNoteIndex, setActiveNoteIndex] = useState(-1); // index into chordNotes during playback
  const playbackTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Set initial quality based on exercise ID
  useEffect(() => {
    const quality = EXERCISE_QUALITY_MAP[exercise.id];
    if (quality) setSelectedQuality(quality);
  }, [exercise.id]);

  const maxFret = showAllPositions ? fretCount : 12;

  // Compute a single playable arpeggio path (one position per chord tone)
  const arpeggioPath = useMemo(() => {
    const chordSymbol = getChordSymbol(selectedQuality);
    const chordName = `${selectedKey}${chordSymbol}`;
    const notes = getChordNotes(chordName);
    if (!notes || notes.length === 0) return [];
    const normalizedNotes = notes.map(n => normalizeNoteName(n));
    return getArpeggioPath(normalizedNotes, tuning, stringCount, maxFret);
  }, [selectedKey, selectedQuality, tuning, stringCount, maxFret]);

  // Update fretboard when key/quality changes or during playback animation
  const updateHighlights = useCallback(() => {
    if (!isActive) return;

    try {
      const chordSymbol = getChordSymbol(selectedQuality);
      const chordName = `${selectedKey}${chordSymbol}`;
      const notes = getChordNotes(chordName);

      if (notes && notes.length > 0) {
        const normalizedNotes = notes.map(n => normalizeNoteName(n));
        const normalizedRoot = normalizeNoteName(selectedKey);
        setRootNote(normalizedRoot);

        if (activeNoteIndex >= 0 && activeNoteIndex < arpeggioPath.length) {
          // During playback: highlight single position of active note, rest of path as secondary
          const activePos = arpeggioPath[activeNoteIndex];
          const otherPathPositions = arpeggioPath.filter((_, i) => i !== activeNoteIndex);
          setHighlightedPositions([activePos]);
          setSecondaryHighlightedPositions(otherPathPositions);
        } else {
          // Default: all arpeggio positions — root = secondary, non-root = primary
          const rootPositions = getScalePositions([normalizedRoot], tuning, stringCount, maxFret);
          const nonRootNotes = normalizedNotes.filter(n => n !== normalizedRoot);
          const nonRootPositions = getScalePositions(nonRootNotes, tuning, stringCount, maxFret);
          setHighlightedPositions(nonRootPositions);
          setSecondaryHighlightedPositions(rootPositions);
        }
      }
    } catch (e) {
      console.error('Error computing arpeggio positions:', e);
    }
  }, [
    selectedKey, selectedQuality, showAllPositions, isActive, activeNoteIndex,
    stringCount, tuning, maxFret, arpeggioPath,
    setHighlightedPositions, setSecondaryHighlightedPositions, setRootNote,
  ]);

  useEffect(() => {
    updateHighlights();
  }, [updateHighlights]);

  // Update drone when key changes
  useEffect(() => {
    if (isDroneActive) {
      setDroneConfig({ note: selectedKey, octave: 2 });
    }
  }, [selectedKey, isDroneActive, setDroneConfig]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      playbackTimersRef.current.forEach(t => clearTimeout(t));
      playbackTimersRef.current = [];
      clearHighlights();
      if (isDroneActive) {
        stopDrone();
        setDroneActive(false);
      }
    };
  }, [clearHighlights, isDroneActive, setDroneActive]);

  const handleToggleDrone = async () => {
    await initAudio();

    if (isDroneActive) {
      stopDrone();
      setDroneActive(false);
    } else {
      setDroneConfig({ note: selectedKey, octave: 2 });
      startDrone({ note: selectedKey, octave: 2, volume: droneConfig.volume, waveform: droneConfig.waveform });
      setDroneActive(true);
    }
  };

  const handlePlayArpeggio = async () => {
    if (isPlayingArpeggio) return;
    await initAudio();
    setIsPlayingArpeggio(true);

    // Clear any previous timers
    playbackTimersRef.current.forEach(t => clearTimeout(t));
    playbackTimersRef.current = [];

    const chordSymbol = getChordSymbol(selectedQuality);
    const chordName = `${selectedKey}${chordSymbol}`;
    const notes = getChordNotes(chordName);

    if (notes && notes.length > 0) {
      const noteDelay = 0.35;
      // Play ascending then descending
      const ascending = notes.map(n => `${n}2`);
      const descending = [...ascending].reverse().slice(1);
      const allNotes = [...ascending, ...descending];

      // Map each played note back to its index in the chord notes array
      const ascendingIndices = notes.map((_, i) => i);
      const descendingIndices = [...ascendingIndices].reverse().slice(1);
      const allNoteIndices = [...ascendingIndices, ...descendingIndices];

      for (let i = 0; i < allNotes.length; i++) {
        playNote(allNotes[i], { duration: 0.5, velocity: 0.7, delay: i * noteDelay });

        // Schedule fretboard highlight for each note
        const timer = setTimeout(() => {
          setActiveNoteIndex(allNoteIndices[i]);
        }, i * noteDelay * 1000);
        playbackTimersRef.current.push(timer);
      }

      const endTimer = setTimeout(() => {
        setActiveNoteIndex(-1);
        setIsPlayingArpeggio(false);
        playbackTimersRef.current = [];
      }, allNotes.length * noteDelay * 1000 + 500);
      playbackTimersRef.current.push(endTimer);
    } else {
      setIsPlayingArpeggio(false);
    }
  };

  const chordSymbol = getChordSymbol(selectedQuality);
  const chordName = `${selectedKey}${chordSymbol}`;
  const chordNotes = getChordNotes(chordName);
  const toneLabels = getChordToneLabels(selectedQuality);

  return (
    <div className="space-y-6">
      {/* Key + Quality selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Key
          </label>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="w-full px-3 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            {KEYS.map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Chord Quality
          </label>
          <select
            value={selectedQuality}
            onChange={(e) => setSelectedQuality(e.target.value as ChordQuality)}
            className="w-full px-3 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            {QUALITY_OPTIONS.map((q) => (
              <option key={q.value} value={q.value}>{q.label} ({q.symbol})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chord Tones Info */}
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
        <h4 className="font-medium mb-2" style={{ color: 'var(--accent-primary)' }}>
          {selectedKey}{chordSymbol} Arpeggio
        </h4>
        <div className="flex flex-wrap gap-3">
          {chordNotes.map((note, idx) => {
            const isActiveNote = activeNoteIndex === idx;
            return (
              <div
                key={idx}
                className="flex flex-col items-center px-3 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: isActiveNote ? 'var(--accent-primary)' : 'var(--bg-primary)',
                  border: `1px solid ${isActiveNote ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  color: isActiveNote ? 'white' : 'var(--text-primary)',
                  transform: isActiveNote ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                <span className="text-sm font-bold">{note}</span>
                <span className="text-xs" style={{ opacity: 0.7 }}>
                  {toneLabels[idx] || ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Display Options */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
          <input
            type="checkbox"
            checked={showAllPositions}
            onChange={(e) => setShowAllPositions(e.target.checked)}
            className="rounded"
          />
          Full fretboard
        </label>
        <DisplayModeToggle />
      </div>

      {/* Fretboard */}
      <div className="card p-4">
        <Fretboard interactive={true} />
      </div>

      {/* Audio Controls */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleToggleDrone}
          className={isDroneActive ? 'btn-danger' : 'btn-success'}
        >
          {isDroneActive ? 'Stop Drone' : 'Play Drone'}
        </button>
        <button
          onClick={handlePlayArpeggio}
          disabled={isPlayingArpeggio}
          className="btn-secondary disabled:opacity-50"
        >
          {isPlayingArpeggio ? 'Playing...' : 'Play Arpeggio'}
        </button>
      </div>

      {/* Practice Tips */}
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <h4 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Practice Tips</h4>
        <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: 'var(--text-secondary)' }}>
          {isGuitar ? (
            <>
              <li>Practice sweep picking — use a continuous downstroke across strings ascending, upstroke descending</li>
              <li>Start slowly with a metronome</li>
              <li>Mute strings after playing to keep the arpeggio clean</li>
              <li>Economy of motion: keep your pick close to the strings</li>
              <li>Learn each inversion: start on the root, 3rd, 5th, and 7th</li>
              <li>Practice connecting arpeggio shapes across positions on the neck</li>
              <li>Over a chord progression, switch arpeggios to outline the harmony</li>
            </>
          ) : (
            <>
              <li>Play the arpeggio ascending and descending with even tone</li>
              <li>Use alternating fingers (index-middle) for consistent attack</li>
              <li>Learn each inversion: start on the root, 3rd, 5th, and 7th</li>
              <li>Practice connecting arpeggio shapes across positions on the neck</li>
              <li>Over a chord progression, switch arpeggios to outline the harmony</li>
              {exercise.id === 'bass-arp-4' && (
                <li>For inversions, start on each chord tone in turn: root position, 1st, 2nd, 3rd inversion</li>
              )}
            </>
          )}
          <li>Use the drone to hear how each arpeggio tone relates to the root</li>
        </ul>
      </div>

      {/* Self-Assessment */}
      <PracticeRating exerciseId={exercise.id} exerciseType={exercise.type} />
    </div>
  );
};

export default ArpeggioExercise;
