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

/** Chord type (quality of the third) */
type ChordType = 'major' | 'minor' | 'dominant' | 'diminished' | 'augmented' | 'sus2' | 'sus4';

/** Chord extension level */
type ChordExtension = 'triad' | '7' | '9' | '11' | '13' | '6' | 'add9';

/** Represents a single playable arpeggio shape */
type ArpeggioShape = {
  positions: FretPosition[];
  startingString: number;
  minFret: number;
  maxFret: number;
  fretSpan: number;
};

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Position labels for grouping arpeggio shapes by fret region */
const POSITION_LABELS = [
  { label: 'Open/1st', minFret: 0, maxFret: 4 },
  { label: '5th Position', minFret: 5, maxFret: 8 },
  { label: '9th Position', minFret: 9, maxFret: 12 },
  { label: '12th Position', minFret: 12, maxFret: 16 },
  { label: 'Upper Frets', minFret: 17, maxFret: 24 },
];

/** Chord type options for the UI */
const CHORD_TYPE_OPTIONS: { value: ChordType; label: string; shortLabel: string }[] = [
  { value: 'major', label: 'Major', shortLabel: 'Maj' },
  { value: 'minor', label: 'Minor', shortLabel: 'Min' },
  { value: 'dominant', label: 'Dominant', shortLabel: 'Dom' },
  { value: 'diminished', label: 'Diminished', shortLabel: 'Dim' },
  { value: 'augmented', label: 'Augmented', shortLabel: 'Aug' },
  { value: 'sus2', label: 'Suspended 2', shortLabel: 'Sus2' },
  { value: 'sus4', label: 'Suspended 4', shortLabel: 'Sus4' },
];

/** Extension options for the UI */
const EXTENSION_OPTIONS: { value: ChordExtension; label: string }[] = [
  { value: 'triad', label: 'Triad' },
  { value: '6', label: '6th' },
  { value: '7', label: '7th' },
  { value: 'add9', label: 'add9' },
  { value: '9', label: '9th' },
  { value: '11', label: '11th' },
  { value: '13', label: '13th' },
];

/** Map exercise IDs to chord type and extension */
const EXERCISE_CHORD_MAP: Record<string, { type: ChordType; extension: ChordExtension }> = {
  'bass-arp-1': { type: 'major', extension: '7' },
  'bass-arp-2': { type: 'minor', extension: '7' },
  'bass-arp-3': { type: 'dominant', extension: '7' },
  'bass-arp-4': { type: 'minor', extension: '7' },
  'guitar-arp-1': { type: 'major', extension: '7' },
  'guitar-arp-2': { type: 'minor', extension: '7' },
  'guitar-arp-3': { type: 'dominant', extension: '7' },
  'guitar-arp-4': { type: 'diminished', extension: '7' },
  'guitar-arp-5': { type: 'augmented', extension: 'triad' },
  'guitar-arp-6': { type: 'minor', extension: '7' }, // m7b5 is handled specially
};

/** Get valid extensions for each chord type */
function getValidExtensions(chordType: ChordType): ChordExtension[] {
  switch (chordType) {
    case 'major':
      return ['triad', '6', '7', 'add9', '9', '11', '13'];
    case 'minor':
      return ['triad', '6', '7', 'add9', '9', '11', '13'];
    case 'dominant':
      return ['7', '9', '11', '13']; // Dominant implies 7th
    case 'diminished':
      return ['triad', '7']; // dim7 is the common extended form
    case 'augmented':
      return ['triad', '7']; // aug7 exists but less common
    case 'sus2':
      return ['triad', '7', 'add9'];
    case 'sus4':
      return ['triad', '7'];
    default:
      return ['triad', '7'];
  }
}

/** Build the Tonal chord symbol from type and extension */
function buildChordSymbol(chordType: ChordType, extension: ChordExtension): string {
  // Handle special cases and build proper Tonal symbols
  switch (chordType) {
    case 'major':
      switch (extension) {
        case 'triad': return ''; // Just the root = major triad
        case '6': return '6';
        case '7': return 'maj7';
        case 'add9': return 'add9';
        case '9': return 'maj9';
        case '11': return 'maj11';
        case '13': return 'maj13';
        default: return 'maj7';
      }
    case 'minor':
      switch (extension) {
        case 'triad': return 'm';
        case '6': return 'm6';
        case '7': return 'm7';
        case 'add9': return 'madd9';
        case '9': return 'm9';
        case '11': return 'm11';
        case '13': return 'm13';
        default: return 'm7';
      }
    case 'dominant':
      switch (extension) {
        case '7': return '7';
        case '9': return '9';
        case '11': return '11';
        case '13': return '13';
        default: return '7';
      }
    case 'diminished':
      switch (extension) {
        case 'triad': return 'dim';
        case '7': return 'dim7';
        default: return 'dim7';
      }
    case 'augmented':
      switch (extension) {
        case 'triad': return 'aug';
        case '7': return 'aug7';
        default: return 'aug';
      }
    case 'sus2':
      switch (extension) {
        case 'triad': return 'sus2';
        case '7': return '7sus2';
        case 'add9': return 'sus2';
        default: return 'sus2';
      }
    case 'sus4':
      switch (extension) {
        case 'triad': return 'sus4';
        case '7': return '7sus4';
        default: return 'sus4';
      }
    default:
      return '';
  }
}

