import React, { useState, useEffect, useCallback } from 'react';
import { Exercise } from '../types/exercise';
import { FretPosition, normalizeNoteName } from '../types/guitar';
import { useGuitarStore } from '../stores/guitarStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { playChord, initAudio } from '../lib/audioEngine';
import Fretboard from './Fretboard';

interface ChordVoicingExerciseProps {
  exercise: Exercise;
}

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
// Internal sharps array for MIDI/semitone calculations
const KEYS_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Standard tuning open string MIDI values
const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64]; // E2, A2, D3, G3, B3, E4

// Drop 2 voicings on strings D-G-B-E (indices 2,3,4,5)
// Offsets are relative to the rootFret position
// Drop 2 = take close voicing, drop 2nd voice from top down an octave
// Offsets calculated from tuning intervals: D→G=5st, G→B=4st, B→E=5st
const DROP2_VOICINGS = {
  maj7: {
    name: 'Major 7th',
    inversions: [
      { name: 'Root Position', positions: [[2, 0], [3, 0], [4, 0], [5, 2]], intervals: ['5', 'R', '3', 'M7'] },
      { name: '1st Inversion', positions: [[2, 1], [3, 1], [4, 0], [5, 0]], intervals: ['M7', '3', '5', 'R'] },
      { name: '2nd Inversion', positions: [[2, 0], [3, 2], [4, 2], [5, 2]], intervals: ['R', '5', 'M7', '3'] },
      { name: '3rd Inversion', positions: [[2, 1], [3, 3], [4, 0], [5, 2]], intervals: ['3', 'M7', 'R', '5'] },
    ],
  },
  min7: {
    name: 'Minor 7th',
    inversions: [
      { name: 'Root Position', positions: [[2, 0], [3, 0], [4, -1], [5, 1]], intervals: ['5', 'R', 'b3', 'b7'] },
      { name: '1st Inversion', positions: [[2, 0], [3, 0], [4, 0], [5, 0]], intervals: ['b7', 'b3', '5', 'R'] },
      { name: '2nd Inversion', positions: [[2, 0], [3, 2], [4, 1], [5, 1]], intervals: ['R', '5', 'b7', 'b3'] },
      { name: '3rd Inversion', positions: [[2, 0], [3, 2], [4, 0], [5, 2]], intervals: ['b3', 'b7', 'R', '5'] },
    ],
  },
  dom7: {
    name: 'Dominant 7th',
    inversions: [
      { name: 'Root Position', positions: [[2, 0], [3, 0], [4, 0], [5, 1]], intervals: ['5', 'R', '3', 'b7'] },
      { name: '1st Inversion', positions: [[2, 0], [3, 1], [4, 0], [5, 0]], intervals: ['b7', '3', '5', 'R'] },
      { name: '2nd Inversion', positions: [[2, 0], [3, 2], [4, 1], [5, 2]], intervals: ['R', '5', 'b7', '3'] },
      { name: '3rd Inversion', positions: [[2, 1], [3, 2], [4, 0], [5, 2]], intervals: ['3', 'b7', 'R', '5'] },
    ],
  },
};

