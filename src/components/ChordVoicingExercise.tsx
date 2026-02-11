import React, { useState, useEffect, useCallback } from 'react';
import { Exercise } from '../types/exercise';
import { FretPosition } from '../types/guitar';
import { useGuitarStore } from '../stores/guitarStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { playChord, initAudio } from '../lib/audioEngine';
import Fretboard from './Fretboard';

interface ChordVoicingExerciseProps {
  exercise: Exercise;
}

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Drop 2 voicings on strings 4-3-2-1 (D-G-B-E)
// Positions are relative to the root note position
// Format: [string, fret offset from root]
const DROP2_VOICINGS = {
  maj7: {
    name: 'Major 7th',
    inversions: [
      { name: 'Root Position', positions: [[3, 0], [2, 2], [1, 1], [0, 2]], intervals: ['R', '5', '7', '3'] },
      { name: '1st Inversion', positions: [[3, 0], [2, 1], [1, 2], [0, 2]], intervals: ['3', '7', 'R', '5'] },
      { name: '2nd Inversion', positions: [[3, 0], [2, 2], [1, 2], [0, 1]], intervals: ['5', 'R', '3', '7'] },
      { name: '3rd Inversion', positions: [[3, 0], [2, 1], [1, 1], [0, 2]], intervals: ['7', '3', '5', 'R'] },
    ],
  },
  min7: {
    name: 'Minor 7th',
    inversions: [
      { name: 'Root Position', positions: [[3, 0], [2, 2], [1, 1], [0, 1]], intervals: ['R', '5', 'b7', 'b3'] },
      { name: '1st Inversion', positions: [[3, 0], [2, 1], [1, 1], [0, 2]], intervals: ['b3', 'b7', 'R', '5'] },
      { name: '2nd Inversion', positions: [[3, 0], [2, 2], [1, 2], [0, 1]], intervals: ['5', 'R', 'b3', 'b7'] },
      { name: '3rd Inversion', positions: [[3, 0], [2, 1], [1, 2], [0, 2]], intervals: ['b7', 'b3', '5', 'R'] },
    ],
  },
  dom7: {
    name: 'Dominant 7th',
    inversions: [
      { name: 'Root Position', positions: [[3, 0], [2, 2], [1, 0], [0, 2]], intervals: ['R', '5', 'b7', '3'] },
      { name: '1st Inversion', positions: [[3, 0], [2, 0], [1, 2], [0, 2]], intervals: ['3', 'b7', 'R', '5'] },
      { name: '2nd Inversion', positions: [[3, 0], [2, 2], [1, 2], [0, 0]], intervals: ['5', 'R', '3', 'b7'] },
      { name: '3rd Inversion', positions: [[3, 0], [2, 1], [1, 1], [0, 2]], intervals: ['b7', '3', '5', 'R'] },
    ],
  },
};

// Triad inversions on strings 4-3-2
const TRIAD_VOICINGS = {
  major: {
    name: 'Major Triad',
    inversions: [
      { name: 'Root Position', positions: [[3, 0], [2, 2], [1, 2]], intervals: ['R', '3', '5'] },
      { name: '1st Inversion', positions: [[3, 0], [2, 1], [1, 2]], intervals: ['3', '5', 'R'] },
      { name: '2nd Inversion', positions: [[3, 0], [2, 2], [1, 1]], intervals: ['5', 'R', '3'] },
    ],
  },
  minor: {
    name: 'Minor Triad',
    inversions: [
      { name: 'Root Position', positions: [[3, 0], [2, 2], [1, 1]], intervals: ['R', 'b3', '5'] },
      { name: '1st Inversion', positions: [[3, 0], [2, 1], [1, 2]], intervals: ['b3', '5', 'R'] },
      { name: '2nd Inversion', positions: [[3, 0], [2, 2], [1, 2]], intervals: ['5', 'R', 'b3'] },
    ],
  },
};

type ChordType = 'maj7' | 'min7' | 'dom7' | 'major' | 'minor';

