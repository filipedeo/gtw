import React, { useState, useEffect, useCallback } from 'react';
import { Note } from 'tonal';
import { Exercise } from '../types/exercise';
import { FretPosition, Tuning, normalizeNoteName } from '../types/guitar';
import { useGuitarStore } from '../stores/guitarStore';
import { useAudioStore } from '../stores/audioStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { getScaleNotes } from '../lib/theoryEngine';
import { getNoteAtPosition } from '../utils/fretboardCalculations';
import { startDrone, stopDrone, playNote, initAudio } from '../lib/audioEngine';
import Fretboard from './Fretboard';
import DisplayModeToggle from './DisplayModeToggle';
import PracticeRating from './PracticeRating';

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

const MINOR_COMPATIBLE_MODES = [
  { name: 'aeolian', displayName: 'Aeolian (Natural Minor)' },
  { name: 'dorian', displayName: 'Dorian' },
  { name: 'phrygian', displayName: 'Phrygian' },
];
const MAJOR_COMPATIBLE_MODES = [
  { name: 'major', displayName: 'Ionian (Major)' },
  { name: 'lydian', displayName: 'Lydian' },
  { name: 'mixolydian', displayName: 'Mixolydian' },
];
// Scales that extend from minor pentatonic but may replace notes (not pure subsets)
const MINOR_EXTENDED_SCALES = [
  { name: 'blues', displayName: 'Blues Scale' },
  { name: 'harmonic minor', displayName: 'Harmonic Minor' },
  { name: 'melodic minor', displayName: 'Melodic Minor (Jazz Minor)' },
];

/** Get chroma values (0-11) for a set of note names. */
function chromas(notes: string[]): number[] {
  return notes.map(n => Note.get(n).chroma).filter((c): c is number => c !== undefined);
}

/** Simplify a note name for display — removes double flats/sharps. */
function displayNote(n: string): string {
  return Note.simplify(n) || n;
}

/**
 * Find pentatonic chromas that are NOT in the target scale.
 * Non-empty result means the pentatonic is not a clean subset of the target
 * (e.g., minor pent has b7 but harmonic minor has natural 7).
 */
