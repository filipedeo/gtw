import React, { useState, useEffect, useCallback } from 'react';
import { Exercise } from '../types/exercise';
import { FretPosition, normalizeNoteName } from '../types/guitar';
import { useGuitarStore } from '../stores/guitarStore';
import { useAudioStore } from '../stores/audioStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { getScaleNotes } from '../lib/theoryEngine';
import { getNoteAtPosition } from '../utils/fretboardCalculations';
import { startDrone, stopDrone, playNote, initAudio } from '../lib/audioEngine';
import Fretboard from './Fretboard';
import DisplayModeToggle from './DisplayModeToggle';

interface PentatonicExerciseProps {
  exercise: Exercise;
}

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// Mode names indexed by scale degree (0-based)
const MODE_NAMES = [
  'Ionian (Major)',
  'Dorian',
  'Phrygian',
  'Lydian',
  'Mixolydian',
  'Aeolian (Natural Minor)',
  'Locrian',
];

// Which parent-scale degree (0-based) each pentatonic box's starting note sits on.
// Minor pentatonic notes R,b3,4,5,b7 map to parent major scale degrees 6,1,2,3,5
const MINOR_PENT_MODE_INDICES = [5, 0, 1, 2, 4];
// Major pentatonic notes R,2,3,5,6 map to parent major scale degrees 1,2,3,5,6
const MAJOR_PENT_MODE_INDICES = [0, 1, 2, 4, 5];

const MINOR_PENT_DEGREES = ['Root', 'b3', '4', '5', 'b7'];
const MAJOR_PENT_DEGREES = ['Root', '2', '3', '5', '6'];

type ScaleType = 'minor' | 'major';

/**
 * Compute pentatonic box positions for a given shape.
 *
 * Algorithm:
 * 1. Find all pentatonic note frets on the lowest string
 * 2. Locate the root note and offset by boxIndex to get the box's start fret
 * 3. For each string, pick the 2 consecutive pentatonic frets nearest the start fret
 */
function getPentatonicBox(
  key: string,
  scaleType: ScaleType,
  boxIndex: number,
  tuning: { notes: string[] },
  stringCount: number,
): FretPosition[] {
  const scaleName = scaleType === 'minor' ? 'minor pentatonic' : 'major pentatonic';
  const scaleNotes = getScaleNotes(key, scaleName);
  if (!scaleNotes || scaleNotes.length === 0) return [];

  const normalizedScale = scaleNotes.map(n => normalizeNoteName(n));

  // All pentatonic frets on the lowest string (up to fret 17)
  const lowFrets: { fret: number; note: string }[] = [];
  for (let f = 0; f <= 17; f++) {
    const note = getNoteAtPosition({ string: 0, fret: f }, tuning as any, stringCount);
    const nn = normalizeNoteName(note.replace(/\d+$/, ''));
    if (normalizedScale.includes(nn)) {
      lowFrets.push({ fret: f, note: nn });
    }
  }

  // Find the root's first occurrence on the lowest string
  const rootNote = normalizedScale[0];
  const rootIdx = lowFrets.findIndex(f => f.note === rootNote);
  if (rootIdx === -1) return [];

  const startIdx = rootIdx + boxIndex;
  if (startIdx >= lowFrets.length) return [];

  let startFret = lowFrets[startIdx].fret;
  // Wrap high positions to lower octave for playability
  if (startFret > 12) startFret -= 12;

  // For each string, find the best pair of pentatonic notes near startFret
  const positions: FretPosition[] = [];

  for (let s = 0; s < stringCount; s++) {
    const frets: number[] = [];
    for (let f = 0; f <= 22; f++) {
      const note = getNoteAtPosition({ string: s, fret: f }, tuning as any, stringCount);
      const nn = normalizeNoteName(note.replace(/\d+$/, ''));
      if (normalizedScale.includes(nn)) {
        frets.push(f);
      }
    }

    let bestPair: number[] = [];
    let bestScore = Infinity;

    // Strict window: first note within [startFret-1, startFret], last within [_, startFret+4]
    for (let i = 0; i < frets.length - 1; i++) {
      const pair = [frets[i], frets[i + 1]];
      if (pair[0] >= startFret - 1 && pair[1] <= startFret + 4) {
        const score = Math.abs(pair[0] - startFret);
        if (score < bestScore) {
          bestScore = score;
          bestPair = pair;
        }
      }
    }

    // Fallback: any playable pair closest to the target region
    if (bestPair.length === 0) {
      for (let i = 0; i < frets.length - 1; i++) {
        const pair = [frets[i], frets[i + 1]];
        if (pair[1] - pair[0] <= 5) {
          const center = (pair[0] + pair[1]) / 2;
          const score = Math.abs(center - (startFret + 1.5));
          if (score < bestScore) {
            bestScore = score;
            bestPair = pair;
          }
        }
      }
    }

    bestPair.forEach(f => positions.push({ string: s, fret: f }));
  }

  return positions;
}

