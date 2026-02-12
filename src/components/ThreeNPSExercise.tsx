import React, { useState, useEffect, useCallback } from 'react';
import { Exercise } from '../types/exercise';
import { FretPosition, Tuning, normalizeNoteName } from '../types/guitar';
import { useGuitarStore } from '../stores/guitarStore';
import { useAudioStore } from '../stores/audioStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { getModeNotes, MODES } from '../lib/theoryEngine';
import { getNoteAtPosition } from '../utils/fretboardCalculations';
import { startDrone, stopDrone, playNote, initAudio } from '../lib/audioEngine';
import Fretboard from './Fretboard';
import DisplayModeToggle from './DisplayModeToggle';
import PracticeRating from './PracticeRating';

interface ThreeNPSExerciseProps {
  exercise: Exercise;
}

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Compute 3-notes-per-string positions for a given scale.
 *
 * Algorithm:
 * 1. For each string (low to high), find every fret 0-22 that produces a note
 *    belonging to the scale.
 * 2. Starting from a target fret region, pick 3 consecutive scale frets per
 *    string that form a playable group (max 5-fret span).
 * 3. Drift the target region upward as we move to higher strings so the
 *    overall shape stays in one position on the neck.
 */
function getThreeNPSPositions(
  key: string,
  modeName: string,
  tuning: Tuning,
  stringCount: number,
  startFret: number
): FretPosition[] {
  const scaleNotes = getModeNotes(normalizeNoteName(key), modeName);
  if (!scaleNotes || scaleNotes.length === 0) return [];

  // Normalize all scale notes for comparison
  const normalizedScaleNotes = scaleNotes.map(n => normalizeNoteName(n));

  const positions: FretPosition[] = [];
  let targetFret = startFret;

  for (let string = 0; string < stringCount; string++) {
    // Find all frets on this string that produce a scale note
    const scaleFrets: number[] = [];
    for (let fret = 0; fret <= 22; fret++) {
      const pos = { string, fret };
      const note = getNoteAtPosition(pos, tuning, stringCount);
      const noteName = normalizeNoteName(note.replace(/\d/, ''));
      if (normalizedScaleNotes.includes(noteName)) {
        scaleFrets.push(fret);
      }
    }

    // Find the best group of 3 consecutive scale frets near the target position
    let bestGroup: number[] = [];
    let bestDistance = Infinity;

    for (let i = 0; i <= scaleFrets.length - 3; i++) {
      const group = [scaleFrets[i], scaleFrets[i + 1], scaleFrets[i + 2]];
      // The group should span at most 5 frets to be playable
      if (group[2] - group[0] <= 5) {
        const center = (group[0] + group[2]) / 2;
        const dist = Math.abs(center - targetFret - 2);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestGroup = group;
        }
      }
    }

    // Add positions and drift the target for the next string
    if (bestGroup.length === 3) {
      bestGroup.forEach(fret => positions.push({ string, fret }));
      // Drift the target position to follow the shape
      targetFret = Math.max(targetFret, bestGroup[0]);
    }
  }

  return positions;
}