/** Human-readable chord tone labels based on chord type and extension */
function getChordToneLabels(chordType: ChordType, extension: ChordExtension): string[] {
  const labels: string[] = ['Root'];
  
  // Add 2nd/3rd based on type
  if (chordType === 'sus2') {
    labels.push('Major 2nd');
  } else if (chordType === 'sus4') {
    labels.push('Perfect 4th');
  } else if (chordType === 'minor' || chordType === 'diminished') {
    labels.push('Minor 3rd');
  } else {
    labels.push('Major 3rd');
  }
  
  // Add 5th based on type
  if (chordType === 'diminished') {
    labels.push('Diminished 5th');
  } else if (chordType === 'augmented') {
    labels.push('Augmented 5th');
  } else {
    labels.push('Perfect 5th');
  }
  
  // Add extensions
  if (extension === '6') {
    labels.push('Major 6th');
  } else if (extension === 'add9') {
    labels.push('Major 9th');
  } else if (extension === '7' || extension === '9' || extension === '11' || extension === '13') {
    // Add 7th
    if (chordType === 'major') {
      labels.push('Major 7th');
    } else if (chordType === 'diminished') {
      labels.push('Diminished 7th');
    } else {
      labels.push('Minor 7th');
    }
    
    // Add 9th if applicable
    if (extension === '9' || extension === '11' || extension === '13') {
      labels.push('Major 9th');
    }
    
    // Add 11th if applicable
    if (extension === '11' || extension === '13') {
      labels.push('Perfect 11th');
    }
    
    // Add 13th if applicable
    if (extension === '13') {
      labels.push('Major 13th');
    }
  }
  
  return labels;
}

/**
 * Compute ALL playable arpeggio paths: one position per chord tone on
 * consecutive strings, forming sweep-pickable shapes.
 * Returns an array of ArpeggioShape objects, each representing a unique
 * fingering pattern at a different position on the neck.
 */
function getAllArpeggioShapes(
  chordNotes: string[],
  tuning: Tuning,
  stringCount: number,
  maxFret: number
): ArpeggioShape[] {
  const notePositions = chordNotes.map(note =>
    getPositionsForNote(note, tuning, stringCount, maxFret)
  );

  const shapes: ArpeggioShape[] = [];
  const seenPaths = new Set<string>(); // Deduplicate identical paths

  // Try each possible starting string (need room for all notes on consecutive strings)
  for (let startStr = 0; startStr <= stringCount - chordNotes.length; startStr++) {
    // For each chord tone, get candidate positions on its target string
    const candidates = chordNotes.map((_, i) =>
      notePositions[i].filter(p => p.string === startStr + i)
    );

    // Skip if any note has no position on its target string
    if (candidates.some(c => c.length === 0)) continue;

    // Generate all possible combinations of positions (one per chord tone)
    // Using a recursive approach to build all valid paths
    function buildPaths(noteIndex: number, currentPath: FretPosition[]): void {
      if (noteIndex === candidates.length) {
        // Complete path found - check if it's playable (reasonable fret span)
        const frets = currentPath.map(p => p.fret);
        const minFret = Math.min(...frets);
        const maxFretInPath = Math.max(...frets);
        const span = maxFretInPath - minFret;
        
        // Only include shapes with reasonable fret span (max 5 frets for comfortable playing)
        if (span <= 5) {
          const pathKey = currentPath.map(p => `${p.string}-${p.fret}`).join('|');
          if (!seenPaths.has(pathKey)) {
            seenPaths.add(pathKey);
            shapes.push({
              positions: [...currentPath],
              startingString: startStr,
              minFret,
              maxFret: maxFretInPath,
              fretSpan: span,
            });
          }
        }
        return;
      }

      // Try each candidate position for this chord tone
      for (const pos of candidates[noteIndex]) {
        // If we have a previous position, check fret proximity (within 5 frets of first note)
        if (currentPath.length > 0) {
          const firstFret = currentPath[0].fret;
          if (Math.abs(pos.fret - firstFret) > 5) continue;
        }
        currentPath.push(pos);
        buildPaths(noteIndex + 1, currentPath);
        currentPath.pop();
      }
    }

    buildPaths(0, []);
  }

  // Sort shapes by position (lowest fret first), then by starting string
  shapes.sort((a, b) => {
    if (a.minFret !== b.minFret) return a.minFret - b.minFret;
    return a.startingString - b.startingString;
  });

  return shapes;
}

