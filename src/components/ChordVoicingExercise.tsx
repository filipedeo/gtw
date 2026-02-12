import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Exercise } from '../types/exercise';
import { FretPosition, normalizeNoteName } from '../types/guitar';
import { useGuitarStore } from '../stores/guitarStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { playChord, initAudio, stopAllNotes } from '../lib/audioEngine';
import Fretboard from './Fretboard';
import DisplayModeToggle from './DisplayModeToggle';
import PracticeRating from './PracticeRating';

interface ChordVoicingExerciseProps {
  exercise: Exercise;
}

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const KEYS_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface Inversion {
  name: string;
  positions: number[][]; // [stringIndex, fretOffset][]
  intervals: string[];
}

interface StringSet {
  label: string;
  inversions: Inversion[];
  sevenStringOnly?: boolean;
}

// Drop 2 voicings on strings D-G-B-E (6-string indices 2,3,4,5)
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

// Triad voicings — ordered in ascending physical chain so adjacent sets share 2 strings.
// Voice-leading between adjacent sets keeps 2 notes and moves only 1.
// Chain: B-E-A → E-A-D → A-D-G → D-G-B → G-B-E
// String indices are 6-string based; +1 offset applied for 7-string at runtime.
// B-E-A sets use native 7-string indices (sevenStringOnly flag skips offset).

function makeTriadStringSets(inversions: {
  'D-G-B': Inversion[];
  'G-B-E': Inversion[];
  'A-D-G': Inversion[];
  'E-A-D': Inversion[];
  'B-E-A': Inversion[];
}): StringSet[] {
  return [
    { label: 'B-E-A', sevenStringOnly: true, inversions: inversions['B-E-A'] },
    { label: 'E-A-D', inversions: inversions['E-A-D'] },
    { label: 'A-D-G', inversions: inversions['A-D-G'] },
    { label: 'D-G-B', inversions: inversions['D-G-B'] },
    { label: 'G-B-E', inversions: inversions['G-B-E'] },
  ];
}

