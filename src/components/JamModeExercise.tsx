import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { Exercise } from '../types/exercise';
import { useGuitarStore } from '../stores/guitarStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { initAudio, playChord } from '../lib/audioEngine';
import { buildProgressionChords, getModeNotes, NOTE_NAMES } from '../lib/theoryEngine';
import { getScalePositions } from '../utils/fretboardCalculations';
import { normalizeNoteName } from '../types/guitar';
import { JAM_PROGRESSIONS } from '../data/jamProgressions';
import DisplayModeToggle from './DisplayModeToggle';
import PracticeRating from './PracticeRating';

interface JamModeExerciseProps {
  exercise: Exercise;
}

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// Map exercise IDs to default genre filter for initial progression selection
const EXERCISE_GENRE_MAP: Record<string, string> = {
  'jam-1': 'Blues',
  'jam-2': 'Rock',
  'jam-3': 'Pop',
  'jam-4': 'Jazz',
};

function getDefaultProgressionIndex(exerciseId: string): number {
  const genre = EXERCISE_GENRE_MAP[exerciseId];
  if (!genre) return 0;
  const idx = JAM_PROGRESSIONS.findIndex(p => p.genre === genre);
  return idx >= 0 ? idx : 0;
}

/** Convert chord data (root + semitone intervals) to playable note names with octaves */
function chordToNotes(root: string, intervals: number[]): string[] {
  const rootIndex = NOTE_NAMES.indexOf(root);
  if (rootIndex === -1) return [];
  return intervals.map(semitones => {
    const noteIndex = (rootIndex + semitones) % 12;
    const octave = semitones >= 12 ? 4 : 3;
    return `${NOTE_NAMES[noteIndex]}${octave}`;
  });
}

/** Get unique genres from progressions, preserving order of first appearance */
function getGenres(): string[] {
  const seen = new Set<string>();
  const genres: string[] = [];
  for (const p of JAM_PROGRESSIONS) {
    if (!seen.has(p.genre)) {
      seen.add(p.genre);
      genres.push(p.genre);
    }
  }
  return genres;
}