/**
 * Get the position label for a given fret number
 */
function getPositionLabel(minFret: number): string {
  const position = POSITION_LABELS.find(p => minFret >= p.minFret && minFret <= p.maxFret);
  return position?.label || `Fret ${minFret}`;
}

/**
 * Group arpeggio shapes by position region and string set
 */
function groupShapesByPosition(shapes: ArpeggioShape[]): Map<string, ArpeggioShape[]> {
  const groups = new Map<string, ArpeggioShape[]>();
  
  for (const shape of shapes) {
    const posLabel = getPositionLabel(shape.minFret);
    const key = `${posLabel}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(shape);
  }
  
  return groups;
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
  const [selectedChordType, setSelectedChordType] = useState<ChordType>('major');
  const [selectedExtension, setSelectedExtension] = useState<ChordExtension>('7');
  const [showAllPositions, setShowAllPositions] = useState(true);
  const [isPlayingArpeggio, setIsPlayingArpeggio] = useState(false);
  const [activeNoteIndex, setActiveNoteIndex] = useState(-1); // index into chordNotes during playback
  const [selectedShapeIndex, setSelectedShapeIndex] = useState(0); // which shape to display
  const [selectedPositionGroup, setSelectedPositionGroup] = useState<string>(''); // position filter
  const playbackTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Get valid extensions for current chord type
  const validExtensions = useMemo(() => getValidExtensions(selectedChordType), [selectedChordType]);

  // Ensure selected extension is valid for current chord type
  useEffect(() => {
    if (!validExtensions.includes(selectedExtension)) {
      setSelectedExtension(validExtensions[0]);
    }
  }, [selectedChordType, validExtensions, selectedExtension]);

  // Set initial chord type/extension based on exercise ID
  useEffect(() => {
    const chordConfig = EXERCISE_CHORD_MAP[exercise.id];
    if (chordConfig) {
      setSelectedChordType(chordConfig.type);
      setSelectedExtension(chordConfig.extension);
    }
  }, [exercise.id]);

  // Build the chord symbol for Tonal library
  const chordSymbol = useMemo(() => 
    buildChordSymbol(selectedChordType, selectedExtension), 
    [selectedChordType, selectedExtension]
  );

  const maxFret = showAllPositions ? fretCount : 12;

  // Compute ALL playable arpeggio shapes
  const allShapes = useMemo(() => {
    const chordName = `${selectedKey}${chordSymbol}`;
    const notes = getChordNotes(chordName);
    if (!notes || notes.length === 0) return [];
    const normalizedNotes = notes.map(n => normalizeNoteName(n));
    return getAllArpeggioShapes(normalizedNotes, tuning, stringCount, maxFret);
  }, [selectedKey, chordSymbol, tuning, stringCount, maxFret]);

  // Group shapes by position for the UI
  const shapeGroups = useMemo(() => {
    return groupShapesByPosition(allShapes);
  }, [allShapes]);

  // Get available position groups
  const availablePositions = useMemo(() => {
    return Array.from(shapeGroups.keys());
  }, [shapeGroups]);

  // Filter shapes by selected position group
  const filteredShapes = useMemo(() => {
    if (!selectedPositionGroup || selectedPositionGroup === 'all') {
      return allShapes;
    }
    return shapeGroups.get(selectedPositionGroup) || [];
  }, [allShapes, shapeGroups, selectedPositionGroup]);

  // Get current shape (with bounds checking)
  const currentShapeIndex = Math.min(selectedShapeIndex, Math.max(0, filteredShapes.length - 1));
  const currentShape = filteredShapes[currentShapeIndex];
  
  // Legacy compatibility: arpeggioPath is the positions of current shape
  const arpeggioPath = currentShape?.positions || [];

  // Reset shape index when key/quality/position changes
  useEffect(() => {
    setSelectedShapeIndex(0);
  }, [selectedKey, chordSymbol, selectedPositionGroup]);

  // Update fretboard when key/quality changes or during playback animation
  const updateHighlights = useCallback(() => {
    if (!isActive) return;

    try {
      const chordName = `${selectedKey}${chordSymbol}`;
      const notes = getChordNotes(chordName);

      if (notes && notes.length > 0) {
        const normalizedNotes = notes.map(n => normalizeNoteName(n));
        const normalizedRoot = normalizeNoteName(selectedKey);
        setRootNote(normalizedRoot);

        if (activeNoteIndex >= 0 && activeNoteIndex < arpeggioPath.length) {
          // During playback: highlight single position of active note, rest of path as secondary
          const activePos = arpeggioPath[activeNoteIndex];
          const otherPathPositions = arpeggioPath.filter((_, i: number) => i !== activeNoteIndex);
          setHighlightedPositions([activePos]);
          setSecondaryHighlightedPositions(otherPathPositions);
        } else if (currentShape) {
          // Show selected shape: root positions as secondary, other chord tones as primary
          const rootPositionsInShape = currentShape.positions.filter((_, i: number) => {
            // First position (index 0) is root in a standard arpeggio
            return i === 0;
          });
          const nonRootPositionsInShape = currentShape.positions.filter((_, i: number) => i !== 0);
          
          setHighlightedPositions(nonRootPositionsInShape);
          setSecondaryHighlightedPositions(rootPositionsInShape);
        } else {
          // Fallback: all arpeggio positions — root = secondary, non-root = primary
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
    selectedKey, chordSymbol, showAllPositions, isActive, activeNoteIndex,
    stringCount, tuning, maxFret, arpeggioPath, currentShape,
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

  const chordName = `${selectedKey}${chordSymbol}`;
  const chordNotes = getChordNotes(chordName);
  const toneLabels = getChordToneLabels(selectedChordType, selectedExtension);

  return (
    <div className="space-y-6">
      {/* Chord Type Toggle (Major/Minor/etc) */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Chord Type
        </label>
        <div className="flex flex-wrap gap-2">
          {CHORD_TYPE_OPTIONS.map(type => (
            <button
              key={type.value}
              onClick={() => setSelectedChordType(type.value)}
              className={`px-3 py-2 rounded-lg font-medium transition-all ${
                selectedChordType === type.value ? 'btn-primary' : ''
              }`}
              style={selectedChordType !== type.value ? {
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)'
              } : {}}
            >
              {type.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Extension Toggle (Triad/7th/9th/etc) */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Extension
        </label>
        <div className="flex flex-wrap gap-2">
          {EXTENSION_OPTIONS.filter(ext => validExtensions.includes(ext.value)).map(ext => (
            <button
              key={ext.value}
              onClick={() => setSelectedExtension(ext.value)}
              className={`px-3 py-2 rounded-lg font-medium transition-all ${
                selectedExtension === ext.value ? 'btn-primary' : ''
              }`}
              style={selectedExtension !== ext.value ? {
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)'
              } : {}}
            >
              {ext.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key selector */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Key
        </label>
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

      {/* Position Selection */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Position
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedPositionGroup('all')}
            className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${
              selectedPositionGroup === 'all' || selectedPositionGroup === '' ? 'btn-primary' : ''
            }`}
            style={(selectedPositionGroup !== 'all' && selectedPositionGroup !== '') ? {
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)'
            } : {}}
          >
            All ({allShapes.length})
          </button>
          {availablePositions.map((pos) => (
            <button
              key={pos}
              onClick={() => setSelectedPositionGroup(pos)}
              className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                selectedPositionGroup === pos ? 'btn-primary' : ''
              }`}
              style={selectedPositionGroup !== pos ? {
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)'
              } : {}}
            >
              {pos} ({shapeGroups.get(pos)?.length || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Shape Variation */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Shape Variation ({currentShapeIndex + 1} of {filteredShapes.length})
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedShapeIndex(Math.max(0, currentShapeIndex - 1))}
            disabled={currentShapeIndex === 0}
            className="px-3 py-2 rounded-lg disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            Prev
          </button>
          <div 
            className="flex-1 px-3 py-2 rounded-lg text-center text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
          >
            {currentShape ? (
              <>
                Strings {currentShape.startingString + 1}-{currentShape.startingString + (currentShape.positions.length)}, 
                Frets {currentShape.minFret}-{currentShape.maxFret}
              </>
            ) : (
              'No shapes available'
            )}
          </div>
          <button
            onClick={() => setSelectedShapeIndex(Math.min(filteredShapes.length - 1, currentShapeIndex + 1))}
            disabled={currentShapeIndex >= filteredShapes.length - 1}
            className="px-3 py-2 rounded-lg disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            Next
          </button>
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