function getConflictChromas(key: string, scaleType: ScaleType, targetMode: string): number[] {
  const pentName = scaleType === 'minor' ? 'minor pentatonic' : 'major pentatonic';
  const pentCh = chromas(getScaleNotes(key, pentName));
  const targetCh = chromas(getScaleNotes(key, targetMode));
  return pentCh.filter(c => !targetCh.includes(c));
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
export function getPentatonicBox(
  key: string,
  scaleType: ScaleType,
  boxIndex: number,
  tuning: Tuning,
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
    const note = getNoteAtPosition({ string: 0, fret: f }, tuning, stringCount);
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
      const note = getNoteAtPosition({ string: s, fret: f }, tuning, stringCount);
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
  tuning: Tuning,
  stringCount: number,
  targetMode?: string,
): FretPosition[] {
  if (pentatonicPositions.length === 0) return [];

  const pentName = scaleType === 'minor' ? 'minor pentatonic' : 'major pentatonic';
  const fullName = targetMode || (scaleType === 'minor' ? 'aeolian' : 'major');

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
      const note = getNoteAtPosition({ string: s, fret: f }, tuning, stringCount);
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

  const lowestString = stringCount <= 4 ? '4th' : stringCount === 5 ? '5th' : '6th';
  const isBass = instrument === 'bass';

  const [selectedKey, setSelectedKey] = useState('A');
  const [scaleType, setScaleType] = useState<ScaleType>('minor');
  const [selectedBox, setSelectedBox] = useState(0);
  const [showFullScale, setShowFullScale] = useState(false);
  const [showAllShapes, setShowAllShapes] = useState(false);
  const [isPlayingScale, setIsPlayingScale] = useState(false);
  const [selectedTargetMode, setSelectedTargetMode] = useState<string | null>(null);

  // Set defaults based on exercise ID
  useEffect(() => {
    const id = exercise.id;
    // Minor shapes
    if (id === 'pentatonic-1') { setScaleType('minor'); setSelectedBox(0); setShowFullScale(false); setSelectedKey('A'); }
    else if (id === 'pentatonic-minor-2') { setScaleType('minor'); setSelectedBox(1); setShowFullScale(false); setSelectedKey('A'); }
    else if (id === 'pentatonic-minor-3') { setScaleType('minor'); setSelectedBox(2); setShowFullScale(false); setSelectedKey('A'); }
    else if (id === 'pentatonic-minor-4') { setScaleType('minor'); setSelectedBox(3); setShowFullScale(false); setSelectedKey('A'); }
    else if (id === 'pentatonic-minor-5') { setScaleType('minor'); setSelectedBox(4); setShowFullScale(false); setSelectedKey('A'); }
    // Major shapes
    else if (id === 'pentatonic-major-1') { setScaleType('major'); setSelectedBox(0); setShowFullScale(false); setSelectedKey('C'); }
    else if (id === 'pentatonic-major-2') { setScaleType('major'); setSelectedBox(1); setShowFullScale(false); setSelectedKey('C'); }
    else if (id === 'pentatonic-major-3') { setScaleType('major'); setSelectedBox(2); setShowFullScale(false); setSelectedKey('C'); }
    else if (id === 'pentatonic-major-4') { setScaleType('major'); setSelectedBox(3); setShowFullScale(false); setSelectedKey('C'); }
    else if (id === 'pentatonic-major-5') { setScaleType('major'); setSelectedBox(4); setShowFullScale(false); setSelectedKey('C'); }
    // Pentatonic to modes
    else if (id === 'pentatonic-4') { setScaleType('minor'); setSelectedBox(0); setShowFullScale(true); setSelectedKey('A'); }
    // Mode across all shapes
    else if (id === 'pentatonic-5') { setScaleType('minor'); setSelectedBox(0); setShowFullScale(true); setSelectedKey('A'); setSelectedTargetMode('aeolian'); }
  }, [exercise.id]);

  // Auto-switch scaleType when selectedTargetMode changes (pentatonic-5 only)
  useEffect(() => {
    if (exercise.id !== 'pentatonic-5' || !selectedTargetMode) return;
    if (MINOR_COMPATIBLE_MODES.some(m => m.name === selectedTargetMode) ||
        MINOR_EXTENDED_SCALES.some(m => m.name === selectedTargetMode)) {
      setScaleType('minor');
    } else if (MAJOR_COMPATIBLE_MODES.some(m => m.name === selectedTargetMode)) {
      setScaleType('major');
    }
  }, [selectedTargetMode, exercise.id]);

  // Mode info for the current box
  const modeIndices = scaleType === 'minor' ? MINOR_PENT_MODE_INDICES : MAJOR_PENT_MODE_INDICES;
  const degreeLabels = scaleType === 'minor' ? MINOR_PENT_DEGREES : MAJOR_PENT_DEGREES;
  const currentModeName = MODE_NAMES[modeIndices[selectedBox]];
  const currentDegreeLabel = degreeLabels[selectedBox];

  // The 2 note names that complete the full mode (display-safe)
  const getExtensionNoteNames = useCallback((targetMode?: string): string[] => {
    const pentName = scaleType === 'minor' ? 'minor pentatonic' : 'major pentatonic';
    const fullName = targetMode || (scaleType === 'minor' ? 'aeolian' : 'major');
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
    setRootNote(normalizeNoteName(selectedKey));

    if (showAllShapes) {
      // Collect all boxes: current box = primary, other 4 = secondary
      const allPositions: FretPosition[] = [];
      const currentBoxPositions: FretPosition[] = [];
      for (let box = 0; box < 5; box++) {
        const boxPositions = getPentatonicBox(selectedKey, scaleType, box, tuning, stringCount);
        if (box === selectedBox) {
          currentBoxPositions.push(...boxPositions);
        } else {
          allPositions.push(...boxPositions);
        }
      }
      setHighlightedPositions(currentBoxPositions);
      setSecondaryHighlightedPositions(allPositions);
    } else if (showFullScale) {
      const targetMode = exercise.id === 'pentatonic-5' ? (selectedTargetMode || undefined) : undefined;

      // Filter out pentatonic notes that conflict with the target scale
      // (e.g., minor pent has b7 but harmonic minor has natural 7)
      if (targetMode) {
        const conflicts = getConflictChromas(selectedKey, scaleType, targetMode);
        if (conflicts.length > 0) {
          const filteredPent = pentPositions.filter(pos => {
            const note = getNoteAtPosition(pos, tuning, stringCount);
            const ch = Note.get(note).chroma;
            return ch === undefined || !conflicts.includes(ch);
          });
          setHighlightedPositions(filteredPent);
        } else {
          setHighlightedPositions(pentPositions);
        }
      } else {
        setHighlightedPositions(pentPositions);
      }

      const extPositions = getExtensionPositions(pentPositions, selectedKey, scaleType, tuning, stringCount, targetMode);
      setSecondaryHighlightedPositions(extPositions);
    } else {
      setHighlightedPositions(pentPositions);
      setSecondaryHighlightedPositions([]);
    }
  }, [isActive, selectedKey, scaleType, selectedBox, showFullScale, showAllShapes, tuning, stringCount,
      selectedTargetMode, exercise.id,
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

  // Pentatonic note names that don't belong in the target scale (e.g., b7 for harmonic minor)
  const getConflictNoteNames = useCallback((targetMode?: string): string[] => {
    if (!targetMode) return [];
    const pentName = scaleType === 'minor' ? 'minor pentatonic' : 'major pentatonic';
    const pentNotes = getScaleNotes(selectedKey, pentName);
    const targetCh = chromas(getScaleNotes(selectedKey, targetMode));
    return pentNotes
      .filter(n => {
        const ch = Note.get(n).chroma;
        return ch !== undefined && !targetCh.includes(ch);
      })
      .map(displayNote);
  }, [selectedKey, scaleType]);

  const extNames = getExtensionNoteNames(exercise.id === 'pentatonic-5' ? (selectedTargetMode || undefined) : undefined);
  const conflictNames = getConflictNoteNames(exercise.id === 'pentatonic-5' ? (selectedTargetMode || undefined) : undefined);
  const startNote = getBoxStartNote();

  const isModeCentric = exercise.id === 'pentatonic-5';
  const allModes = [...MINOR_COMPATIBLE_MODES, ...MAJOR_COMPATIBLE_MODES, ...MINOR_EXTENDED_SCALES];
  const selectedModeDisplayName = allModes.find(m => m.name === selectedTargetMode)?.displayName ?? selectedTargetMode ?? '';

  return (
    <div className="space-y-6">
      {/* Mode Selector (pentatonic-5 only) */}
      {isModeCentric && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Target Mode
            </label>
            <select
              value={selectedTargetMode || ''}
              onChange={e => setSelectedTargetMode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              <optgroup label="Minor Modes (from minor pentatonic)">
                {MINOR_COMPATIBLE_MODES.map(m => (
                  <option key={m.name} value={m.name}>{m.displayName}</option>
                ))}
              </optgroup>
              <optgroup label="Major Modes (from major pentatonic)">
                {MAJOR_COMPATIBLE_MODES.map(m => (
                  <option key={m.name} value={m.name}>{m.displayName}</option>
                ))}
              </optgroup>
              <optgroup label="Other Scales (from minor pentatonic)">
                {MINOR_EXTENDED_SCALES.map(m => (
                  <option key={m.name} value={m.name}>{m.displayName}</option>
                ))}
              </optgroup>
            </select>
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
                  {key} {selectedModeDisplayName}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Scale Type & Key (non-pentatonic-5) */}
      {!isModeCentric && (
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
      )}

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
          {isModeCentric
            ? `Shape ${selectedBox + 1} — ${selectedKey} ${selectedModeDisplayName}`
            : `Shape ${selectedBox + 1} — ${selectedKey} ${scaleType === 'minor' ? 'Minor' : 'Major'} Pentatonic`}
        </h4>
        <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <p>
            Starts from the <strong>{currentDegreeLabel}</strong> ({startNote}) on the lowest string
          </p>
          {isModeCentric ? (
            <p>
              {scaleType === 'minor' ? 'Minor' : 'Major'} pentatonic + <strong>{extNames.join(', ')}</strong>
              {conflictNames.length > 0 && <>, replacing <strong>{conflictNames.join(', ')}</strong></>}
              {' '}= {selectedKey} {selectedModeDisplayName}
            </p>
          ) : (
            <p>
              Extends to: <strong>{startNote} {currentModeName}</strong> by adding {extNames.join(' and ')}
            </p>
          )}
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

      {/* Extension Notes Info (pentatonic-5 only) */}
      {isModeCentric && extNames.length > 0 && (
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--accent-primary)' }}>
          <h4 className="font-medium mb-2" style={{ color: 'var(--accent-primary)' }}>
            Extension Notes for {selectedKey} {selectedModeDisplayName}
          </h4>
          <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
            <p>
              {extNames.length} note{extNames.length !== 1 ? 's' : ''} that distinguish {selectedModeDisplayName} from the {scaleType} pentatonic: <strong>{extNames.join(', ')}</strong>
            </p>
            {conflictNames.length > 0 && (
              <p>
                The pentatonic&apos;s <strong>{conflictNames.join(', ')}</strong> {conflictNames.length === 1 ? 'is' : 'are'} not part of {selectedModeDisplayName} and {conflictNames.length === 1 ? 'is' : 'are'} hidden from the display.
              </p>
            )}
            <p>
              These are the same pitch classes in every shape — only their fretboard positions change as you move across shapes.
            </p>
          </div>
        </div>
      )}

      {/* Shape → Mode Reference (pentatonic-4 only) */}
      {exercise.id === 'pentatonic-4' && (
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--accent-primary)' }}>
          <h4 className="font-medium mb-3" style={{ color: 'var(--accent-primary)' }}>
            Shape → Mode Reference
          </h4>
          <div className="grid grid-cols-1 gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {[0, 1, 2, 3, 4].map(box => {
              const modeName = MODE_NAMES[modeIndices[box]];
              const degreeLabel = degreeLabels[box];
              const isSelected = selectedBox === box;
              return (
                <button
                  key={box}
                  onClick={() => setSelectedBox(box)}
                  className="text-left p-2 rounded transition-all"
                  style={{
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: isSelected ? 'bold' : 'normal',
                  }}
                >
                  Shape {box + 1} ({degreeLabel}) → {modeName}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Display Options */}
      <div className="flex flex-wrap gap-4 items-center">
        {!isModeCentric && !showAllShapes && (
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
        )}
        {!isModeCentric && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showAllShapes}
              onChange={e => {
                setShowAllShapes(e.target.checked);
                if (e.target.checked) setShowFullScale(false);
              }}
              className="rounded"
            />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              Show All Shapes
            </span>
          </label>
        )}
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
          {isModeCentric ? (
            <>
              <li>Cycle through all 5 shapes to see how {extNames.join(', ')} appear in different positions</li>
              <li>The extension notes are always the same pitch classes — notice how their fretboard locations shift per shape</li>
              {conflictNames.length > 0 && (
                <li>The pentatonic&apos;s {conflictNames.join(', ')} {conflictNames.length === 1 ? 'is' : 'are'} replaced in {selectedModeDisplayName} — practice hearing the difference</li>
              )}
              <li>Try switching between scales (e.g., Dorian vs Harmonic Minor) to see which notes change</li>
              <li>Use the drone to hear the color of {selectedModeDisplayName} over the root</li>
              <li>Each box connects to the next — the top notes of one box overlap with the bottom of the next</li>
              <li>Practice improvising in each shape using the pentatonic backbone + the extension notes</li>
            </>
          ) : (
            <>
              <li>Master each shape individually before connecting them</li>
              <li>Start on the {lowestString} string and play ascending, then descend back down</li>
              <li>Look for the "rectangle" — two adjacent strings where the minor 3rd intervals sit; the 2 extension notes always land here</li>
              <li>Toggle "Show Full Scale" to see how adding 2 notes turns the pentatonic into a full mode</li>
              <li>{isBass ? 'Practice alternating fingers (index-middle) for consistent tone' : 'Practice alternate picking — down-up-down-up through the shape'}</li>
              <li>Try the same lick in all 5 shapes to build fretboard freedom</li>
              <li>Each box connects to the next — the top notes of one box overlap with the bottom of the next</li>
              <li>Use the drone to hear how pentatonic notes relate to the root</li>
              {showFullScale && (
                <li>The faded notes ({extNames.join(' and ')}) turn this shape into {startNote} {currentModeName}</li>
              )}
            </>
          )}
        </ul>
      </div>

      {/* Self-Assessment */}
      <PracticeRating exerciseId={exercise.id} exerciseType={exercise.type} />
    </div>
  );
};

export default PentatonicExercise;
