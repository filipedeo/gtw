import React, { useState, useEffect, useCallback } from 'react';
import { Exercise } from '../types/exercise';
import { FretPosition, Tuning, normalizeNoteName } from '../types/guitar';
import { useGuitarStore } from '../stores/guitarStore';
import { useAudioStore } from '../stores/audioStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { getModeNotes, MODES } from '../lib/theoryEngine';
import { getNoteAtPosition } from '../utils/fretboardCalculations';
import { Note } from 'tonal';
import { startDrone, stopDrone, playNote, initAudio } from '../lib/audioEngine';
import Fretboard from './Fretboard';
import DisplayModeToggle from './DisplayModeToggle';
import PracticeRating from './PracticeRating';
import CollapsibleSection from './CollapsibleSection';
import ScaleNotesDisplay from './ScaleNotesDisplay';

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
export function getThreeNPSPositions(
  key: string,
  modeName: string,
  tuning: Tuning,
  stringCount: number,
  startFret: number
): FretPosition[] {
  const scaleNotes = getModeNotes(normalizeNoteName(key), modeName);
  if (!scaleNotes || scaleNotes.length === 0) return [];

  // Use chroma (pitch class) comparison to handle double accidentals correctly
  const scaleChromas = scaleNotes.map(n => Note.get(n).chroma).filter((c): c is number => c !== undefined);

  const positions: FretPosition[] = [];
  let targetFret = startFret;

  for (let string = 0; string < stringCount; string++) {
    // Find all frets on this string that produce a scale note
    const scaleFrets: number[] = [];
    for (let fret = 0; fret <= 22; fret++) {
      const pos = { string, fret };
      const note = getNoteAtPosition(pos, tuning, stringCount);
      const noteChroma = Note.get(note).chroma;
      if (noteChroma !== undefined && scaleChromas.includes(noteChroma)) {
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
    instrument,
    stringCount,
    tuning,
    setHighlightedPositions,
    setSecondaryHighlightedPositions,
    setRootNote,
    clearHighlights,
  } = useGuitarStore();
  const { droneConfig, setDroneConfig, isDroneActive, setDroneActive } = useAudioStore();
  const { isActive } = useExerciseStore();

  const isBass = instrument === 'bass';

  const [selectedKey, setSelectedKey] = useState<string>('C');
  const [selectedModeIndex, setSelectedModeIndex] = useState<number>(0);
  const [startFret, setStartFret] = useState<number>(0);
  const [isPlayingScale, setIsPlayingScale] = useState(false);

  // Set initial mode based on exercise ID
  useEffect(() => {
    const modeMap: Record<string, number> = {
      'three-nps-1': 0,          // Ionian
      'three-nps-2': 1,          // Dorian
      'three-nps-phrygian': 2,   // Phrygian
      'three-nps-lydian': 3,     // Lydian
      'three-nps-mixolydian': 4, // Mixolydian
      'three-nps-aeolian': 5,    // Aeolian
      'three-nps-locrian': 6,    // Locrian
      'three-nps-harmonic-minor': 7,  // Harmonic Minor
      'three-nps-melodic-minor': 8,   // Melodic Minor
    };
    const index = modeMap[exercise.id];
    if (index !== undefined) setSelectedModeIndex(index);
    // three-nps-3 is "All 7 Modes" - defaults to Ionian (0)
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
      // Cycle within the same mode category (e.g., diatonic modes 0-6)
      const currentCategory = selectedMode.category;
      const sameCategoryModes = MODES.filter(m => m.category === currentCategory);
      const currentCatIndex = sameCategoryModes.findIndex(m => m.name === selectedMode.name);
      const nextCatIndex = (currentCatIndex + 1) % sameCategoryModes.length;
      const nextMode = sameCategoryModes[nextCatIndex];
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
      {/* Mode / Pattern Selection */}
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
                {idx + 1}. {mode.displayName}
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
            Pattern {selectedModeIndex + 1} - {selectedMode.displayName} ({selectedKey})
          </h4>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Characteristic note: <strong>{selectedMode.characteristicNote}</strong>
            {' '}&mdash;{' '}
            3 notes per string starting near fret {startFret}.
            {stringCount >= 5 && isBass ? ' Includes low B string.' : stringCount === 7 ? ' Includes low B string for 7-string coverage.' : ''}
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
          <li>Every string gets exactly 3 notes — great for even {isBass ? 'finger alternation' : 'alternate picking'}</li>
          <li>All 7 patterns use just 3 finger shapes: whole-whole (1-3-5), whole-half (1-3-4), and half-whole (1-2-4)</li>
          <li>Practice ascending and descending with strict {isBass ? 'alternating fingers (index-middle)' : 'alternate picking'}</li>
          <li>Try legato (hammer-ons ascending, pull-offs descending) for smooth lines</li>
          <li>Start slow with a metronome — increase speed only when clean</li>
          {isBass && <li>Focus on consistent right-hand finger alternation (index-middle) for an even tone across all strings</li>}
          <li>Use the drone to hear how each note relates to the tonal center</li>
          <li>Connect adjacent patterns by sliding between them</li>
          <li>Remove the highest and lowest note per string to reveal the pentatonic shape hiding inside each 3NPS pattern</li>
        </ul>
      </CollapsibleSection>

      {/* Self-Assessment */}
      <PracticeRating exerciseId={exercise.id} exerciseType={exercise.type} />
    </div>
  );
};

export default ThreeNPSExercise;
