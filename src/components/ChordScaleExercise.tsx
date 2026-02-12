import React, { useState, useEffect } from 'react';
import { Exercise } from '../types/exercise';
import { useGuitarStore } from '../stores/guitarStore';
import { useAudioStore } from '../stores/audioStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { getScalePositions } from '../utils/fretboardCalculations';
import { getModeNotes } from '../lib/theoryEngine';
import { getChordNotes } from '../lib/theoryEngine';
import { startDrone, stopDrone, playChord, initAudio } from '../lib/audioEngine';
import { normalizeNoteName } from '../types/guitar';
import DisplayModeToggle from './DisplayModeToggle';
import PracticeRating from './PracticeRating';

interface ChordScaleExerciseProps {
  exercise: Exercise;
}

/** Chord-scale pairings for different chord types */
interface ChordScalePairing {
  chordType: string;
  chordSymbol: string;
  scales: { name: string; displayName: string; description: string }[];
}

const MAJOR_CHORD_SCALES: ChordScalePairing = {
  chordType: 'Major',
  chordSymbol: 'maj7',
  scales: [
    { name: 'ionian', displayName: 'Ionian (Major)', description: 'Safe choice - matches the chord perfectly' },
    { name: 'lydian', displayName: 'Lydian', description: 'Avoids the 4th - more sophisticated sound' },
  ],
};

const MINOR_CHORD_SCALES: ChordScalePairing = {
  chordType: 'Minor',
  chordSymbol: 'm7',
  scales: [
    { name: 'dorian', displayName: 'Dorian', description: 'Most versatile - bright minor sound with natural 6' },
    { name: 'aeolian', displayName: 'Aeolian (Natural Minor)', description: 'Darker sound - b6 can clash' },
    { name: 'phrygian', displayName: 'Phrygian', description: 'Dark, Spanish flavor - b2 is distinctive' },
    { name: 'melodic minor', displayName: 'Melodic Minor', description: 'Bright minor with natural 6 & 7' },
  ],
};

const DOMINANT_CHORD_SCALES: ChordScalePairing = {
  chordType: 'Dominant 7',
  chordSymbol: '7',
  scales: [
    { name: 'mixolydian', displayName: 'Mixolydian', description: 'Basic dominant scale - safe and versatile' },
    { name: 'lydian dominant', displayName: 'Lydian Dominant', description: 'Avoids the 4th - hipper sound' },
    { name: 'blues', displayName: 'Blues Scale', description: 'Classic blues phrasing with b3 and b5' },
    { name: 'altered', displayName: 'Altered (Super Locrian)', description: 'Maximum tension - all altered tones' },
  ],
};

const HALF_DIM_CHORD_SCALES: ChordScalePairing = {
  chordType: 'Half-Diminished',
  chordSymbol: 'm7b5',
  scales: [
    { name: 'locrian', displayName: 'Locrian', description: 'Basic choice but unstable - b2 and b5' },
    { name: 'locrian #2', displayName: 'Locrian #2', description: 'Smoother - from melodic minor, natural 2' },
  ],
};

const DIMINISHED_CHORD_SCALES: ChordScalePairing = {
  chordType: 'Diminished 7',
  chordSymbol: 'dim7',
  scales: [
    { name: 'diminished', displayName: 'Diminished (H-W)', description: 'Half-whole pattern - 8 symmetric notes' },
    { name: 'whole-half diminished', displayName: 'Diminished (W-H)', description: 'Whole-half pattern - alternate fingering' },
  ],
};