const ThreeNPSExercise: React.FC<ThreeNPSExerciseProps> = ({ exercise }) => {
  const {
    stringCount,
    tuning,
    setHighlightedPositions,
    setSecondaryHighlightedPositions,
    setRootNote,
    clearHighlights,
  } = useGuitarStore();
  const { droneConfig, setDroneConfig, isDroneActive, setDroneActive } = useAudioStore();
  const { isActive } = useExerciseStore();

  const [selectedKey, setSelectedKey] = useState<string>('C');
  const [selectedModeIndex, setSelectedModeIndex] = useState<number>(0);
  const [startFret, setStartFret] = useState<number>(0);
  const [isPlayingScale, setIsPlayingScale] = useState(false);

  // Set initial mode based on exercise ID
  useEffect(() => {
    if (exercise.id === 'three-nps-1') setSelectedModeIndex(0); // Ionian
    else if (exercise.id === 'three-nps-2') setSelectedModeIndex(1); // Dorian
    // three-nps-3 is "All 7 Modes" - default to Ionian
  }, [exercise.id]);

  const selectedMode = MODES[selectedModeIndex];

  // Calculate positions and update fretboard
  const updateFretboard = useCallback(() => {
    if (!isActive) return;

    const positions = getThreeNPSPositions(
      selectedKey,
      selectedMode.name,
      tuning,
      stringCount,
      startFret
    );

    setHighlightedPositions(positions);
    setRootNote(normalizeNoteName(selectedKey));

    // For the "All 7 Modes" exercise, show the next adjacent pattern as secondary
    if (exercise.id === 'three-nps-3') {
      const nextModeIndex = (selectedModeIndex + 1) % MODES.length;
      const nextMode = MODES[nextModeIndex];
      // The next pattern starts roughly 2-3 frets higher
      const nextStartFret = startFret + 2;
      const secondaryPositions = getThreeNPSPositions(
        selectedKey,
        nextMode.name,
        tuning,
        stringCount,
        nextStartFret
      );
      setSecondaryHighlightedPositions(secondaryPositions);
    } else {
      setSecondaryHighlightedPositions([]);
    }
  }, [
    isActive,
    selectedKey,
    selectedMode,
    selectedModeIndex,
    tuning,
    stringCount,
    startFret,
    exercise.id,
    setHighlightedPositions,
    setSecondaryHighlightedPositions,
    setRootNote,
  ]);

  useEffect(() => {
    updateFretboard();
  }, [updateFretboard]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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
      startDrone({
        note: selectedKey,
        octave: 2,
        volume: droneConfig.volume,
        waveform: droneConfig.waveform,
      });
      setDroneActive(true);
    }
  };

  const handlePlayScale = async () => {
    if (isPlayingScale) return;
    await initAudio();
    setIsPlayingScale(true);

    const positions = getThreeNPSPositions(
      selectedKey,
      selectedMode.name,
      tuning,
      stringCount,
      startFret
    );

    // Sort positions from low to high: lowest string first, then by fret
    const sorted = [...positions].sort((a, b) => {
      if (a.string !== b.string) return a.string - b.string;
      return a.fret - b.fret;
    });

    // Play each note with a slight delay
    const noteDelay = 0.2;
    for (let i = 0; i < sorted.length; i++) {
      const pos = sorted[i];
      const note = getNoteAtPosition(pos, tuning, stringCount);
      playNote(note, { duration: 0.4, velocity: 0.7, delay: i * noteDelay });
    }

    // Wait for all notes to finish
    setTimeout(() => {
      setIsPlayingScale(false);
    }, sorted.length * noteDelay * 1000 + 500);
  };

  return (
    <div className="space-y-6">
      {/* Mode & Key Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Mode / Pattern
          </label>
          <select
            value={selectedModeIndex}
            onChange={(e) => setSelectedModeIndex(parseInt(e.target.value))}
            className="w-full px-3 py-2 rounded-lg"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            {MODES.map((mode, idx) => (
              <option key={mode.name} value={idx}>
                Pattern {idx + 1} - {mode.displayName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Key
          </label>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="w-full px-3 py-2 rounded-lg"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            {KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Start Fret Selection */}
      <div>
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          Starting Fret Position: {startFret}
        </label>
        <input
          type="range"
          min={0}
          max={12}
          value={startFret}
          onChange={(e) => setStartFret(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>Open</span>
          <span>12th Fret</span>
        </div>
      </div>

      {/* Pattern Info */}
      <div
        className="p-4 rounded-lg"
        style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
      >
        <h4 className="font-medium mb-2" style={{ color: 'var(--accent-primary)' }}>
          Pattern {selectedModeIndex + 1} - {selectedMode.displayName} ({selectedKey})
        </h4>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Characteristic note: <strong>{selectedMode.characteristicNote}</strong>
          {' '}&mdash;{' '}
          3 notes per string starting near fret {startFret}.
          {stringCount === 7 && ' Includes low B string for 7-string coverage.'}
        </p>
      </div>

      {/* Display Mode Toggle */}
      <div className="flex items-center justify-between">
        <DisplayModeToggle />
      </div>

      {/* Embedded Fretboard */}
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
          onClick={handlePlayScale}
          disabled={isPlayingScale}
          className="btn-secondary disabled:opacity-50"
        >
          {isPlayingScale ? 'Playing...' : 'Play Scale'}
        </button>
      </div>

      {/* Practice Tips */}
      <div
        className="p-4 rounded-lg"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <h4 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Practice Tips
        </h4>
        <ul
          className="text-sm space-y-1 list-disc list-inside"
          style={{ color: 'var(--text-secondary)' }}
        >
          <li>Every string gets exactly 3 notes — great for even alternate picking</li>
          <li>All 7 patterns use just 3 finger shapes: whole-whole (1-3-5), whole-half (1-3-4), and half-whole (1-2-4)</li>
          <li>Practice ascending and descending with strict alternate picking</li>
          <li>Try legato (hammer-ons ascending, pull-offs descending) for smooth lines</li>
          <li>Start slow with a metronome — increase speed only when clean</li>
          <li>Use the drone to hear how each note relates to the tonal center</li>
          <li>Connect adjacent patterns by sliding between them</li>
          <li>Remove the highest and lowest note per string to reveal the pentatonic shape hiding inside each 3NPS pattern</li>
        </ul>
      </div>

      {/* Self-Assessment */}
      <PracticeRating exerciseId={exercise.id} exerciseType={exercise.type} />
    </div>
  );
};

export default ThreeNPSExercise;