const TRIAD_VOICINGS: Record<string, { name: string; stringSets: StringSet[] }> = {
  major: {
    name: 'Major Triad',
    stringSets: makeTriadStringSets({
      'D-G-B': [
        { name: 'Root Position', positions: [[2, 2], [3, 1], [4, 0]], intervals: ['R', '3', '5'] },
        { name: '1st Inversion', positions: [[2, 2], [3, 0], [4, 1]], intervals: ['3', '5', 'R'] },
        { name: '2nd Inversion', positions: [[2, 0], [3, 0], [4, 0]], intervals: ['5', 'R', '3'] },
      ],
      'G-B-E': [
        { name: 'Root Position', positions: [[3, 2], [4, 2], [5, 0]], intervals: ['R', '3', '5'] },
        { name: '1st Inversion', positions: [[3, 1], [4, 0], [5, 0]], intervals: ['3', '5', 'R'] },
        { name: '2nd Inversion', positions: [[3, 0], [4, 1], [5, 0]], intervals: ['5', 'R', '3'] },
      ],
      'A-D-G': [
        { name: 'Root Position', positions: [[1, 2], [2, 1], [3, -1]], intervals: ['R', '3', '5'] },
        { name: '1st Inversion', positions: [[1, 2], [2, 0], [3, 0]], intervals: ['3', '5', 'R'] },
        { name: '2nd Inversion', positions: [[1, 0], [2, 0], [3, -1]], intervals: ['5', 'R', '3'] },
      ],
      'E-A-D': [
        { name: 'Root Position', positions: [[0, 2], [1, 1], [2, -1]], intervals: ['R', '3', '5'] },
        { name: '1st Inversion', positions: [[0, 2], [1, 0], [2, 0]], intervals: ['3', '5', 'R'] },
        { name: '2nd Inversion', positions: [[0, 0], [1, 0], [2, -1]], intervals: ['5', 'R', '3'] },
      ],
      'B-E-A': [
        { name: 'Root Position', positions: [[0, 2], [1, 1], [2, -1]], intervals: ['R', '3', '5'] },
        { name: '1st Inversion', positions: [[0, 2], [1, 0], [2, 0]], intervals: ['3', '5', 'R'] },
        { name: '2nd Inversion', positions: [[0, 0], [1, 0], [2, -1]], intervals: ['5', 'R', '3'] },
      ],
    }),
  },
  minor: {
    name: 'Minor Triad',
    stringSets: makeTriadStringSets({
      'D-G-B': [
        { name: 'Root Position', positions: [[2, 2], [3, 0], [4, 0]], intervals: ['R', 'b3', '5'] },
        { name: '1st Inversion', positions: [[2, 1], [3, 0], [4, 1]], intervals: ['b3', '5', 'R'] },
        { name: '2nd Inversion', positions: [[2, 1], [3, 1], [4, 0]], intervals: ['5', 'R', 'b3'] },
      ],
      'G-B-E': [
        { name: 'Root Position', positions: [[3, 2], [4, 1], [5, 0]], intervals: ['R', 'b3', '5'] },
        { name: '1st Inversion', positions: [[3, 1], [4, 1], [5, 1]], intervals: ['b3', '5', 'R'] },
        { name: '2nd Inversion', positions: [[3, 0], [4, 1], [5, -1]], intervals: ['5', 'R', 'b3'] },
      ],
      'A-D-G': [
        { name: 'Root Position', positions: [[1, 2], [2, 0], [3, -1]], intervals: ['R', 'b3', '5'] },
        { name: '1st Inversion', positions: [[1, 1], [2, 0], [3, 0]], intervals: ['b3', '5', 'R'] },
        { name: '2nd Inversion', positions: [[1, 0], [2, 0], [3, -2]], intervals: ['5', 'R', 'b3'] },
      ],
      'E-A-D': [
        { name: 'Root Position', positions: [[0, 2], [1, 0], [2, -1]], intervals: ['R', 'b3', '5'] },
        { name: '1st Inversion', positions: [[0, 1], [1, 0], [2, 0]], intervals: ['b3', '5', 'R'] },
        { name: '2nd Inversion', positions: [[0, 0], [1, 0], [2, -2]], intervals: ['5', 'R', 'b3'] },
      ],
      'B-E-A': [
        { name: 'Root Position', positions: [[0, 2], [1, 0], [2, -1]], intervals: ['R', 'b3', '5'] },
        { name: '1st Inversion', positions: [[0, 1], [1, 0], [2, 0]], intervals: ['b3', '5', 'R'] },
        { name: '2nd Inversion', positions: [[0, 0], [1, 0], [2, -2]], intervals: ['5', 'R', 'b3'] },
      ],
    }),
  },
  diminished: {
    name: 'Diminished Triad',
    stringSets: makeTriadStringSets({
      'D-G-B': [
        { name: 'Root Position', positions: [[2, 2], [3, 0], [4, -1]], intervals: ['R', 'b3', 'b5'] },
        { name: '1st Inversion', positions: [[2, 1], [3, -1], [4, 1]], intervals: ['b3', 'b5', 'R'] },
        { name: '2nd Inversion', positions: [[2, 0], [3, 1], [4, 0]], intervals: ['b5', 'R', 'b3'] },
      ],
      'G-B-E': [
        { name: 'Root Position', positions: [[3, 2], [4, 1], [5, -1]], intervals: ['R', 'b3', 'b5'] },
        { name: '1st Inversion', positions: [[3, 1], [4, 0], [5, 1]], intervals: ['b3', 'b5', 'R'] },
        { name: '2nd Inversion', positions: [[3, 0], [4, 2], [5, 0]], intervals: ['b5', 'R', 'b3'] },
      ],
      'A-D-G': [
        { name: 'Root Position', positions: [[1, 2], [2, 0], [3, -2]], intervals: ['R', 'b3', 'b5'] },
        { name: '1st Inversion', positions: [[1, 1], [2, -1], [3, 0]], intervals: ['b3', 'b5', 'R'] },
        { name: '2nd Inversion', positions: [[1, 0], [2, 1], [3, -1]], intervals: ['b5', 'R', 'b3'] },
      ],
      'E-A-D': [
        { name: 'Root Position', positions: [[0, 2], [1, 0], [2, -2]], intervals: ['R', 'b3', 'b5'] },
        { name: '1st Inversion', positions: [[0, 1], [1, -1], [2, 0]], intervals: ['b3', 'b5', 'R'] },
        { name: '2nd Inversion', positions: [[0, 0], [1, 1], [2, -1]], intervals: ['b5', 'R', 'b3'] },
      ],
      'B-E-A': [
        { name: 'Root Position', positions: [[0, 2], [1, 0], [2, -2]], intervals: ['R', 'b3', 'b5'] },
        { name: '1st Inversion', positions: [[0, 1], [1, -1], [2, 0]], intervals: ['b3', 'b5', 'R'] },
        { name: '2nd Inversion', positions: [[0, 0], [1, 1], [2, -1]], intervals: ['b5', 'R', 'b3'] },
      ],
    }),
  },
  augmented: {
    name: 'Augmented Triad',
    stringSets: makeTriadStringSets({
      'D-G-B': [
        { name: 'Root Position', positions: [[2, 2], [3, 1], [4, 1]], intervals: ['R', '3', '#5'] },
        { name: '1st Inversion', positions: [[2, 1], [3, 0], [4, 0]], intervals: ['3', '#5', 'R'] },
        { name: '2nd Inversion', positions: [[2, 0], [3, -1], [4, -1]], intervals: ['#5', 'R', '3'] },
      ],
      'G-B-E': [
        { name: 'Root Position', positions: [[3, 2], [4, 2], [5, 1]], intervals: ['R', '3', '#5'] },
        { name: '1st Inversion', positions: [[3, 1], [4, 1], [5, 0]], intervals: ['3', '#5', 'R'] },
        { name: '2nd Inversion', positions: [[3, 0], [4, 0], [5, -1]], intervals: ['#5', 'R', '3'] },
      ],
      'A-D-G': [
        { name: 'Root Position', positions: [[1, 2], [2, 1], [3, 0]], intervals: ['R', '3', '#5'] },
        { name: '1st Inversion', positions: [[1, 1], [2, 0], [3, -1]], intervals: ['3', '#5', 'R'] },
        { name: '2nd Inversion', positions: [[1, 0], [2, -1], [3, -2]], intervals: ['#5', 'R', '3'] },
      ],
      'E-A-D': [
        { name: 'Root Position', positions: [[0, 2], [1, 1], [2, 0]], intervals: ['R', '3', '#5'] },
        { name: '1st Inversion', positions: [[0, 1], [1, 0], [2, -1]], intervals: ['3', '#5', 'R'] },
        { name: '2nd Inversion', positions: [[0, 0], [1, -1], [2, -2]], intervals: ['#5', 'R', '3'] },
      ],
      'B-E-A': [
        { name: 'Root Position', positions: [[0, 2], [1, 1], [2, 0]], intervals: ['R', '3', '#5'] },
        { name: '1st Inversion', positions: [[0, 1], [1, 0], [2, -1]], intervals: ['3', '#5', 'R'] },
        { name: '2nd Inversion', positions: [[0, 0], [1, -1], [2, -2]], intervals: ['#5', 'R', '3'] },
      ],
    }),
  },
};

