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
import CollapsibleSection from './CollapsibleSection';
import ScaleNotesDisplay from './ScaleNotesDisplay';

interface BassPositionExerciseProps {
  exercise: Exercise;
}

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Compute 2-notes-per-string positions for a given scale.
 *
 * Algorithm mirrors getThreeNPSPositions from ThreeNPSExercise
 * but selects groups of 2 consecutive scale frets per string,
 * creating natural 4-finger bass patterns.
 */
export function getTwoNPSPositions(
  key: string,
  modeName: string,
  tuning: Tuning,
  stringCount: number,
  startFret: number
): FretPosition[] {
  const scaleNotes = getModeNotes(normalizeNoteName(key), modeName);
  if (!scaleNotes || scaleNotes.length === 0) return [];

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

    // Find the best group of 2 consecutive scale frets near the target position
    let bestGroup: number[] = [];
    let bestDistance = Infinity;

    for (let i = 0; i <= scaleFrets.length - 2; i++) {
      const group = [scaleFrets[i], scaleFrets[i + 1]];
      // The group should span at most 4 frets to be playable with one hand
      if (group[1] - group[0] <= 4) {
        const center = (group[0] + group[1]) / 2;
        const dist = Math.abs(center - targetFret - 1);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestGroup = group;
        }
      }
    }

    // Add positions and drift the target for the next string
    if (bestGroup.length === 2) {
      bestGroup.forEach(fret => positions.push({ string, fret }));
      targetFret = Math.max(targetFret, bestGroup[0]);
    }
  }

  return positions;
}

const BassPositionExercise: React.FC<BassPositionExerciseProps> = ({ exercise }) => {
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

  const [selectedKey, setSelectedKey] = useState('C');
  const [selectedModeIndex, setSelectedModeIndex] = useState(0);
  const [startFret, setStartFret] = useState(0);
  const [isPlayingScale, setIsPlayingScale] = useState(false);

  const selectedMode = MODES[selectedModeIndex];

  // Calculate positions and update fretboard
  const updateFretboard = useCallback(() => {
    if (!isActive) return;

    const positions = getTwoNPSPositions(
      selectedKey,
      selectedMode.name,
      tuning,
      stringCount,
      startFret
    );

    setHighlightedPositions(positions);
    setRootNote(normalizeNoteName(selectedKey));
    setSecondaryHighlightedPositions([]);
  }, [
    isActive, selectedKey, selectedMode, tuning, stringCount, startFret,
    setHighlightedPositions, setSecondaryHighlightedPositions, setRootNote,
  ]);

  useEffect(() => {
    updateFretboard();
  }, [updateFretboard]);

  // Update drone when key changes
  useEffect(() => {
    if (isDroneActive) {
      setDroneConfig({ note: selectedKey, octave: 2 });
    }
  }, [selectedKey, isDroneActive, setDroneConfig]);

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

    const positions = getTwoNPSPositions(
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

    const noteDelay = 0.25;
    for (let i = 0; i < sorted.length; i++) {
      const pos = sorted[i];
      const note = getNoteAtPosition(pos, tuning, stringCount);
      playNote(note, { duration: 0.4, velocity: 0.7, delay: i * noteDelay });
    }

    setTimeout(() => {
      setIsPlayingScale(false);
    }, sorted.length * noteDelay * 1000 + 500);
  };

  return (
    <div className="space-y-6">
      {/* Mode / Scale Selection */}
      <CollapsibleSection title="Mode / Pattern" defaultOpen={true}>
        <div className="pt-1">
          <div className="flex flex-wrap gap-2">
            {MODES.map((mode, idx) => (
              <button
                key={mode.name}
                onClick={() => setSelectedModeIndex(idx)}
                className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                  selectedModeIndex === idx ? 'btn-primary' : ''
                }`}
                style={selectedModeIndex !== idx ? {
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)'
                } : {}}
              >
                {mode.displayName}
              </button>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* Key Selection */}
      <CollapsibleSection title="Key" defaultOpen={true}>
        <div className="flex flex-wrap gap-1 pt-1">
          {KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setSelectedKey(key)}
              className={`px-3 py-2 rounded-lg font-medium transition-all min-w-[44px] ${
                selectedKey === key ? 'btn-primary' : ''
              }`}
              style={selectedKey !== key ? {
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)'
              } : {}}
            >
              {key}
            </button>
          ))}
        </div>
      </CollapsibleSection>

      {/* Scale Notes Display */}
      <ScaleNotesDisplay
        keyName={selectedKey}
        scaleName={selectedMode.name}
        displayName={selectedMode.displayName}
        formula={selectedMode.formula}
      />

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
      <CollapsibleSection title="Pattern Info" defaultOpen={true}>
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
        >
          <h4 className="font-medium mb-2" style={{ color: 'var(--accent-primary)' }}>
            {selectedMode.displayName} ({selectedKey}) - 2 Notes Per String
          </h4>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Characteristic note: <strong>{selectedMode.characteristicNote}</strong>
            {' '}&mdash;{' '}
            2 notes per string starting near fret {startFret}.
            This creates natural one-finger-per-fret patterns optimized for bass.
          </p>
        </div>
      </CollapsibleSection>

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
      <CollapsibleSection title="Practice Tips" defaultOpen={false}>
        <ul
          className="text-sm space-y-1 list-disc list-inside"
          style={{ color: 'var(--text-secondary)' }}
        >
          <li>2 notes per string creates natural one-finger-per-fret bass patterns</li>
          <li>Keep your thumb anchored behind the neck for stability</li>
          <li>Use one finger per fret within each position (index and middle, or index and ring)</li>
          <li>Practice shifting cleanly between positions -- minimize hand movement</li>
          <li>Use alternating right-hand fingers (index-middle) for consistent tone</li>
          <li>Start slow with a metronome and increase speed only when clean</li>
          <li>Use the drone to hear how each scale degree relates to the tonal center</li>
          <li>Try playing the pattern ascending, then descending without pausing</li>
        </ul>
      </CollapsibleSection>

      {/* Self-Assessment */}
      <PracticeRating exerciseId={exercise.id} exerciseType={exercise.type} />
    </div>
  );
};

export default BassPositionExercise;