const ChordVoicingExercise: React.FC<ChordVoicingExerciseProps> = ({ exercise }) => {
  const { setHighlightedPositions, clearHighlights, setRootNote } = useGuitarStore();
  const { isActive } = useExerciseStore();
  
  const [selectedKey, setSelectedKey] = useState('C');
  const [selectedChordType, setSelectedChordType] = useState<ChordType>('maj7');
  const [selectedInversion, setSelectedInversion] = useState(0);
  const [rootFret, setRootFret] = useState(5); // Starting fret for the voicing

  // Determine chord type based on exercise
  useEffect(() => {
    if (exercise.id.includes('chord-1')) setSelectedChordType('maj7');
    else if (exercise.id.includes('chord-2')) setSelectedChordType('min7');
    else if (exercise.id.includes('chord-3')) setSelectedChordType('dom7');
    else if (exercise.id.includes('chord-4')) setSelectedChordType('major');
  }, [exercise.id]);

  const getVoicingData = useCallback(() => {
    if (selectedChordType === 'major' || selectedChordType === 'minor') {
      return TRIAD_VOICINGS[selectedChordType];
    }
    return DROP2_VOICINGS[selectedChordType];
  }, [selectedChordType]);

  const getCurrentInversion = useCallback(() => {
    const voicingData = getVoicingData();
    return voicingData.inversions[selectedInversion] || voicingData.inversions[0];
  }, [getVoicingData, selectedInversion]);

  // Update fretboard positions
  useEffect(() => {
    if (!isActive) return;

    const inversion = getCurrentInversion();
    const keyOffset = KEYS.indexOf(selectedKey);
    
    const positions: FretPosition[] = inversion.positions.map(([string, fretOffset]) => ({
      string,
      fret: rootFret + fretOffset + keyOffset,
    })).filter(pos => pos.fret >= 0 && pos.fret <= 22);

    setHighlightedPositions(positions);
    setRootNote(selectedKey);
  }, [isActive, selectedKey, selectedChordType, selectedInversion, rootFret, getCurrentInversion, setHighlightedPositions, setRootNote]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearHighlights();
    };
  }, [clearHighlights]);

  const handlePlayChord = async () => {
    await initAudio();
    
    const inversion = getCurrentInversion();
    const keyOffset = KEYS.indexOf(selectedKey);
    
    // Generate note names for playback
    // This is simplified - in production would calculate actual notes from positions
    const baseOctave = 3;
    const notes = inversion.positions.map(([, fretOffset], idx) => {
      const semitones = rootFret + fretOffset + keyOffset;
      const noteIdx = (KEYS.indexOf('C') + semitones) % 12;
      const octave = baseOctave + Math.floor((semitones + idx * 5) / 12);
      return `${KEYS[noteIdx]}${octave}`;
    });
    
    playChord(notes, { duration: 2, velocity: 0.6 });
  };

  const voicingData = getVoicingData();
  const currentInversion = getCurrentInversion();

  if (!isActive) {
    return (
      <div className="text-center py-8">
        <p style={{ color: 'var(--text-secondary)' }} className="mb-4">
          Click "Start Exercise" to explore {voicingData.name} voicings.
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Learn Drop 2 voicings and triad inversions across the fretboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key & Chord Type Selection */}
      <div className="grid grid-cols-2 gap-4">
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
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Root Fret
          </label>
          <input
            type="range"
            min="1"
            max="12"
            value={rootFret}
            onChange={(e) => setRootFret(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Fret {rootFret}
          </div>
        </div>
      </div>

      {/* Chord Info */}
      <div 
        className="p-4 rounded-lg"
        style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
      >
        <h4 className="font-medium mb-2" style={{ color: 'var(--accent-primary)' }}>
          {selectedKey} {voicingData.name} - {currentInversion.name}
        </h4>
        <div className="flex gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span>Intervals:</span>
          {currentInversion.intervals.map((interval, idx) => (
            <span 
              key={idx}
              className="px-2 py-0.5 rounded"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              {interval}
            </span>
          ))}
        </div>
      </div>

      {/* Inversion Selection */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Inversion
        </label>
        <div className="flex gap-2 flex-wrap">
          {voicingData.inversions.map((inv, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedInversion(idx)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedInversion === idx ? 'btn-primary' : ''
              }`}
              style={selectedInversion !== idx ? {
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)'
              } : {}}
            >
              {inv.name}
            </button>
          ))}
        </div>
      </div>

      {/* Fretboard */}
      <div className="card p-4">
        <Fretboard interactive={true} />
      </div>

      {/* Play Button */}
      <div className="flex gap-3">
        <button
          onClick={handlePlayChord}
          className="btn-primary flex items-center gap-2"
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
          <li>Learn all inversions in one position before moving</li>
          <li>Practice voice leading between inversions</li>
          <li>Connect inversions to create smooth chord progressions</li>
          <li>Identify the root note in each inversion</li>
          <li>Try playing ii-V-I progressions using these voicings</li>
        </ul>
      </div>
    </div>
  );
};

export default ChordVoicingExercise;