/**
 * Get the 2 "extension" note positions that complete a 7-note mode
 * from the pentatonic, within the current box's fret range.
 */
function getExtensionPositions(
  pentatonicPositions: FretPosition[],
  key: string,
  scaleType: ScaleType,
  tuning: { notes: string[] },
  stringCount: number,
): FretPosition[] {
  if (pentatonicPositions.length === 0) return [];

  const pentName = scaleType === 'minor' ? 'minor pentatonic' : 'major pentatonic';
  const fullName = scaleType === 'minor' ? 'aeolian' : 'major';

  const pentNotes = getScaleNotes(key, pentName).map(n => normalizeNoteName(n));
  const fullNotes = getScaleNotes(key, fullName).map(n => normalizeNoteName(n));
  const extensionNotes = fullNotes.filter(n => !pentNotes.includes(n));

  if (extensionNotes.length === 0) return [];

  const frets = pentatonicPositions.map(p => p.fret);
  const minFret = Math.min(...frets);
  const maxFret = Math.max(...frets);

  const positions: FretPosition[] = [];
  for (let s = 0; s < stringCount; s++) {
    for (let f = Math.max(0, minFret - 1); f <= maxFret + 1; f++) {
      const note = getNoteAtPosition({ string: s, fret: f }, tuning as any, stringCount);
      const nn = normalizeNoteName(note.replace(/\d+$/, ''));
      if (extensionNotes.includes(nn)) {
        positions.push({ string: s, fret: f });
      }
    }
  }

  return positions;
}

