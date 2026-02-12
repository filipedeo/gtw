import React, { useState, useEffect } from 'react';
import { Exercise } from '../types/exercise';
import { useGuitarStore } from '../stores/guitarStore';
import { useAudioStore } from '../stores/audioStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { getScalePositions } from '../utils/fretboardCalculations';
import { getModeNotes, MODES } from '../lib/theoryEngine';
import { startDrone, stopDrone, initAudio } from '../lib/audioEngine';
import { normalizeNoteName } from '../types/guitar';
import DisplayModeToggle from './DisplayModeToggle';
import PracticeRating from './PracticeRating';

interface ModalPracticeExerciseProps {
  exercise: Exercise;
}

// Map exercise IDs to initial mode selection
const EXERCISE_MODE_MAP: Record<string, string> = {
  'modal-1': 'dorian',
  'modal-2': 'mixolydian',
  'modal-3': 'lydian',
  'modal-4': 'phrygian',
  'modal-5': 'aeolian',
  'modal-6': 'dorian', // parallel comparison — any mode as default
  'modal-7': 'locrian',
  'modal-8': 'harmonic minor',
  'modal-9': 'melodic minor',
  'modal-10': 'blues',
};

const ModalPracticeExercise: React.FC<ModalPracticeExerciseProps> = ({ exercise }) => {
  const { stringCount, tuning, setHighlightedPositions, setSecondaryHighlightedPositions, setRootNote, clearHighlights } = useGuitarStore();
  const { droneConfig, setDroneConfig, isDroneActive, setDroneActive } = useAudioStore();
  const { isActive } = useExerciseStore();

  const [selectedMode, setSelectedMode] = useState('dorian');
  const [selectedKey, setSelectedKey] = useState('A');
  const [showCharacteristicNote, setShowCharacteristicNote] = useState(true);

  const keys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

  const currentModeInfo = MODES.find(m => m.name === selectedMode);

  // Set initial mode based on exercise ID
  useEffect(() => {
    const mode = EXERCISE_MODE_MAP[exercise.id];
    if (mode) setSelectedMode(mode);
  }, [exercise.id]);

  // Update fretboard when mode/key changes
  useEffect(() => {
    if (!isActive) return;

    try {
      const normalizedKey = normalizeNoteName(selectedKey);
      const scaleNotes = getModeNotes(normalizedKey, selectedMode);
      if (scaleNotes && scaleNotes.length > 0) {
        // When showCharacteristicNote is on, split scale into main + characteristic note positions
        if (showCharacteristicNote && currentModeInfo && currentModeInfo.characteristicDegree < scaleNotes.length) {
          const charNote = scaleNotes[currentModeInfo.characteristicDegree];
          const charNormalized = normalizeNoteName(charNote);
          const mainNotes = scaleNotes.filter((_, i) => i !== currentModeInfo.characteristicDegree);
          const mainPositions = getScalePositions(mainNotes, tuning, stringCount, 12);
          const charPositions = getScalePositions([charNormalized], tuning, stringCount, 12);
          setHighlightedPositions(mainPositions);
          setSecondaryHighlightedPositions(charPositions);
        } else {
          const positions = getScalePositions(scaleNotes, tuning, stringCount, 12);
          setHighlightedPositions(positions);
          setSecondaryHighlightedPositions([]);
        }
        setRootNote(normalizedKey);
      }
    } catch (e) {
      console.error('Error getting mode notes:', e);
    }
  }, [selectedMode, selectedKey, showCharacteristicNote, isActive, stringCount, tuning,
      currentModeInfo, setHighlightedPositions, setSecondaryHighlightedPositions, setRootNote]);

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
      startDrone({ note: selectedKey, octave: 2, volume: droneConfig.volume, waveform: droneConfig.waveform });
      setDroneActive(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Mode</label>
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          >
            {MODES.map((mode) => (
              <option key={mode.name} value={mode.name}>
                {mode.displayName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Key</label>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          >
            {keys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode Info */}
      {currentModeInfo && (
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--accent-primary)' }}>
          <h4 className="font-medium mb-2" style={{ color: 'var(--accent-primary)' }}>{currentModeInfo.displayName}</h4>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            <strong>Characteristic Note:</strong> {currentModeInfo.characteristicNote}
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            Focus on emphasizing the characteristic note in your playing.
            This is what gives the mode its unique sound.
          </p>
        </div>
      )}

      {/* Drone Control */}
      <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <div>
          <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>Drone</h4>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Play a {selectedKey} drone to practice over
          </p>
        </div>
        <button
          onClick={handleToggleDrone}
          className="px-6 py-2 rounded-lg font-medium transition-colors text-white"
          style={{ backgroundColor: isDroneActive ? 'var(--error)' : 'var(--success)' }}
        >
          {isDroneActive ? 'Stop Drone' : 'Start Drone'}
        </button>
      </div>

      {/* Display Options */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
          <input
            type="checkbox"
            checked={showCharacteristicNote}
            onChange={(e) => setShowCharacteristicNote(e.target.checked)}
            className="rounded"
          />
          Highlight characteristic note
        </label>
        <DisplayModeToggle />
      </div>

      {/* Practice Tips */}
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--warning)' }}>
        <h4 className="font-medium mb-2" style={{ color: 'var(--warning)' }}>Practice Tips</h4>
        <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: 'var(--text-secondary)' }}>
          <li>Start and end your phrases on the root note ({selectedKey})</li>
          <li>Emphasize the characteristic note ({currentModeInfo?.characteristicNote})</li>
          <li>Try playing the scale ascending and descending</li>
          <li>Create short melodic phrases using the highlighted notes</li>
          <li>Listen to how the mode sounds against the drone</li>
        </ul>
      </div>

      {/* Self-Assessment */}
      <PracticeRating exerciseId={exercise.id} exerciseType={exercise.type} />
    </div>
  );
};

export default ModalPracticeExercise;