type TriadType = 'major' | 'minor' | 'diminished' | 'augmented';
type Drop2Type = 'maj7' | 'min7' | 'dom7';
type ChordType = Drop2Type | TriadType;

const OPEN_STRING_MIDI: Record<number, number[]> = {
  6: [40, 45, 50, 55, 59, 64],
  7: [35, 40, 45, 50, 55, 59, 64],
};

const TRIAD_TYPES: TriadType[] = ['major', 'minor', 'diminished', 'augmented'];

function isTriadType(t: ChordType): t is TriadType {
  return TRIAD_TYPES.includes(t as TriadType);
}

function getStringOffsetForSet(ss: StringSet, stringCount: number): number {
  if (stringCount !== 7) return 0;
  if (ss.sevenStringOnly) return 0;
  return 1;
}

function computeRootFret(
  key: string,
  inversion: Inversion,
  openStringMidi: number[],
  stringOffset: number,
): number {
  const rootIdx = inversion.intervals.indexOf('R');
  const [baseString, fretOffset] = inversion.positions[rootIdx];
  const stringIdx = baseString + stringOffset;
  const openMidi = openStringMidi[stringIdx];

  const keyPC = KEYS_SHARP.indexOf(normalizeNoteName(key));
  const openPC = openMidi % 12;
  const semitonesFromOpen = ((keyPC - openPC) % 12 + 12) % 12;

  let rootFret = semitonesFromOpen - fretOffset;

  const minOffset = Math.min(...inversion.positions.map(p => p[1]));
  const minRootFret = Math.max(1, -minOffset);

  while (rootFret < minRootFret) rootFret += 12;
  while (rootFret > 14) rootFret -= 12;

  return rootFret;
}