// Triad voicings on multiple string sets
// Offsets calculated from tuning intervals: E→A=5, A→D=5, D→G=5, G→B=4, B→E=5
const TRIAD_VOICINGS = {
  major: {
    name: 'Major Triad',
    stringSets: [
      {
        label: 'D-G-B',
        inversions: [
          { name: 'Root Position', positions: [[2, 2], [3, 1], [4, 0]], intervals: ['R', '3', '5'] },
          { name: '1st Inversion', positions: [[2, 2], [3, 0], [4, 1]], intervals: ['3', '5', 'R'] },
          { name: '2nd Inversion', positions: [[2, 0], [3, 0], [4, 0]], intervals: ['5', 'R', '3'] },
        ],
      },
      {
        label: 'G-B-E',
        inversions: [
          { name: 'Root Position', positions: [[3, 2], [4, 1], [5, 0]], intervals: ['R', '3', '5'] },
          { name: '1st Inversion', positions: [[3, 1], [4, 0], [5, 1]], intervals: ['3', '5', 'R'] },
          { name: '2nd Inversion', positions: [[3, 0], [4, 0], [5, 1]], intervals: ['5', 'R', '3'] },
        ],
      },
      {
        label: 'A-D-G',
        inversions: [
          { name: 'Root Position', positions: [[1, 2], [2, 1], [3, 0]], intervals: ['R', '3', '5'] },
          { name: '1st Inversion', positions: [[1, 2], [2, 0], [3, 0]], intervals: ['3', '5', 'R'] },
          { name: '2nd Inversion', positions: [[1, 0], [2, 0], [3, 0]], intervals: ['5', 'R', '3'] },
        ],
      },
    ],
  },
  minor: {
    name: 'Minor Triad',
    stringSets: [
      {
        label: 'D-G-B',
        inversions: [
          { name: 'Root Position', positions: [[2, 2], [3, 0], [4, 0]], intervals: ['R', 'b3', '5'] },
          { name: '1st Inversion', positions: [[2, 1], [3, 0], [4, 1]], intervals: ['b3', '5', 'R'] },
          { name: '2nd Inversion', positions: [[2, 1], [3, 1], [4, 0]], intervals: ['5', 'R', 'b3'] },
        ],
      },
      {
        label: 'G-B-E',
        inversions: [
          { name: 'Root Position', positions: [[3, 2], [4, 0], [5, 0]], intervals: ['R', 'b3', '5'] },
          { name: '1st Inversion', positions: [[3, 1], [4, 1], [5, 1]], intervals: ['b3', '5', 'R'] },
          { name: '2nd Inversion', positions: [[3, 0], [4, 1], [5, 1]], intervals: ['5', 'R', 'b3'] },
        ],
      },
      {
        label: 'A-D-G',
        inversions: [
          { name: 'Root Position', positions: [[1, 2], [2, 0], [3, 0]], intervals: ['R', 'b3', '5'] },
          { name: '1st Inversion', positions: [[1, 1], [2, 0], [3, 0]], intervals: ['b3', '5', 'R'] },
          { name: '2nd Inversion', positions: [[1, 0], [2, 0], [3, 1]], intervals: ['5', 'R', 'b3'] },
        ],
      },
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
  const [selectedStringSet, setSelectedStringSet] = useState(0);
  const [rootFret, setRootFret] = useState(5);

  const isTriad = selectedChordType === 'major' || selectedChordType === 'minor';

  // Determine chord type based on exercise
  useEffect(() => {
    if (exercise.id.includes('chord-1')) setSelectedChordType('maj7');
    else if (exercise.id.includes('chord-2')) setSelectedChordType('min7');
    else if (exercise.id.includes('chord-3')) setSelectedChordType('dom7');
    else if (exercise.id.includes('chord-4')) setSelectedChordType('major');
    else if (exercise.id.includes('chord-5')) setSelectedChordType('minor');
    setSelectedInversion(0);
    setSelectedStringSet(0);
  }, [exercise.id]);

  const getVoicingName = useCallback(() => {
    if (isTriad) return TRIAD_VOICINGS[selectedChordType as 'major' | 'minor'].name;
    return DROP2_VOICINGS[selectedChordType as 'maj7' | 'min7' | 'dom7'].name;
  }, [selectedChordType, isTriad]);

  const getInversions = useCallback(() => {
    if (isTriad) {
      const triad = TRIAD_VOICINGS[selectedChordType as 'major' | 'minor'];
      return triad.stringSets[selectedStringSet]?.inversions || triad.stringSets[0].inversions;
    }
    return DROP2_VOICINGS[selectedChordType as 'maj7' | 'min7' | 'dom7'].inversions;
  }, [selectedChordType, isTriad, selectedStringSet]);

  const getCurrentInversion = useCallback(() => {
    const inversions = getInversions();
    return inversions[selectedInversion] || inversions[0];
  }, [getInversions, selectedInversion]);

  const getStringSets = useCallback(() => {
    if (!isTriad) return null;
    return TRIAD_VOICINGS[selectedChordType as 'major' | 'minor'].stringSets;
  }, [selectedChordType, isTriad]);

  // Update fretboard positions
  useEffect(() => {
    if (!isActive) return;

    const inversion = getCurrentInversion();
    const positions: FretPosition[] = inversion.positions.map(([string, fretOffset]) => ({
      string,
      fret: rootFret + fretOffset,
    })).filter(pos => pos.fret >= 0 && pos.fret <= 22);

    setHighlightedPositions(positions);
    setRootNote(normalizeNoteName(selectedKey));
  }, [isActive, selectedKey, selectedChordType, selectedInversion, selectedStringSet, rootFret, getCurrentInversion, setHighlightedPositions, setRootNote]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearHighlights();
    };
  }, [clearHighlights]);

  const handlePlayChord = async () => {
    await initAudio();

    const inversion = getCurrentInversion();

    const notes = inversion.positions.map(([string, fretOffset]) => {
      const fret = rootFret + fretOffset;
      const midi = OPEN_STRING_MIDI[string] + fret;
      const noteName = KEYS_SHARP[midi % 12];
      const octave = Math.floor(midi / 12) - 1;
      return `${noteName}${octave}`;
    });

    playChord(notes, { duration: 2, velocity: 0.6 });
  };

  const voicingName = getVoicingName();
  const currentInversion = getCurrentInversion();
  const inversions = getInversions();
  const stringSets = getStringSets();

  if (!isActive) {
    return (
      <div className="text-center py-8">
        <p style={{ color: 'var(--text-secondary)' }} className="mb-4">
          Click "Start Exercise" to explore {voicingName} voicings.
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Learn Drop 2 voicings and triad inversions across the fretboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key & Root Fret Selection */}
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

      {/* String Set Selection (triads only) */}
      {stringSets && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            String Set
          </label>
          <div className="flex gap-2 flex-wrap">
            {stringSets.map((ss, idx) => (
              <button
                key={ss.label}
                onClick={() => { setSelectedStringSet(idx); setSelectedInversion(0); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedStringSet === idx ? 'btn-primary' : ''
                }`}
                style={selectedStringSet !== idx ? {
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)'
                } : {}}
              >
                {ss.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chord Info */}
      <div
        className="p-4 rounded-lg"
        style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
      >
        <h4 className="font-medium mb-2" style={{ color: 'var(--accent-primary)' }}>
          {selectedKey} {voicingName} - {currentInversion.name}
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
          {inversions.map((inv, idx) => (
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
          {isTriad && <li>Compare the same inversion across different string sets</li>}
          <li>Connect inversions to create smooth chord progressions</li>
          <li>Identify the root note in each inversion</li>
          <li>Try playing ii-V-I progressions using these voicings</li>
        </ul>
      </div>
    </div>
  );
};

export default ChordVoicingExercise;
