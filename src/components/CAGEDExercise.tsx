import React, { useState, useEffect } from 'react';
import { Exercise } from '../types/exercise';
import { FretPosition, normalizeNoteName } from '../types/guitar';
import { useGuitarStore } from '../stores/guitarStore';
import { useAudioStore } from '../stores/audioStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { startDrone, stopDrone, playChord, initAudio } from '../lib/audioEngine';
import { CAGED_SHAPES, KEYS } from '../lib/cagedPatterns';
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