/**
 * Find the inversion on a new string set that preserves the 2 shared-string notes.
 * Adjacent string sets in the chain share exactly 2 strings.
 * Returns the matching inversion index and rootFret, or null if no match.
 */
function findVoiceLeadingInversion(
  currentInv: Inversion,
  currentRf: number,
  currentOffset: number,
  newInversions: Inversion[],
  newOffset: number,
): { inversionIdx: number; rootFret: number } | null {
  // Map: actual string → fret offset for current voicing
  const currentByString = new Map<number, number>();
  for (const [s, fo] of currentInv.positions) {
    currentByString.set(s + currentOffset, fo);
  }

  for (let invIdx = 0; invIdx < newInversions.length; invIdx++) {
    const newInv = newInversions[invIdx];
    const newByString = new Map<number, number>();
    for (const [s, fo] of newInv.positions) {
      newByString.set(s + newOffset, fo);
    }

    // Find shared strings
    const shared: number[] = [];
    for (const s of currentByString.keys()) {
      if (newByString.has(s)) shared.push(s);
    }
    if (shared.length < 2) continue;

    // For each shared string: newRf = currentRf + currentFO - newFO
    const rfValues = shared.map(s => currentRf + currentByString.get(s)! - newByString.get(s)!);

    if (rfValues.every(rf => rf === rfValues[0])) {
      const newRf = rfValues[0];
      const allValid = newInv.positions.every(([, fo]) => {
        const fret = newRf + fo;
        return fret >= 0 && fret <= 22;
      });
      if (allValid) {
        return { inversionIdx: invIdx, rootFret: newRf };
      }
    }
  }

  return null;
}

