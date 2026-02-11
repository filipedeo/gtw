import React, { useState, useEffect, useCallback } from 'react';
import { Note } from 'tonal';
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
//
// Minor pentatonic = 1, b3, 4, 5, b7  (degrees 6, 1, 2, 3, 5 of the relative major)
// Each box starts from one of these notes, and when extended to 7 notes it yields:
//   Box 1 (Root) → Aeolian  |  Box 2 (b3) → Ionian  |  Box 3 (4) → Dorian
//   Box 4 (5) → Phrygian    |  Box 5 (b7) → Mixolydian
const MINOR_PENT_MODE_INDICES = [5, 0, 1, 2, 4];

// Major pentatonic = 1, 2, 3, 5, 6  (degrees 1, 2, 3, 5, 6 of the major scale)
//   Box 1 (Root) → Ionian  |  Box 2 (2) → Dorian  |  Box 3 (3) → Phrygian
//   Box 4 (5) → Mixolydian  |  Box 5 (6) → Aeolian
const MAJOR_PENT_MODE_INDICES = [0, 1, 2, 4, 5];

const MINOR_PENT_DEGREES = ['Root', 'b3', '4', '5', 'b7'];
const MAJOR_PENT_DEGREES = ['Root', '2', '3', '5', '6'];

type ScaleType = 'minor' | 'major';

/** Get chroma values (0-11) for a set of note names. */
function chromas(notes: string[]): number[] {
  return notes.map(n => Note.get(n).chroma).filter((c): c is number => c !== undefined);
}

/** Simplify a note name for display — removes double flats/sharps. */
function displayNote(n: string): string {
  return Note.simplify(n) || n;
}

/**
 * Compute pentatonic box positions for a given shape.
 *
 * Uses chroma (pitch-class 0-11) for all note comparison so it handles
 * every enharmonic spelling tonal might produce (including double flats).
 *
 * Algorithm:
 * 1. Scan the lowest string up to fret 22 for pentatonic notes
 * 2. Locate the root and offset by boxIndex to find the box's start fret
 * 3. If the start fret is above 12, wrap to the lower octave
 * 4. For each string, pick the best pair of consecutive pentatonic frets
 *    within a ≤4-fret span near the start fret
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

  const scaleChromas = chromas(scaleNotes);
  const rootChroma = scaleChromas[0];

  // Scan lowest string up to fret 22 for pentatonic notes
  const lowFrets: { fret: number; chroma: number }[] = [];
  for (let f = 0; f <= 22; f++) {
    const note = getNoteAtPosition({ string: 0, fret: f }, tuning as any, stringCount);
    const ch = Note.get(note).chroma;
    if (ch !== undefined && scaleChromas.includes(ch)) {
      lowFrets.push({ fret: f, chroma: ch });
    }
  }

  const rootIdx = lowFrets.findIndex(f => f.chroma === rootChroma);
  if (rootIdx === -1) return [];

  const startIdx = rootIdx + boxIndex;
  if (startIdx >= lowFrets.length) return [];

  let startFret = lowFrets[startIdx].fret;
  if (startFret > 12) startFret -= 12;

  // For each string, find the best pair of pentatonic notes near startFret
  const positions: FretPosition[] = [];

  for (let s = 0; s < stringCount; s++) {
    const frets: number[] = [];
    for (let f = 0; f <= 22; f++) {
      const note = getNoteAtPosition({ string: s, fret: f }, tuning as any, stringCount);
      const ch = Note.get(note).chroma;
      if (ch !== undefined && scaleChromas.includes(ch)) {
        frets.push(f);
      }
    }

    let bestPair: number[] = [];
    let bestScore = Infinity;

    // Strict window: first note ≥ startFret-1, last note ≤ startFret+4
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
 * Get the "extension" note positions that complete a 7-note mode
 * from the pentatonic, within the current box's fret range.
 *
 * Minor pentatonic is missing the 2nd and 6th scale degrees.
 * Major pentatonic is missing the 4th and 7th.
 * Adding them back yields the parent diatonic mode for that box position.
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

  const pentChromas = chromas(getScaleNotes(key, pentName));
  const fullChromas = chromas(getScaleNotes(key, fullName));
  const extensionChromas = fullChromas.filter(c => !pentChromas.includes(c));

  if (extensionChromas.length === 0) return [];

  const frets = pentatonicPositions.map(p => p.fret);
  const minFret = Math.min(...frets);
  const maxFret = Math.max(...frets);

  const positions: FretPosition[] = [];
  for (let s = 0; s < stringCount; s++) {
    for (let f = Math.max(0, minFret - 1); f <= maxFret + 1; f++) {
      const note = getNoteAtPosition({ string: s, fret: f }, tuning as any, stringCount);
      const ch = Note.get(note).chroma;
      if (ch !== undefined && extensionChromas.includes(ch)) {
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

  // The 2 note names that complete the full mode (display-safe)
  const getExtensionNoteNames = useCallback((): string[] => {
    const pentName = scaleType === 'minor' ? 'minor pentatonic' : 'major pentatonic';
    const fullName = scaleType === 'minor' ? 'aeolian' : 'major';
    const pentCh = chromas(getScaleNotes(selectedKey, pentName));
    const fullNotes = getScaleNotes(selectedKey, fullName);
    return fullNotes
      .filter(n => {
        const ch = Note.get(n).chroma;
        return ch !== undefined && !pentCh.includes(ch);
      })
      .map(displayNote);
  }, [selectedKey, scaleType]);

  // Starting note name for the current box (display-safe)
  const getBoxStartNote = useCallback((): string => {
    const pentName = scaleType === 'minor' ? 'minor pentatonic' : 'major pentatonic';
    const scaleNotes = getScaleNotes(selectedKey, pentName);
    if (selectedBox < scaleNotes.length) {
      return displayNote(scaleNotes[selectedBox]);
    }
    return selectedKey;
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

  const extNames = getExtensionNoteNames();
  const startNote = getBoxStartNote();

  return (
    <div className="space-y-6">
      {/* Scale Type & Key */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          {scaleType === 'minor' && (
            <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
              Minor pentatonic = 1 b3 4 5 b7 — missing the 2nd and 6th degrees
            </p>
          )}
          {scaleType === 'major' && (
            <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
              Major pentatonic = 1 2 3 5 6 — missing the 4th and 7th degrees
            </p>
          )}
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
          <li>Look for the "rectangle" — two adjacent strings where the minor 3rd intervals sit; the 2 extension notes always land here</li>
          <li>Toggle "Show Full Scale" to see how adding 2 notes turns the pentatonic into a full mode</li>
          <li>Try the same lick in all 5 shapes to build fretboard freedom</li>
          <li>Each box connects to the next — the top notes of one box overlap with the bottom of the next</li>
          <li>Use the drone to hear how pentatonic notes relate to the root</li>
          {showFullScale && (
            <li>The faded notes ({extNames.join(' and ')}) turn this shape into {startNote} {currentModeName}</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default PentatonicExercise;