const PentatonicExercise: React.FC<PentatonicExerciseProps> = ({ exercise }) => {
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

  const [selectedKey, setSelectedKey] = useState('A');
  const [scaleType, setScaleType] = useState<ScaleType>('minor');
  const [selectedBox, setSelectedBox] = useState(0);
  const [showFullScale, setShowFullScale] = useState(false);
  const [isPlayingScale, setIsPlayingScale] = useState(false);

  // Set defaults based on exercise ID
  useEffect(() => {
    if (exercise.id === 'pentatonic-1') {
      setScaleType('minor');
      setSelectedBox(0);
      setShowFullScale(false);
      setSelectedKey('A');
    } else if (exercise.id === 'pentatonic-2') {
      setScaleType('minor');
      setSelectedBox(0);
      setShowFullScale(false);
      setSelectedKey('A');
    } else if (exercise.id === 'pentatonic-3') {
      setScaleType('major');
      setSelectedBox(0);
      setShowFullScale(false);
      setSelectedKey('C');
    } else if (exercise.id === 'pentatonic-4') {
      setScaleType('minor');
      setSelectedBox(0);
      setShowFullScale(true);
      setSelectedKey('A');
    }
  }, [exercise.id]);

  // Mode info for the current box
  const modeIndices = scaleType === 'minor' ? MINOR_PENT_MODE_INDICES : MAJOR_PENT_MODE_INDICES;
  const degreeLabels = scaleType === 'minor' ? MINOR_PENT_DEGREES : MAJOR_PENT_DEGREES;
  const currentModeName = MODE_NAMES[modeIndices[selectedBox]];
  const currentDegreeLabel = degreeLabels[selectedBox];

  // The 2 note names that complete the full mode
  const extensionNoteNames = useCallback((): string[] => {
    const pentName = scaleType === 'minor' ? 'minor pentatonic' : 'major pentatonic';
    const fullName = scaleType === 'minor' ? 'aeolian' : 'major';
    const pentNotes = getScaleNotes(selectedKey, pentName).map(n => normalizeNoteName(n));
    const fullNotes = getScaleNotes(selectedKey, fullName).map(n => normalizeNoteName(n));
    return fullNotes.filter(n => !pentNotes.includes(n));
  }, [selectedKey, scaleType]);

  // Starting note for the current box
  const boxStartNoteName = useCallback((): string => {
    const pentName = scaleType === 'minor' ? 'minor pentatonic' : 'major pentatonic';
    const scaleNotes = getScaleNotes(selectedKey, pentName);
    return selectedBox < scaleNotes.length ? scaleNotes[selectedBox] : selectedKey;
  }, [selectedKey, scaleType, selectedBox]);

  // Update fretboard highlights
  const updateFretboard = useCallback(() => {
    if (!isActive) return;

    const pentPositions = getPentatonicBox(selectedKey, scaleType, selectedBox, tuning, stringCount);
    setHighlightedPositions(pentPositions);
    setRootNote(normalizeNoteName(selectedKey));

    if (showFullScale) {
      const extPositions = getExtensionPositions(pentPositions, selectedKey, scaleType, tuning, stringCount);
      setSecondaryHighlightedPositions(extPositions);
    } else {
      setSecondaryHighlightedPositions([]);
    }
  }, [isActive, selectedKey, scaleType, selectedBox, showFullScale, tuning, stringCount,
      setHighlightedPositions, setSecondaryHighlightedPositions, setRootNote]);

  useEffect(() => { updateFretboard(); }, [updateFretboard]);

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

  const handlePlayScale = async () => {
    if (isPlayingScale) return;
    await initAudio();
    setIsPlayingScale(true);

    const positions = getPentatonicBox(selectedKey, scaleType, selectedBox, tuning, stringCount);
    const sorted = [...positions].sort((a, b) =>
      a.string !== b.string ? a.string - b.string : a.fret - b.fret,
    );

    const noteDelay = 0.25;
    for (let i = 0; i < sorted.length; i++) {
      const note = getNoteAtPosition(sorted[i], tuning, stringCount);
      playNote(note, { duration: 0.4, velocity: 0.7, delay: i * noteDelay });
    }

    setTimeout(() => setIsPlayingScale(false), sorted.length * noteDelay * 1000 + 500);
  };

  if (!isActive) {
    return (
      <div className="text-center py-8">
        <p style={{ color: 'var(--text-secondary)' }} className="mb-4">
          Click "Start Exercise" to explore pentatonic shapes.
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {scaleType === 'minor' ? 'Minor' : 'Major'} pentatonic — the foundation of guitar soloing.
        </p>
      </div>
    );
  }

  const extNames = extensionNoteNames();
  const startNote = boxStartNoteName();

  return (
    <div className="space-y-6">
      {/* Scale Type & Key */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Scale Type
          </label>
          <div className="flex gap-2">
            {(['minor', 'major'] as ScaleType[]).map(type => (
              <button
                key={type}
                onClick={() => setScaleType(type)}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${scaleType === type ? 'btn-primary' : ''}`}
                style={scaleType !== type ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' } : {}}
              >
                {type === 'minor' ? 'Minor' : 'Major'} Pent.
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Key
          </label>
          <select
            value={selectedKey}
            onChange={e => setSelectedKey(e.target.value)}
            className="w-full px-3 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            {KEYS.map(key => (
              <option key={key} value={key}>
                {key} {scaleType === 'minor' ? 'Minor' : 'Major'} Pentatonic
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Shape Selection */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Shape / Box
        </label>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map(box => (
            <button
              key={box}
              onClick={() => setSelectedBox(box)}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${selectedBox === box ? 'btn-primary' : ''}`}
              style={selectedBox !== box ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' } : {}}
            >
              {box + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Shape Info */}
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
        <h4 className="font-medium mb-2" style={{ color: 'var(--accent-primary)' }}>
          Shape {selectedBox + 1} — {selectedKey} {scaleType === 'minor' ? 'Minor' : 'Major'} Pentatonic
        </h4>
        <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <p>
            Starts from the <strong>{currentDegreeLabel}</strong> ({startNote}) on the lowest string
          </p>
          <p>
            Extends to: <strong>{startNote} {currentModeName}</strong> by adding {extNames.join(' and ')}
          </p>
        </div>
      </div>

      {/* Display Options */}
      <div className="flex flex-wrap gap-4 items-center">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showFullScale}
            onChange={e => setShowFullScale(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
            Show Full Scale (+{extNames.join(', ')})
          </span>
        </label>
        <DisplayModeToggle />
      </div>

      {/* Fretboard */}
      <div className="card p-4">
        <Fretboard interactive={true} />
      </div>

      {/* Audio Controls */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={handleToggleDrone} className={isDroneActive ? 'btn-danger' : 'btn-success'}>
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
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <h4 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Practice Tips
        </h4>
        <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: 'var(--text-secondary)' }}>
          <li>Master each shape individually before connecting them</li>
          <li>Practice ascending and descending through the box</li>
          <li>Toggle "Show Full Scale" to see the 2 notes that complete the mode</li>
          <li>Try the same lick in all 5 shapes to build fretboard freedom</li>
          <li>Use the drone to hear how pentatonic notes relate to the root</li>
          {showFullScale && (
            <li>The faded notes ({extNames.join(' and ')}) turn this into {startNote} {currentModeName}</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default PentatonicExercise;
