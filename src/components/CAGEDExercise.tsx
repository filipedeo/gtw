import React, { useState, useEffect } from 'react';
import { Exercise } from '../types/exercise';
import { FretPosition, normalizeNoteName } from '../types/guitar';
import { useGuitarStore } from '../stores/guitarStore';
import { useAudioStore } from '../stores/audioStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { startDrone, stopDrone, playChord, initAudio } from '../lib/audioEngine';
import Fretboard from './Fretboard';
import DisplayModeToggle from './DisplayModeToggle';

interface CAGEDExerciseProps {
  exercise: Exercise;
}

// TODO: Add triad exercises to further explore the CAGED method
// - Major triads in each CAGED position
// - Minor triads in each CAGED position  
// - Diminished and augmented triads
// - Triad inversions across the fretboard
// - Connecting triads between CAGED positions
// This will be handled in a future session.

// CAGED shape definitions - ALL positions are relative offsets from the barre/root position
// This allows proper transposition to any key
// 
// String indices use the tuning array convention:
// - 6-string: 0=low E, 1=A, 2=D, 3=G, 4=B, 5=high E
// - 7-string: 0=low B, 1=low E, 2=A, 3=D, 4=G, 5=B, 6=high E
//
// The fretboard displays with high E at top, low E at bottom.
// The Fretboard component handles the visual transformation.
const CAGED_SHAPES: Record<string, {
  name: string;
  description: string;
  chordPositions: { string: number; fretOffset: number }[]; // Relative to barre position
  minorChordPositions: { string: number; fretOffset: number }[];
  rootString: number; // Which string has the root note (tuning array index)
  baseKey: string; // The key this shape is based on (for calculating transposition)
  scalePattern: number[][]; // [string (tuning index), fret offset from barre position]
  minorScalePattern: number[][];
}> = {
  'C': {
    name: 'C Shape',
    description: 'Based on the open C chord. Root on the 5th (A) string. Requires a stretch when barred.',
    rootString: 1, // A string (tuning index 1)
    baseKey: 'C',
    // Open C chord: x-3-2-0-1-0 (A string root at fret 3)
    // String indices: 0=lowE, 1=A, 2=D, 3=G, 4=B, 5=highE
    chordPositions: [
      { string: 1, fretOffset: 0 },  // A string - Root C (fret 3 in open position)
      { string: 2, fretOffset: -1 }, // D string - E (fret 2)
      { string: 3, fretOffset: -3 }, // G string - G (open = fret 0)
      { string: 4, fretOffset: -2 }, // B string - C (fret 1)
      { string: 5, fretOffset: -3 }, // high E - E (open = fret 0)
    ],
    minorChordPositions: [
      { string: 1, fretOffset: 0 },  // A string - Root
      { string: 2, fretOffset: -2 }, // D string - b3 (was -1 for major 3rd)
      { string: 3, fretOffset: -3 }, // G string - 5th
      { string: 4, fretOffset: -2 }, // B string - Root
      { string: 5, fretOffset: -4 }, // high E - b3 (was -3 for major 3rd)
    ],
    scalePattern: [
      [0, -3], [0, -2], [1, -3], [1, -1], [1, 0],
      [2, -3], [2, -1], [2, 0], [3, -3], [3, -1], [3, 1],
      [4, -3], [4, -2], [4, 0], [5, -3], [5, -2], [5, 0]
    ],
    minorScalePattern: [
      [0, -2], [0, 0], [1, -2], [1, 0], [1, 2],
      [2, -3], [2, -2], [2, 0], [3, -3], [3, -2], [3, 0],
      [4, -2], [4, 0], [4, 1], [5, -2], [5, 0], [5, 1]
    ]
  },
  'A': {
    name: 'A Shape',
    description: 'Based on the open A chord. Root on the 5th (A) string. Most common barre shape.',
    rootString: 1, // A string (tuning index 1)
    baseKey: 'A',
    // Open A chord: x-0-2-2-2-0 (A string root at fret 0/open)
    chordPositions: [
      { string: 1, fretOffset: 0 }, // A string - Root A (open)
      { string: 2, fretOffset: 2 }, // D string - E (fret 2)
      { string: 3, fretOffset: 2 }, // G string - A (fret 2)
      { string: 4, fretOffset: 2 }, // B string - C# (fret 2)
      { string: 5, fretOffset: 0 }, // high E - E (open)
    ],
    minorChordPositions: [
      { string: 1, fretOffset: 0 }, // A string - Root
      { string: 2, fretOffset: 2 }, // D string - 5th
      { string: 3, fretOffset: 2 }, // G string - Root
      { string: 4, fretOffset: 1 }, // B string - b3 (flatten 3rd by 1 semitone)
      { string: 5, fretOffset: 0 }, // high E - 5th
    ],
    scalePattern: [
      [0, 0], [0, 2], [0, 4], [1, 0], [1, 2], [1, 4],
      [2, 0], [2, 2], [2, 4], [3, 1], [3, 2], [3, 4],
      [4, 0], [4, 2], [4, 3], [5, 0], [5, 2], [5, 4]
    ],
    minorScalePattern: [
      [0, 0], [0, 1], [0, 3], [1, 0], [1, 2], [1, 3],
      [2, 0], [2, 2], [2, 3], [3, 0], [3, 2], [3, 4],
      [4, 0], [4, 1], [4, 3], [5, 0], [5, 1], [5, 3]
    ]
  },
  'G': {
    name: 'G Shape',
    description: 'Based on the open G chord. Root on the 6th (low E) string. Requires stretching.',
    rootString: 0, // Low E string (tuning index 0)
    baseKey: 'G',
    // Open G chord: 3-2-0-0-0-3 (low E root at fret 3)
    chordPositions: [
      { string: 0, fretOffset: 0 },  // low E - Root G (fret 3)
      { string: 1, fretOffset: -1 }, // A string - B (fret 2)
      { string: 2, fretOffset: -3 }, // D string - D (open)
      { string: 3, fretOffset: -3 }, // G string - G (open)
      { string: 4, fretOffset: -3 }, // B string - B (open)
      { string: 5, fretOffset: 0 },  // high E - G (fret 3)
    ],
    minorChordPositions: [
      { string: 0, fretOffset: 0 },  // low E - Root
      { string: 1, fretOffset: -2 }, // A string - b3 (flatten 3rd by 1 semitone)
      { string: 2, fretOffset: -3 }, // D string - 5th
      { string: 3, fretOffset: -3 }, // G string - Root
      { string: 4, fretOffset: -4 }, // B string - b3 (was -3 for major 3rd)
      { string: 5, fretOffset: 0 },  // high E - Root
    ],
    scalePattern: [
      [0, -3], [0, -1], [0, 0], [1, -3], [1, -1], [1, 0],
      [2, -3], [2, -1], [2, 1], [3, -3], [3, -1], [3, 1],
      [4, -3], [4, -2], [4, 0], [5, -3], [5, -1], [5, 0]
    ],
    minorScalePattern: [
      [0, -2], [0, 0], [0, 2], [1, -3], [1, -2], [1, 0],
      [2, -3], [2, -2], [2, 0], [3, -3], [3, -1], [3, 0],
      [4, -2], [4, 0], [4, 1], [5, -2], [5, 0], [5, 2]
    ]
  },
  'E': {
    name: 'E Shape',
    description: 'Based on the open E chord. Root on the 6th (low E) string. The most common barre chord.',
    rootString: 0, // Low E string (tuning index 0)
    baseKey: 'E',
    // Open E chord: 0-2-2-1-0-0 (low E root at fret 0/open)
    chordPositions: [
      { string: 0, fretOffset: 0 }, // low E - Root E (open)
      { string: 1, fretOffset: 2 }, // A string - B (fret 2)
      { string: 2, fretOffset: 2 }, // D string - E (fret 2)
      { string: 3, fretOffset: 1 }, // G string - G# (fret 1)
      { string: 4, fretOffset: 0 }, // B string - B (open)
      { string: 5, fretOffset: 0 }, // high E - E (open)
    ],
    minorChordPositions: [
      { string: 0, fretOffset: 0 }, // low E - Root
      { string: 1, fretOffset: 2 }, // A string - 5th
      { string: 2, fretOffset: 2 }, // D string - Root
      { string: 3, fretOffset: 0 }, // G string - b3 (flatten 3rd by 1 semitone)
      { string: 4, fretOffset: 0 }, // B string - 5th
      { string: 5, fretOffset: 0 }, // high E - Root
    ],
    scalePattern: [
      [0, 0], [0, 2], [0, 4], [1, 0], [1, 2], [1, 4],
      [2, 1], [2, 2], [2, 4], [3, 1], [3, 2], [3, 4],
      [4, 0], [4, 2], [4, 4], [5, 0], [5, 2], [5, 4]
    ],
    minorScalePattern: [
      [0, 0], [0, 2], [0, 3], [1, 0], [1, 2], [1, 3],
      [2, 0], [2, 2], [2, 4], [3, 0], [3, 2], [3, 4],
      [4, 0], [4, 1], [4, 3], [5, 0], [5, 2], [5, 3]
    ]
  },
  'D': {
    name: 'D Shape',
    description: 'Based on the open D chord. Root on the 4th (D) string. Great for higher voicings.',
    rootString: 2, // D string (tuning index 2)
    baseKey: 'D',
    // Open D chord: x-x-0-2-3-2 (D string root at fret 0/open)
    chordPositions: [
      { string: 2, fretOffset: 0 }, // D string - Root D (open)
      { string: 3, fretOffset: 2 }, // G string - A (fret 2)
      { string: 4, fretOffset: 3 }, // B string - D (fret 3)
      { string: 5, fretOffset: 2 }, // high E - F# (fret 2)
    ],
    minorChordPositions: [
      { string: 2, fretOffset: 0 }, // D string - Root
      { string: 3, fretOffset: 2 }, // G string - 5th
      { string: 4, fretOffset: 3 }, // B string - Root
      { string: 5, fretOffset: 1 }, // high E - b3 (flatten 3rd by 1 semitone)
    ],
    scalePattern: [
      [1, 0], [1, 2], [1, 4], [2, 0], [2, 2], [2, 4],
      [3, 0], [3, 2], [3, 4], [4, 0], [4, 2], [4, 3],
      [5, 0], [5, 2], [5, 3]
    ],
    minorScalePattern: [
      [1, 0], [1, 1], [1, 3], [2, 0], [2, 2], [2, 3],
      [3, 0], [3, 2], [3, 3], [4, 1], [4, 3], [4, 5],
      [5, 0], [5, 1], [5, 3]
    ]
  }
};

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const CAGEDExercise: React.FC<CAGEDExerciseProps> = ({ exercise }) => {
  const { stringCount, setHighlightedPositions, setSecondaryHighlightedPositions, setRootNote, clearHighlights } = useGuitarStore();
  const { droneConfig, setDroneConfig, isDroneActive, setDroneActive } = useAudioStore();
  const { isActive } = useExerciseStore();
  
  // For 7-string guitars, we need to offset string indices by 1
  // because the CAGED shapes are defined for 6-string (0=low E)
  // but on 7-string, 0=low B and 1=low E
  const stringOffset = stringCount === 7 ? 1 : 0;
  
  type ScaleType = 'major' | 'minor';
  const [selectedShape, setSelectedShape] = useState<string>('C');
  const [selectedKey, setSelectedKey] = useState<string>('C');
  const [scaleType, setScaleType] = useState<ScaleType>('major');
  const [showChord, setShowChord] = useState(true);
  const [showScale, setShowScale] = useState(false);
  const [showRoots, setShowRoots] = useState(true);

  // Get the shape based on exercise ID
  useEffect(() => {
    if (exercise.id === 'caged-1') { setSelectedShape('C'); setScaleType('major'); }
    else if (exercise.id === 'caged-2') { setSelectedShape('A'); setScaleType('major'); }
    else if (exercise.id === 'caged-3') { setSelectedShape('G'); setScaleType('major'); }
    else if (exercise.id === 'caged-4') { setSelectedShape('E'); setScaleType('major'); }
    else if (exercise.id === 'caged-5') { setSelectedShape('D'); setScaleType('major'); }
    else if (exercise.id === 'caged-6') { setScaleType('major'); }
    else if (exercise.id === 'caged-7') { setSelectedShape('C'); setScaleType('minor'); }
    else if (exercise.id === 'caged-8') { setSelectedShape('A'); setScaleType('minor'); }
    else if (exercise.id === 'caged-9') { setSelectedShape('G'); setScaleType('minor'); }
    else if (exercise.id === 'caged-10') { setSelectedShape('E'); setScaleType('minor'); }
    else if (exercise.id === 'caged-11') { setSelectedShape('D'); setScaleType('minor'); }
    else if (exercise.id === 'caged-12') { setScaleType('minor'); }
  }, [exercise.id]);

  // Calculate the barre/root fret position for the selected key
  const getRootFret = (): number => {
    const shapeData = CAGED_SHAPES[selectedShape];
    const keyIndex = KEYS.indexOf(selectedKey);
    const baseKeyIndex = KEYS.indexOf(shapeData.baseKey);
    
    // Calculate how many semitones to move from the base key
    const semitones = (keyIndex - baseKeyIndex + 12) % 12;
    
    // For shapes based on open chords (E, A, D), the base position is fret 0
    // For C shape, base position is fret 3 (open C chord root is at fret 3 of A string)
    // For G shape, base position is fret 3 (open G chord root is at fret 3 of low E string)
    let baseFret = 0;
    if (selectedShape === 'C') baseFret = 3;
    if (selectedShape === 'G') baseFret = 3;
    
    return baseFret + semitones;
  };

  // Update fretboard when shape/key changes
  useEffect(() => {
    if (!isActive) return;

    const shapeData = CAGED_SHAPES[selectedShape];
    const rootFret = getRootFret();
    const chordPositions: FretPosition[] = [];
    const scalePositions: FretPosition[] = [];

    // Select chord/scale data based on scale type
    const chordData = scaleType === 'minor' ? shapeData.minorChordPositions : shapeData.chordPositions;
    const scaleData = scaleType === 'minor' ? shapeData.minorScalePattern : shapeData.scalePattern;

    // Always compute chord positions
    chordData.forEach(pos => {
      const fret = rootFret + pos.fretOffset;
      const adjustedString = pos.string + stringOffset;
      if (fret >= 0 && fret <= 22 && adjustedString < stringCount) {
        chordPositions.push({ string: adjustedString, fret });
      }
    });

    // Always compute scale positions
    scaleData.forEach(([string, fretOffset]) => {
      const fret = rootFret + fretOffset;
      const adjustedString = string + stringOffset;
      if (fret >= 0 && fret <= 22 && adjustedString < stringCount) {
        scalePositions.push({ string: adjustedString, fret });
      }
    });

    if (showChord && showScale) {
      // Chord = primary, scale-only = secondary
      setHighlightedPositions(chordPositions);
      const scaleOnly = scalePositions.filter(sp =>
        !chordPositions.some(cp => cp.string === sp.string && cp.fret === sp.fret)
      );
      setSecondaryHighlightedPositions(scaleOnly);
    } else if (showChord) {
      setHighlightedPositions(chordPositions);
      setSecondaryHighlightedPositions([]);
    } else if (showScale) {
      setHighlightedPositions(scalePositions);
      setSecondaryHighlightedPositions([]);
    } else {
      setHighlightedPositions([]);
      setSecondaryHighlightedPositions([]);
    }

    setRootNote(showRoots ? normalizeNoteName(selectedKey) : null);
  }, [selectedShape, selectedKey, scaleType, showChord, showScale, showRoots, isActive, setHighlightedPositions, setSecondaryHighlightedPositions, setRootNote, stringOffset, stringCount]);

  // Cleanup
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
    const rootMidi = 48 + KEYS.indexOf(selectedKey); // C3 = MIDI 48
    const thirdMidi = rootMidi + (scaleType === 'minor' ? 3 : 4);
    const fifthMidi = rootMidi + 7;
    const midiToNote = (midi: number) => `${KEYS[midi % 12]}${Math.floor(midi / 12) - 1}`;
    playChord([midiToNote(rootMidi), midiToNote(thirdMidi), midiToNote(fifthMidi)], { duration: 2, velocity: 0.6 });
  };

  const shapeData = CAGED_SHAPES[selectedShape];

  return (
    <div className="space-y-6">
      {/* Scale Type Toggle */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Scale Type
        </label>
        <div className="flex gap-2">
          {(['major', 'minor'] as ScaleType[]).map(type => (
            <button
              key={type}
              onClick={() => setScaleType(type)}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                scaleType === type ? 'btn-primary' : ''
              }`}
              style={scaleType !== type ? {
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)'
              } : {}}
            >
              {type === 'major' ? 'Major' : 'Minor'}
            </button>
          ))}
        </div>
      </div>

      {/* Shape & Key Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            CAGED Shape
          </label>
          <div className="flex gap-2">
            {['C', 'A', 'G', 'E', 'D'].map(shape => (
              <button
                key={shape}
                onClick={() => setSelectedShape(shape)}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                  selectedShape === shape ? 'btn-primary' : ''
                }`}
                style={selectedShape !== shape ? {
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)'
                } : {}}
              >
                {shape}
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
            onChange={(e) => setSelectedKey(e.target.value)}
            className="w-full px-3 py-2 rounded-lg"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }}
          >
            {KEYS.map(key => (
              <option key={key} value={key}>{key} {scaleType === 'major' ? 'Major' : 'Minor'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Shape Info */}
      <div 
        className="p-4 rounded-lg"
        style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
      >
        <h4 className="font-medium mb-2" style={{ color: 'var(--accent-primary)' }}>
          {shapeData.name} - {selectedKey} {scaleType === 'major' ? 'Major' : 'Minor'}
        </h4>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {shapeData.description}
        </p>
      </div>

      {/* Display Options */}
      <div className="flex flex-wrap gap-4 items-center">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showChord}
            onChange={(e) => setShowChord(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Show Chord</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showScale}
            onChange={(e) => setShowScale(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Show Scale</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showRoots}
            onChange={(e) => setShowRoots(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Highlight Roots</span>
        </label>
        <DisplayModeToggle />
      </div>

      {/* Embedded Fretboard */}
      <div className="card p-4">
        <Fretboard interactive={true} />
      </div>

      {/* Audio Controls */}
      <div className="flex gap-3">
        <button
          onClick={handleToggleDrone}
          className={isDroneActive ? 'btn-danger' : 'btn-success'}
        >
          {isDroneActive ? '⏹ Stop Drone' : '▶ Play Drone'}
        </button>
        <button
          onClick={handlePlayChord}
          className="btn-secondary"
        >
          🎵 Play Chord
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
        <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: 'var(--text-secondary)' }}>
          <li>Play the chord shape first, then find the scale notes around it</li>
          <li>Identify the Root (red), 3rd, and 5th within the shape</li>
          <li>Practice transitioning to the next CAGED shape up the neck</li>
          <li>Try improvising using only notes within this position</li>
          <li>Say the note names aloud as you play</li>
        </ul>
      </div>
    </div>
  );
};

export default CAGEDExercise;