function positionsToNotes(
  positions: number[][],
  rootFret: number,
  openStringMidi: number[],
  stringOffset: number,
): string[] {
  return positions.map(([baseString, fretOffset]) => {
    const stringIdx = baseString + stringOffset;
    const fret = rootFret + fretOffset;
    const midi = openStringMidi[stringIdx] + fret;
    const noteName = KEYS_SHARP[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${noteName}${octave}`;
  });
}

const ChordVoicingExercise: React.FC<ChordVoicingExerciseProps> = ({ exercise }) => {
  const { setHighlightedPositions, setSecondaryHighlightedPositions, clearHighlights, setRootNote, stringCount } = useGuitarStore();
  const openStringMidi = OPEN_STRING_MIDI[stringCount] || OPEN_STRING_MIDI[6];
  const { isActive } = useExerciseStore();

  const [selectedKey, setSelectedKey] = useState('C');
  const [selectedChordType, setSelectedChordType] = useState<ChordType>('maj7');
  const [selectedInversion, setSelectedInversion] = useState(0);
  const [selectedStringSet, setSelectedStringSet] = useState(0);
  const [showAllInversions, setShowAllInversions] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [rootFret, setRootFret] = useState(5);

  // Ref to prevent the rootFret effect from overwriting voice-led values
  const voiceLeadingRef = useRef(false);

  const isTriad = isTriadType(selectedChordType);

  // Determine chord type based on exercise, default to D-G-B string set
  useEffect(() => {
    let ct: ChordType = 'maj7';
    if (exercise.id.includes('chord-1')) ct = 'maj7';
    else if (exercise.id.includes('chord-2')) ct = 'min7';
    else if (exercise.id.includes('chord-3')) ct = 'dom7';
    else if (exercise.id.includes('chord-4')) ct = 'major';
    else if (exercise.id.includes('chord-5')) ct = 'minor';
    else if (exercise.id.includes('chord-6')) ct = 'diminished';
    else if (exercise.id.includes('chord-7')) ct = 'augmented';
    setSelectedChordType(ct);
    setSelectedInversion(0);

    // Default to D-G-B for triads
    if (isTriadType(ct)) {
      const sets = TRIAD_VOICINGS[ct].stringSets.filter(
        ss => !ss.sevenStringOnly || stringCount === 7
      );
      const dgbIdx = sets.findIndex(ss => ss.label === 'D-G-B');
      setSelectedStringSet(dgbIdx >= 0 ? dgbIdx : 0);
    } else {
      setSelectedStringSet(0);
    }
  }, [exercise.id, stringCount]);

  const voicingName = useMemo(() => {
    if (isTriad) return TRIAD_VOICINGS[selectedChordType].name;
    return DROP2_VOICINGS[selectedChordType as Drop2Type].name;
  }, [selectedChordType, isTriad]);

  // Filter string sets for current string count
  const availableStringSets = useMemo(() => {
    if (!isTriad) return null;
    return TRIAD_VOICINGS[selectedChordType].stringSets.filter(
      ss => !ss.sevenStringOnly || stringCount === 7
    );
  }, [selectedChordType, isTriad, stringCount]);

  // Clamp string set index
  const clampedStringSet = availableStringSets
    ? Math.min(selectedStringSet, availableStringSets.length - 1)
    : 0;

  const inversions = useMemo((): Inversion[] => {
    if (isTriad) {
      if (!availableStringSets || availableStringSets.length === 0) return [];
      return availableStringSets[clampedStringSet]?.inversions || availableStringSets[0].inversions;
    }
    return DROP2_VOICINGS[selectedChordType as Drop2Type].inversions;
  }, [selectedChordType, isTriad, clampedStringSet, availableStringSets]);

  const clampedInversion = Math.min(selectedInversion, Math.max(0, inversions.length - 1));
  const currentInversion = inversions[clampedInversion] || inversions[0];

  const stringOffset = useMemo(() => {
    if (stringCount !== 7) return 0;
    if (isTriad && availableStringSets) {
      const ss = availableStringSets[clampedStringSet] || availableStringSets[0];
      if (ss?.sevenStringOnly) return 0;
    }
    return 1;
  }, [stringCount, isTriad, availableStringSets, clampedStringSet]);

  // Compute rootFret when key, chord type, or inversion changes.
  // Skipped when voice-leading just set rootFret directly.
  useEffect(() => {
    if (voiceLeadingRef.current) {
      voiceLeadingRef.current = false;
      return;
    }
    if (!currentInversion) return;
    setRootFret(computeRootFret(selectedKey, currentInversion, openStringMidi, stringOffset));
  }, [selectedKey, selectedChordType, clampedInversion, stringOffset, currentInversion, openStringMidi]);

  // Voice-leading handler for string set transitions
  const handleStringSetChange = (newIdx: number) => {
    if (newIdx === clampedStringSet || !availableStringSets) return;

    let invIdx = clampedInversion;
    let rf = rootFret;
    let ssIdx = clampedStringSet;

    const direction = newIdx > ssIdx ? 1 : -1;

    // Chain through each intermediate string set
    while (ssIdx !== newIdx) {
      const nextSsIdx = ssIdx + direction;
      const currSS = availableStringSets[ssIdx];
      const nextSS = availableStringSets[nextSsIdx];
      if (!currSS || !nextSS) break;

      const currOffset = getStringOffsetForSet(currSS, stringCount);
      const nextOffset = getStringOffsetForSet(nextSS, stringCount);
      const currInv = currSS.inversions[invIdx] || currSS.inversions[0];

      const result = findVoiceLeadingInversion(
        currInv, rf, currOffset,
        nextSS.inversions, nextOffset,
      );

      if (result) {
        invIdx = result.inversionIdx;
        rf = result.rootFret;
      } else {
        // Fallback: keep same inversion index, recompute rootFret
        invIdx = Math.min(invIdx, nextSS.inversions.length - 1);
        const fallbackInv = nextSS.inversions[invIdx] || nextSS.inversions[0];
        rf = computeRootFret(selectedKey, fallbackInv, openStringMidi,
          getStringOffsetForSet(nextSS, stringCount));
      }

      ssIdx = nextSsIdx;
    }

    voiceLeadingRef.current = true;
    setSelectedStringSet(newIdx);
    setSelectedInversion(invIdx);
    setRootFret(rf);
  };

  // Update fretboard positions
  useEffect(() => {
    if (!isActive || !currentInversion) return;

    const positions: FretPosition[] = currentInversion.positions.map(([baseString, fretOffset]) => ({
      string: baseString + stringOffset,
      fret: rootFret + fretOffset,
    })).filter(pos => pos.fret >= 0 && pos.fret <= 22);

    setHighlightedPositions(positions);
    setRootNote(normalizeNoteName(selectedKey));

    if (showAllInversions) {
      const secondary: FretPosition[] = [];
      inversions.forEach((inv, idx) => {
        if (idx === clampedInversion) return;
        const rf = computeRootFret(selectedKey, inv, openStringMidi, stringOffset);
        inv.positions.forEach(([baseString, fretOffset]) => {
          const fret = rf + fretOffset;
          if (fret >= 0 && fret <= 22) {
            secondary.push({ string: baseString + stringOffset, fret });
          }
        });
      });
      setSecondaryHighlightedPositions(secondary);
    } else {
      setSecondaryHighlightedPositions([]);
    }
  }, [isActive, selectedKey, selectedChordType, clampedInversion, clampedStringSet,
      rootFret, stringOffset, showAllInversions, currentInversion, inversions,
      openStringMidi, setHighlightedPositions, setSecondaryHighlightedPositions, setRootNote]);

  // Auto-play chord when settings change
  useEffect(() => {
    if (!autoPlay || !isActive || !currentInversion) return;
    const timer = setTimeout(async () => {
      await initAudio();
      stopAllNotes();
      const notes = positionsToNotes(currentInversion.positions, rootFret, openStringMidi, stringOffset);
      playChord(notes, { duration: 2, velocity: 0.6 });
    }, 50);
    return () => clearTimeout(timer);
  }, [autoPlay, isActive, selectedKey, selectedChordType, clampedInversion, clampedStringSet,
      rootFret, stringOffset, currentInversion, openStringMidi]);

  // Cleanup
  useEffect(() => {
    return () => { clearHighlights(); };
  }, [clearHighlights]);

  const handlePlayChord = async () => {
    await initAudio();
    if (!currentInversion) return;
    const notes = positionsToNotes(currentInversion.positions, rootFret, openStringMidi, stringOffset);
    playChord(notes, { duration: 2, velocity: 0.6 });
  };

  return (
    <div className="space-y-6">
      {/* Key Selection */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Key
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {KEYS.map(key => (
            <button
              key={key}
              onClick={() => setSelectedKey(key)}
              className={`px-2.5 py-1.5 rounded text-sm font-medium transition-all ${
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

      {/* String Set Selection (triads only) */}
      {availableStringSets && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            String Set
          </label>
          <div className="flex gap-2 flex-wrap">
            {availableStringSets.map((ss, idx) => (
              <button
                key={ss.label}
                onClick={() => handleStringSetChange(idx)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  clampedStringSet === idx ? 'btn-primary' : ''
                }`}
                style={clampedStringSet !== idx ? {
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
          {selectedKey} {voicingName} - {currentInversion?.name}
        </h4>
        <div className="flex gap-2 text-sm flex-wrap" style={{ color: 'var(--text-secondary)' }}>
          <span>Intervals:</span>
          {currentInversion?.intervals.map((interval, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              {interval}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Position: fret {rootFret}
          </span>
          <DisplayModeToggle compact />
        </div>
      </div>

      {/* Inversion Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Inversion
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={showAllInversions}
              onChange={(e) => setShowAllInversions(e.target.checked)}
              className="rounded"
            />
            Show all inversions
          </label>
        </div>
        <div className="flex gap-2 flex-wrap">
          {inversions.map((inv, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedInversion(idx)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                clampedInversion === idx ? 'btn-primary' : ''
              }`}
              style={clampedInversion !== idx ? {
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
      <div className="flex gap-3 items-center">
        <button
          onClick={handlePlayChord}
          className="btn-primary flex items-center gap-2"
        >
          Play Chord
        </button>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={autoPlay}
            onChange={(e) => setAutoPlay(e.target.checked)}
            className="rounded"
          />
          Auto-play
        </label>
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

      {/* Self-Assessment */}
      <PracticeRating exerciseId={exercise.id} exerciseType={exercise.type} />
    </div>
  );
};

export default ChordVoicingExercise;
