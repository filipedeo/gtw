import React, { useState, useEffect } from 'react';
import { Exercise } from '../types/exercise';
import { FretPosition } from '../types/guitar';
import { useGuitarStore } from '../stores/guitarStore';
import { useAudioStore } from '../stores/audioStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { startDrone, stopDrone, playChord, initAudio } from '../lib/audioEngine';
import Fretboard from './Fretboard';

interface CAGEDExerciseProps {
  exercise: Exercise;
}

// CAGED shape definitions - ALL positions are relative offsets from the barre/root position
// This allows proper transposition to any key
const CAGED_SHAPES: Record<string, {
  name: string;
  description: string;
  chordPositions: { string: number; fretOffset: number }[]; // Relative to barre position
  rootString: number; // Which string has the root note
  baseKey: string; // The key this shape is based on (for calculating transposition)
  scalePattern: number[][]; // [string, fret offset from barre position]
}> = {
  'C': {
    name: 'C Shape',
    description: 'Based on the open C chord. Root on the 5th string. Requires a stretch when barred.',
    rootString: 4, // A string (0-indexed from high E)
    baseKey: 'C',
    chordPositions: [
      { string: 4, fretOffset: 0 }, // Root (barre position)
      { string: 3, fretOffset: -1 }, // E (one fret below barre)
      { string: 2, fretOffset: -3 }, // G (three frets below - open in C position)
      { string: 1, fretOffset: -2 }, // C
      { string: 0, fretOffset: -3 }, // E (open in C position)
    ],
    // Scale pattern relative to root position (fret 3 for C)
    // All offsets are from the barre/root fret
    scalePattern: [
      [5, -3], [5, -1], [4, -3], [4, -1], [4, 0],
      [3, -3], [3, -1], [2, -3], [2, -2], [2, 0],
      [1, -3], [1, -2], [1, 0], [0, -3], [0, -1], [0, 0]
    ]
  },
  'A': {
    name: 'A Shape',
    description: 'Based on the open A chord. Root on the 5th string. Most common barre shape.',
    rootString: 4, // A string
    baseKey: 'A',
    chordPositions: [
      { string: 4, fretOffset: 0 }, // Root (barre)
      { string: 3, fretOffset: 2 }, // E
      { string: 2, fretOffset: 2 }, // A
      { string: 1, fretOffset: 2 }, // C#
      { string: 0, fretOffset: 0 }, // E (barre)
    ],
    scalePattern: [
      [5, 0], [5, 2], [4, 0], [4, 2], [4, 4],
      [3, 1], [3, 2], [3, 4], [2, 1], [2, 2], [2, 4],
      [1, 2], [1, 4], [0, 0], [0, 2], [0, 4]
    ]
  },
  'G': {
    name: 'G Shape',
    description: 'Based on the open G chord. Root on the 6th string. Requires stretching.',
    rootString: 5, // Low E string
    baseKey: 'G',
    chordPositions: [
      { string: 5, fretOffset: 0 }, // Root (barre)
      { string: 4, fretOffset: -1 }, // B
      { string: 3, fretOffset: -3 }, // D (open in G position)
      { string: 2, fretOffset: -3 }, // G (open in G position)
      { string: 1, fretOffset: -3 }, // B (open in G position)
      { string: 0, fretOffset: 0 }, // G
    ],
    scalePattern: [
      [5, -3], [5, -1], [5, 0], [4, -3], [4, -1],
      [3, -3], [3, -1], [3, 1], [2, -3], [2, -1],
      [1, -3], [1, -1], [1, 0], [0, -3], [0, -1], [0, 0]
    ]
  },
  'E': {
    name: 'E Shape',
    description: 'Based on the open E chord. Root on the 6th string. The most common barre chord.',
    rootString: 5, // Low E string
    baseKey: 'E',
    chordPositions: [
      { string: 5, fretOffset: 0 }, // Root (barre)
      { string: 4, fretOffset: 2 }, // B
      { string: 3, fretOffset: 2 }, // E
      { string: 2, fretOffset: 1 }, // G#
      { string: 1, fretOffset: 0 }, // B (barre)
      { string: 0, fretOffset: 0 }, // E (barre)
    ],
    scalePattern: [
      [5, 0], [5, 2], [5, 4], [4, 0], [4, 2], [4, 4],
      [3, 1], [3, 2], [3, 4], [2, 1], [2, 2], [2, 4],
      [1, 0], [1, 2], [1, 4], [0, 0], [0, 2], [0, 4]
    ]
  },
  'D': {
    name: 'D Shape',
    description: 'Based on the open D chord. Root on the 4th string. Great for higher voicings.',
    rootString: 3, // D string
    baseKey: 'D',
    chordPositions: [
      { string: 3, fretOffset: 0 }, // Root (barre)
      { string: 2, fretOffset: 2 }, // A
      { string: 1, fretOffset: 3 }, // D
      { string: 0, fretOffset: 2 }, // F#
    ],
    scalePattern: [
      [4, 0], [4, 2], [4, 3], [3, 0], [3, 2],
      [2, 0], [2, 2], [2, 3], [1, 0], [1, 2], [1, 3],
      [0, 0], [0, 2], [0, 3]
    ]
  }
};

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const CAGEDExercise: React.FC<CAGEDExerciseProps> = ({ exercise }) => {
  const { setHighlightedPositions, setRootNote, clearHighlights } = useGuitarStore();
  const { droneConfig, setDroneConfig, isDroneActive, setDroneActive } = useAudioStore();
  const { isActive } = useExerciseStore();
  
  const [selectedShape, setSelectedShape] = useState<string>('C');
  const [selectedKey, setSelectedKey] = useState<string>('C');
  const [showChord, setShowChord] = useState(true);
  const [showScale, setShowScale] = useState(false);
  const [showRoots, setShowRoots] = useState(true);

  // Get the shape based on exercise ID
  useEffect(() => {
    if (exercise.id.includes('caged-1')) setSelectedShape('C');
    else if (exercise.id.includes('caged-2')) setSelectedShape('A');
    else if (exercise.id.includes('caged-3')) setSelectedShape('G');
    else if (exercise.id.includes('caged-4')) setSelectedShape('E');
    else if (exercise.id.includes('caged-5')) setSelectedShape('D');
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
    const positions: FretPosition[] = [];
    
    if (showChord) {
      shapeData.chordPositions.forEach(pos => {
        const fret = rootFret + pos.fretOffset;
        // Only include if fret is valid (>= 0)
        if (fret >= 0 && fret <= 22) {
          positions.push({
            string: pos.string,
            fret: fret
          });
        }
      });
    }
    
    if (showScale) {
      shapeData.scalePattern.forEach(([string, fretOffset]) => {
        const fret = rootFret + fretOffset;
        // Only include if fret is valid (>= 0)
        if (fret >= 0 && fret <= 22) {
          positions.push({ string, fret });
        }
      });
    }
    
    setHighlightedPositions(positions);
    setRootNote(selectedKey);
  }, [selectedShape, selectedKey, showChord, showScale, isActive, setHighlightedPositions, setRootNote]);

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
      startDrone({ ...droneConfig, note: selectedKey, octave: 2 });
      setDroneActive(true);
    }
  };

  const handlePlayChord = async () => {
    await initAudio();
    // Play a simple major chord
    const root = `${selectedKey}3`;
    const third = `${KEYS[(KEYS.indexOf(selectedKey) + 4) % 12]}3`;
    const fifth = `${KEYS[(KEYS.indexOf(selectedKey) + 7) % 12]}3`;
    playChord([root, third, fifth], { duration: 2, velocity: 0.6 });
  };

  if (!isActive) {
    return (
      <div className="text-center py-8">
        <p style={{ color: 'var(--text-secondary)' }} className="mb-4">
          Click "Start Exercise" to explore the {CAGED_SHAPES[selectedShape]?.name || 'CAGED'} shape.
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Learn chord shapes and scale patterns across the fretboard.
        </p>
      </div>
    );
  }

  const shapeData = CAGED_SHAPES[selectedShape];

  return (
    <div className="space-y-6">
      {/* Shape & Key Selection */}
      <div className="grid grid-cols-2 gap-4">
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
              <option key={key} value={key}>{key} Major</option>
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
          {shapeData.name} - {selectedKey} Major
        </h4>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {shapeData.description}
        </p>
      </div>

      {/* Display Options */}
      <div className="flex flex-wrap gap-4">
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