/** Map exercise IDs to chord-scale pairings */
const EXERCISE_PAIRING_MAP: Record<string, ChordScalePairing> = {
  'chord-scale-1': MAJOR_CHORD_SCALES,
  'chord-scale-2': MINOR_CHORD_SCALES,
  'chord-scale-3': DOMINANT_CHORD_SCALES,
  'chord-scale-4': HALF_DIM_CHORD_SCALES,
  'chord-scale-5': DIMINISHED_CHORD_SCALES,
};

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const ChordScaleExercise: React.FC<ChordScaleExerciseProps> = ({ exercise }) => {
  const { stringCount, tuning, fretCount, setHighlightedPositions, setSecondaryHighlightedPositions, setRootNote, clearHighlights } = useGuitarStore();
  const { droneConfig, setDroneConfig, isDroneActive, setDroneActive } = useAudioStore();
  const { isActive } = useExerciseStore();

  const [selectedKey, setSelectedKey] = useState('C');
  const [selectedScale, setSelectedScale] = useState('');
  const [showFullFretboard, setShowFullFretboard] = useState(false);

  // Get the chord-scale pairing for this exercise
  const pairing = EXERCISE_PAIRING_MAP[exercise.id];

  // Set initial scale when exercise changes
  useEffect(() => {
    if (pairing && pairing.scales.length > 0) {
      setSelectedScale(pairing.scales[0].name);
    }
  }, [exercise.id, pairing]);

  const maxFret = showFullFretboard ? fretCount : 12;

  // Update fretboard when scale/key changes
  useEffect(() => {
    if (!isActive || !selectedScale) return;

    try {
      const normalizedKey = normalizeNoteName(selectedKey);
      const scaleNotes = getModeNotes(normalizedKey, selectedScale);
      
      if (scaleNotes && scaleNotes.length > 0) {
        const positions = getScalePositions(scaleNotes, tuning, stringCount, maxFret);
        setHighlightedPositions(positions);
        
        // Highlight chord tones in secondary color
        if (pairing) {
          const chordSymbol = `${normalizedKey}${pairing.chordSymbol}`;
          const chordNotes = getChordNotes(chordSymbol);
          if (chordNotes && chordNotes.length > 0) {
            const normalizedChordNotes = chordNotes.map(n => normalizeNoteName(n));
            const chordPositions = getScalePositions(normalizedChordNotes, tuning, stringCount, maxFret);
            setSecondaryHighlightedPositions(chordPositions);
          }
        }
        
        setRootNote(normalizedKey);
      }
    } catch (e) {
      console.error('Error getting scale notes:', e);
    }
  }, [selectedScale, selectedKey, showFullFretboard, isActive, stringCount, tuning, pairing,
      maxFret, setHighlightedPositions, setSecondaryHighlightedPositions, setRootNote]);

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

  const handlePlayChord = async () => {
    await initAudio();
    if (pairing) {
      const chordSymbol = `${selectedKey}${pairing.chordSymbol}`;
      const chordNotes = getChordNotes(chordSymbol);
      if (chordNotes && chordNotes.length > 0) {
        // Add octave to each note for playback
        const notesWithOctave = chordNotes.map((n, i) => `${n}${3 + Math.floor(i / 4)}`);
        playChord(notesWithOctave, { duration: 1.5 });
      }
    }
  };

  const currentScaleInfo = pairing?.scales.find(s => s.name === selectedScale);

  // For exercises without a specific pairing (like ii-V-I application), show a generic view
  if (!pairing) {
    return (
      <div className="space-y-6">
        {/* Key Selection */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Key</label>
          <div className="flex flex-wrap gap-1">
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
        </div>

        {/* Exercise Instructions */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--accent-primary)' }}>
          <h4 className="font-medium mb-3" style={{ color: 'var(--accent-primary)' }}>Instructions</h4>
          <ul className="text-sm space-y-2 list-disc list-inside" style={{ color: 'var(--text-secondary)' }}>
            {exercise.instructions.map((instruction, i) => (
              <li key={i}>{instruction}</li>
            ))}
          </ul>
        </div>

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

        <PracticeRating exerciseId={exercise.id} exerciseType={exercise.type} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Selection */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Key</label>
        <div className="flex flex-wrap gap-1">
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
      </div>

      {/* Chord Info */}
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--accent-primary)' }}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium" style={{ color: 'var(--accent-primary)' }}>
            {pairing.chordType} Chord: {selectedKey}{pairing.chordSymbol}
          </h4>
          <button
            onClick={handlePlayChord}
            className="px-4 py-1 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
          >
            Play Chord
          </button>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Select a scale below to see how it works over this chord type.
        </p>
      </div>

      {/* Scale Selection */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Scale Options</label>
        <div className="space-y-2">
          {pairing.scales.map((scale) => (
            <button
              key={scale.name}
              onClick={() => setSelectedScale(scale.name)}
              className={`w-full text-left p-3 rounded-lg transition-all ${
                selectedScale === scale.name ? 'ring-2 ring-[var(--accent-primary)]' : ''
              }`}
              style={{
                backgroundColor: selectedScale === scale.name ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                borderColor: selectedScale === scale.name ? 'var(--accent-primary)' : 'transparent',
              }}
            >
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{scale.displayName}</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{scale.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Current Scale Info */}
      {currentScaleInfo && (
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--warning)' }}>
          <h4 className="font-medium mb-2" style={{ color: 'var(--warning)' }}>
            Playing: {currentScaleInfo.displayName} over {selectedKey}{pairing.chordSymbol}
          </h4>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            The highlighted notes show the scale. <strong>Brighter notes are chord tones</strong> - 
            emphasize these on strong beats. Use the other scale tones as passing notes.
          </p>
        </div>
      )}

      {/* Controls Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Drone Control */}
        <button
          onClick={handleToggleDrone}
          className="px-4 py-2 rounded-lg font-medium transition-colors text-white"
          style={{ backgroundColor: isDroneActive ? 'var(--error)' : 'var(--success)' }}
        >
          {isDroneActive ? 'Stop Drone' : 'Start Drone'}
        </button>

        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
          <input
            type="checkbox"
            checked={showFullFretboard}
            onChange={(e) => setShowFullFretboard(e.target.checked)}
            className="rounded"
          />
          Full fretboard
        </label>

        <DisplayModeToggle />
      </div>

      {/* Practice Tips */}
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <h4 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Practice Tips</h4>
        <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: 'var(--text-secondary)' }}>
          <li>Play the chord, then improvise using the selected scale</li>
          <li>Target chord tones (bright notes) on beats 1 and 3</li>
          <li>Use scale tones as passing notes between chord tones</li>
          <li>Try each scale option and listen for the different colors</li>
          <li>Practice voice leading: find smooth paths between chord tones</li>
        </ul>
      </div>

      {/* Self-Assessment */}
      <PracticeRating exerciseId={exercise.id} exerciseType={exercise.type} />
    </div>
  );
};

export default ChordScaleExercise;
