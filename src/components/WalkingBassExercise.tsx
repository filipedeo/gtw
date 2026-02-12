import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as Tone from 'tone';
import { Exercise } from '../types/exercise';
import { useGuitarStore } from '../stores/guitarStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { getScalePositions } from '../utils/fretboardCalculations';
import { getModeNotes, buildProgressionChords, NOTE_NAMES } from '../lib/theoryEngine';
import { initAudio, playNote } from '../lib/audioEngine';
import { normalizeNoteName } from '../types/guitar';
import { JAM_PROGRESSIONS } from '../data/jamProgressions';
import Fretboard from './Fretboard';
import DisplayModeToggle from './DisplayModeToggle';
import PracticeRating from './PracticeRating';

interface WalkingBassExerciseProps {
  exercise: Exercise;
}

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// Map exercise IDs to default genre filter for initial progression selection
const EXERCISE_GENRE_MAP: Record<string, string> = {
  'bass-walk-1': 'Blues',
  'bass-walk-2': 'Jazz',
  'bass-walk-3': 'Rock',
};

function getDefaultProgressionIndex(exerciseId: string): number {
  const genre = EXERCISE_GENRE_MAP[exerciseId];
  if (!genre) return 0;
  const idx = JAM_PROGRESSIONS.findIndex(p => p.genre === genre);
  return idx >= 0 ? idx : 0;
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

/**
 * Generate a walking bass line for a chord progression.
 * Each chord gets `beatsPerChord` notes following the pattern:
 *   Beat 1: root
 *   Beat 2: 3rd (or 5th for triads)
 *   Beat 3: 5th
 *   Beat 4: chromatic approach to next chord root
 */
function generateWalkingLine(
  key: string,
  degrees: (number | string)[],
  beatsPerChord: number
): { note: string; chordIndex: number }[] {
  const chords = buildProgressionChords(key, degrees);
  const line: { note: string; chordIndex: number }[] = [];

  for (let i = 0; i < chords.length; i++) {
    const chord = chords[i];
    const nextChord = chords[(i + 1) % chords.length];
    const rootIndex = NOTE_NAMES.indexOf(chord.root);
    if (rootIndex === -1) continue;

    // Beat 1: root
    line.push({ note: `${chord.root}2`, chordIndex: i });

    if (beatsPerChord >= 2) {
      // Beat 2: 3rd
      const thirdSemitones = chord.intervals.length > 1 ? chord.intervals[1] : 4;
      const thirdIndex = (rootIndex + thirdSemitones) % 12;
      line.push({ note: `${NOTE_NAMES[thirdIndex]}2`, chordIndex: i });
    }
    if (beatsPerChord >= 3) {
      // Beat 3: 5th
      const fifthSemitones = chord.intervals.length > 2 ? chord.intervals[2] : 7;
      const fifthIndex = (rootIndex + fifthSemitones) % 12;
      line.push({ note: `${NOTE_NAMES[fifthIndex]}2`, chordIndex: i });
    }
    if (beatsPerChord >= 4) {
      // Beat 4: chromatic approach to next root
      const nextRootIndex = NOTE_NAMES.indexOf(nextChord.root);
      if (nextRootIndex !== -1) {
        const approachIndex = (nextRootIndex - 1 + 12) % 12;
        line.push({ note: `${NOTE_NAMES[approachIndex]}2`, chordIndex: i });
      } else {
        // Fallback: repeat 5th
        const fifthSemitones = chord.intervals.length > 2 ? chord.intervals[2] : 7;
        const fifthIndex = (rootIndex + fifthSemitones) % 12;
        line.push({ note: `${NOTE_NAMES[fifthIndex]}2`, chordIndex: i });
      }
    }
  }
  return line;
}

const WalkingBassExercise: React.FC<WalkingBassExerciseProps> = ({ exercise }) => {
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

  const [selectedKey, setSelectedKey] = useState('C');
  const [selectedProgressionIndex, setSelectedProgressionIndex] = useState(() =>
    getDefaultProgressionIndex(exercise.id)
  );
  const [bpm, setBpm] = useState(80);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeatIndex, setCurrentBeatIndex] = useState(-1);
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

  // Generate the walking line (memoized to prevent infinite re-render loops)
  const walkingLine = useMemo(
    () => generateWalkingLine(selectedKey, progression.degrees, progression.beatsPerChord),
    [selectedKey, progression.degrees, progression.beatsPerChord]
  );

  // Collect unique note names from the walking line for secondary fretboard highlighting
  const walkingLineNoteNames = useMemo(
    () => [...new Set(walkingLine.map(item => normalizeNoteName(item.note.replace(/\d+$/, ''))))],
    [walkingLine]
  );

  // Update fretboard scale highlights
  useEffect(() => {
    if (!isActive) return;

    try {
      const normalizedKey = normalizeNoteName(selectedKey);
      const scaleNotes = getModeNotes(normalizedKey, progression.suggestedScale);

      if (scaleNotes && scaleNotes.length > 0) {
        const scalePositions = getScalePositions(scaleNotes, tuning, stringCount, maxFret);
        setHighlightedPositions(scalePositions);
        setRootNote(normalizedKey);

        // Secondary: walking line chord tones
        const walkingPositions = getScalePositions(walkingLineNoteNames, tuning, stringCount, maxFret);
        setSecondaryHighlightedPositions(walkingPositions);
      }
    } catch (e) {
      console.error('Error updating walking bass fretboard:', e);
    }
  }, [
    selectedKey, selectedProgressionIndex, showFullFretboard,
    isActive, stringCount, tuning, maxFret, progression,
    walkingLineNoteNames,
    setHighlightedPositions, setSecondaryHighlightedPositions, setRootNote,
  ]);

  const stopPlayback = useCallback(() => {
    if (loopRef.current) {
      loopRef.current.stop();
      loopRef.current.dispose();
      loopRef.current = null;
    }
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentBeatIndex(-1);
  }, []);

  const startPlayback = useCallback(async () => {
    await initAudio();
    await Tone.start();

    if (walkingLine.length === 0) return;

    const transport = Tone.getTransport();
    transport.bpm.value = bpm;
    transport.cancel();

    let beatIndex = 0;

    loopRef.current = new Tone.Loop((time) => {
      const currentIdx = beatIndex % walkingLine.length;
      const noteData = walkingLine[currentIdx];

      // Schedule UI update
      Tone.getDraw().schedule(() => {
        setCurrentBeatIndex(currentIdx);
      }, time);

      // Play the note
      try {
        const synth = new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.4 },
        }).toDestination();
        synth.volume.value = -6;
        synth.triggerAttackRelease(noteData.note, '8n', time);
        // Dispose after note plays
        synth.triggerRelease(time + 0.4);
        setTimeout(() => synth.dispose(), 2000);
      } catch (e) {
        // Fallback: use the shared playNote
        playNote(noteData.note, { duration: 0.4, velocity: 0.7 });
      }

      beatIndex = (beatIndex + 1) % walkingLine.length;
    }, '4n');

    loopRef.current.start(0);
    transport.start();
    isPlayingRef.current = true;
    setIsPlaying(true);
  }, [bpm, walkingLine]);

  const handleTogglePlayback = useCallback(async () => {
    if (isPlayingRef.current) {
      stopPlayback();
    } else {
      await startPlayback();
    }
  }, [startPlayback, stopPlayback]);

  // Update BPM while playing
  useEffect(() => {
    if (isPlayingRef.current) {
      Tone.getTransport().bpm.value = bpm;
    }
  }, [bpm]);

  // Stop playback when key or progression changes
  useEffect(() => {
    if (isPlayingRef.current) {
      stopPlayback();
    }
  }, [selectedKey, selectedProgressionIndex, stopPlayback]);

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
            onChange={(e) => setSelectedKey(e.target.value)}
            className="w-full px-3 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
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
            onChange={(e) => setSelectedProgressionIndex(parseInt(e.target.value))}
            className="w-full px-3 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            {genres.map(genre => (
              <optgroup key={genre} label={genre}>
                {JAM_PROGRESSIONS.map((prog, idx) =>
                  prog.genre === genre ? (
                    <option key={idx} value={idx}>{prog.name}</option>
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
            min={40}
            max={160}
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
            const isCurrentChord = isPlaying && currentBeatIndex >= 0 &&
              walkingLine[currentBeatIndex]?.chordIndex === idx;
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

      {/* Walking Line Display — grouped in rows of 4 bars */}
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
        <h4 className="font-medium mb-2" style={{ color: 'var(--accent-primary)' }}>
          Walking Line
        </h4>
        <div className="space-y-1.5">
          {(() => {
            const bpc = progression.beatsPerChord;
            const totalBars = Math.ceil(walkingLine.length / bpc);
            const barsPerRow = 4;
            const rows: number[][] = [];
            for (let r = 0; r < totalBars; r += barsPerRow) {
              rows.push(Array.from({ length: Math.min(barsPerRow, totalBars - r) }, (_, i) => r + i));
            }
            return rows.map((rowBars, rowIdx) => (
              <div key={rowIdx} className="flex flex-wrap gap-1 items-center">
                {rowBars.map((barIdx) => {
                  const start = barIdx * bpc;
                  const barNotes = walkingLine.slice(start, start + bpc);
                  return (
                    <React.Fragment key={barIdx}>
                      {barIdx > rowBars[0] && (
                        <span className="text-xs self-center mx-0.5" style={{ color: 'var(--text-muted)' }}>|</span>
                      )}
                      {barNotes.map((item, beatIdx) => {
                        const globalIdx = start + beatIdx;
                        const isCurrentBeat = isPlaying && globalIdx === currentBeatIndex;
                        const noteName = item.note.replace(/\d+$/, '');
                        return (
                          <span
                            key={globalIdx}
                            className="inline-flex items-center justify-center w-8 h-8 rounded text-xs font-mono font-medium transition-all"
                            style={{
                              backgroundColor: isCurrentBeat ? 'var(--accent-primary)' : 'var(--bg-primary)',
                              color: isCurrentBeat ? 'white' : 'var(--text-primary)',
                              border: `1px solid ${isCurrentBeat ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                              transform: isCurrentBeat ? 'scale(1.15)' : 'scale(1)',
                            }}
                          >
                            {noteName}
                          </span>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
                <span className="text-xs self-center mx-0.5" style={{ color: 'var(--text-muted)' }}>|</span>
              </div>
            ));
          })()}
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          Pattern: Root - 3rd - 5th - Chromatic approach
        </p>
      </div>

      {/* Display Options */}
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

      {/* Fretboard */}
      <div className="card p-4">
        <Fretboard interactive={true} />
      </div>

      {/* Practice Tips */}
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <h4 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Practice Tips</h4>
        <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: 'var(--text-secondary)' }}>
          <li>Beat 1 is always the root -- anchor the harmony on the downbeat</li>
          <li>Beats 2 and 3 use chord tones (3rd, 5th) to outline the chord quality</li>
          <li>Beat 4 uses a chromatic approach note to lead into the next chord</li>
          <li>Keep your right hand steady -- the bass drives the groove</li>
          <li>Practice at slow tempos first (60-80 BPM) and build up gradually</li>
          <li>Try to play along with the generated line, then create your own variations</li>
          <li>Use scale passing tones between chord tones for melodic interest</li>
        </ul>
      </div>

      {/* Self-Assessment */}
      <PracticeRating exerciseId={exercise.id} exerciseType={exercise.type} />
    </div>
  );
};

export default WalkingBassExercise;