const JamModeExercise: React.FC<JamModeExerciseProps> = ({ exercise }) => {
  const {
    stringCount,
    tuning,
    fretCount,
    setHighlightedPositions,
    setSecondaryHighlightedPositions,
    setRootNote,
    clearHighlights,
  } = useGuitarStore();
  const { isActive } = useExerciseStore();

  const [selectedKey, setSelectedKey] = useState('A');
  const [selectedProgressionIndex, setSelectedProgressionIndex] = useState(() =>
    getDefaultProgressionIndex(exercise.id)
  );
  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [showFullFretboard, setShowFullFretboard] = useState(false);

  const loopRef = useRef<Tone.Loop | null>(null);
  const isPlayingRef = useRef(false);

  const progression = JAM_PROGRESSIONS[selectedProgressionIndex];
  const genres = getGenres();

  // Reset progression index when exercise changes
  useEffect(() => {
    const idx = getDefaultProgressionIndex(exercise.id);
    setSelectedProgressionIndex(idx);
  }, [exercise.id]);

  const maxFret = showFullFretboard ? fretCount : 12;

  // Update fretboard scale highlights when key/progression/chord changes
  useEffect(() => {
    if (!isActive) return;

    try {
      const normalizedKey = normalizeNoteName(selectedKey);
      const scaleNotes = getModeNotes(normalizedKey, progression.suggestedScale);

      if (scaleNotes && scaleNotes.length > 0) {
        // Primary: full suggested scale
        const scalePositions = getScalePositions(scaleNotes, tuning, stringCount, maxFret);
        setHighlightedPositions(scalePositions);
        setRootNote(normalizedKey);

        // Secondary: chord tones of current chord
        const chords = buildProgressionChords(selectedKey, progression.degrees);
        if (chords.length > 0) {
          const currentChord = chords[currentChordIndex % chords.length];
          const chordNoteNames = currentChord.intervals.map(semitones => {
            const rootIdx = NOTE_NAMES.indexOf(currentChord.root);
            return NOTE_NAMES[(rootIdx + semitones) % 12];
          });
          const chordPositions = getScalePositions(chordNoteNames, tuning, stringCount, maxFret);
          setSecondaryHighlightedPositions(chordPositions);
        }
      }
    } catch (e) {
      console.error('Error updating jam fretboard:', e);
    }
  }, [
    selectedKey, selectedProgressionIndex, currentChordIndex, showFullFretboard,
    isActive, stringCount, tuning, maxFret, progression,
    setHighlightedPositions, setSecondaryHighlightedPositions, setRootNote,
  ]);

  const stopJam = useCallback(() => {
    if (loopRef.current) {
      loopRef.current.stop();
      loopRef.current.dispose();
      loopRef.current = null;
    }
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentChordIndex(0);
  }, []);

  const startJam = useCallback(async () => {
    await initAudio();
    await Tone.start();

    const chords = buildProgressionChords(selectedKey, progression.degrees);
    if (chords.length === 0) return;

    const transport = Tone.getTransport();
    transport.bpm.value = bpm;
    transport.cancel(); // clear previous events

    let beatIndex = 0;
    const totalBeats = chords.length * progression.beatsPerChord;

    loopRef.current = new Tone.Loop((time) => {
      const chordIndex = Math.floor(beatIndex / progression.beatsPerChord) % chords.length;

      // Update UI on main thread
      Tone.getDraw().schedule(() => {
        setCurrentChordIndex(chordIndex);
      }, time);

      // Play chord on first beat of each chord
      if (beatIndex % progression.beatsPerChord === 0) {
        const chord = chords[chordIndex];
        const notes = chordToNotes(chord.root, chord.intervals);
        const chordDuration = (60 / bpm) * progression.beatsPerChord * 0.9;
        playChord(notes, { duration: chordDuration });
      }

      beatIndex = (beatIndex + 1) % totalBeats;
    }, '4n');

    loopRef.current.start(0);
    transport.start();
    isPlayingRef.current = true;
    setIsPlaying(true);
  }, [selectedKey, progression, bpm]);

  const handleTogglePlayback = useCallback(async () => {
    if (isPlayingRef.current) {
      stopJam();
    } else {
      await startJam();
    }
  }, [startJam, stopJam]);

  // Stop playback when BPM changes while playing
  useEffect(() => {
    if (isPlayingRef.current) {
      Tone.getTransport().bpm.value = bpm;
    }
  }, [bpm]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loopRef.current) {
        loopRef.current.stop();
        loopRef.current.dispose();
        loopRef.current = null;
      }
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      clearHighlights();
    };
  }, [clearHighlights]);

  // Build chord progression for display
  const chords = buildProgressionChords(selectedKey, progression.degrees);

  return (
    <div className="space-y-6">
      {/* Key + Progression selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Key
          </label>
          <select
            value={selectedKey}
            onChange={(e) => {
              setSelectedKey(e.target.value);
              if (isPlayingRef.current) {
                stopJam();
              }
            }}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          >
            {KEYS.map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Progression
          </label>
          <select
            value={selectedProgressionIndex}
            onChange={(e) => {
              setSelectedProgressionIndex(parseInt(e.target.value));
              if (isPlayingRef.current) {
                stopJam();
              }
            }}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          >
            {genres.map(genre => (
              <optgroup key={genre} label={genre}>
                {JAM_PROGRESSIONS.map((prog, idx) =>
                  prog.genre === genre ? (
                    <option key={idx} value={idx}>
                      {prog.name}
                    </option>
                  ) : null
                )}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* BPM slider + Play/Stop */}
      <div className="flex items-center gap-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Tempo
            </label>
            <span className="text-sm font-mono" style={{ color: 'var(--accent-primary)' }}>
              {bpm} BPM
            </span>
          </div>
          <input
            type="range"
            min={60}
            max={200}
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        <button
          onClick={handleTogglePlayback}
          className="px-6 py-2 rounded-lg font-medium transition-colors text-white min-w-[100px]"
          style={{ backgroundColor: isPlaying ? 'var(--error)' : 'var(--success)' }}
        >
          {isPlaying ? 'Stop' : 'Play'}
        </button>
      </div>

      {/* Chord progression display */}
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {progression.name}
          </h4>
          <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}>
            {progression.suggestedScale}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {progression.numerals.map((numeral, idx) => {
            const isCurrentChord = idx === currentChordIndex && isPlaying;
            const chord = chords[idx];
            const chordRoot = chord ? chord.root : '';
            return (
              <div
                key={idx}
                className="flex flex-col items-center px-3 py-2 rounded-lg transition-all min-w-[48px]"
                style={{
                  backgroundColor: isCurrentChord ? 'var(--accent-primary)' : 'var(--bg-primary)',
                  color: isCurrentChord ? 'white' : 'var(--text-primary)',
                  border: `1px solid ${isCurrentChord ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  transform: isCurrentChord ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                <span className="text-sm font-bold">{numeral}</span>
                <span className="text-xs opacity-70">{chordRoot}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Display options */}
      <div className="flex items-center gap-4">
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

      {/* Scale info */}
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--accent-primary)' }}>
        <h4 className="font-medium mb-2" style={{ color: 'var(--accent-primary)' }}>
          Suggested Scale: {progression.suggestedScale.charAt(0).toUpperCase() + progression.suggestedScale.slice(1)}
        </h4>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          The scale is highlighted on the fretboard. Chord tones of the current chord are shown with secondary highlights.
          Target chord tones on beat 1 of each chord change for stronger phrasing.
        </p>
      </div>

      {/* Self-Assessment */}
      <PracticeRating exerciseId={exercise.id} exerciseType={exercise.type} />
    </div>
  );
};

export default JamModeExercise;
