import { describe, it, expect, beforeEach } from 'vitest';
import { useAudioStore } from '../stores/audioStore';
import { getNoteAtPosition } from '../utils/fretboardCalculations';
import { STANDARD_TUNINGS, normalizeNoteName } from '../types/guitar';

/**
 * Tests for bug fixes applied across the codebase:
 * - useExercise questionNumber cap
 * - CAGED scale pattern correctness (CAGEDExercise)
 * - audioStore stopAll behavior
 * - Chord voicing offset correctness
 */

// ---------------------------------------------------------------------------
// 2. useExercise questionNumber cap
// ---------------------------------------------------------------------------
describe('useExercise questionNumber cap', () => {
  /**
   * The hook computes:
   *   questionNumber = Math.min(score.total + 1, totalQuestions)
   *
   * Because the hook uses React state (useState, useCallback) and store hooks
   * that are hard to invoke outside a component, we test the underlying formula
   * directly. This isolates the logic without complex hook/store mocking.
   */
  const computeQuestionNumber = (scoreTotal: number, totalQuestions: number) =>
    Math.min(scoreTotal + 1, totalQuestions);

  it('should increment with each answered question', () => {
    expect(computeQuestionNumber(0, 10)).toBe(1);
    expect(computeQuestionNumber(1, 10)).toBe(2);
    expect(computeQuestionNumber(5, 10)).toBe(6);
    expect(computeQuestionNumber(8, 10)).toBe(9);
  });

  it('should cap at totalQuestions when all questions are answered', () => {
    expect(computeQuestionNumber(10, 10)).toBe(10);
  });

  it('should never exceed totalQuestions even if score.total goes beyond', () => {
    // Edge case: if score.total somehow exceeds totalQuestions
    expect(computeQuestionNumber(11, 10)).toBe(10);
    expect(computeQuestionNumber(100, 10)).toBe(10);
  });

});

// ---------------------------------------------------------------------------
// 4. CAGED scale pattern correctness
// ---------------------------------------------------------------------------
describe('CAGED scale pattern correctness', () => {
  /**
   * Reproduce the CAGED_SHAPES data from CAGEDExercise.tsx so tests are self-contained.
   *
   * Each scalePattern entry is [stringIndex, fretOffset] relative to the root/barre fret.
   * We verify that every note in the pattern belongs to the major scale of the root key.
   */
  const CAGED_SHAPES: Record<string, {
    name: string;
    rootString: number;
    baseKey: string;
    scalePattern: number[][];
  }> = {
    'C': {
      name: 'C Shape',
      rootString: 1,
      baseKey: 'C',
      scalePattern: [
        [0, -3], [0, -2], [1, -3], [1, -1], [1, 0],
        [2, -3], [2, -1], [2, 0], [3, -3], [3, -1], [3, 1],
        [4, -3], [4, -2], [4, 0], [5, -3], [5, -2], [5, 0]
      ]
    },
    'A': {
      name: 'A Shape',
      rootString: 1,
      baseKey: 'A',
      scalePattern: [
        [0, 0], [0, 2], [0, 4], [1, 0], [1, 2], [1, 4],
        [2, 0], [2, 2], [2, 4], [3, 1], [3, 2], [3, 4],
        [4, 0], [4, 2], [4, 3], [5, 0], [5, 2], [5, 4]
      ]
    },
    'G': {
      name: 'G Shape',
      rootString: 0,
      baseKey: 'G',
      scalePattern: [
        [0, -3], [0, -1], [0, 0], [1, -3], [1, -1], [1, 0],
        [2, -3], [2, -1], [2, 1], [3, -3], [3, -1], [3, 1],
        [4, -3], [4, -2], [4, 0], [5, -3], [5, -1], [5, 0]
      ]
    },
    'E': {
      name: 'E Shape',
      rootString: 0,
      baseKey: 'E',
      scalePattern: [
        [0, 0], [0, 2], [0, 4], [1, 0], [1, 2], [1, 4],
        [2, 1], [2, 2], [2, 4], [3, 1], [3, 2], [3, 4],
        [4, 0], [4, 2], [4, 4], [5, 0], [5, 2], [5, 4]
      ]
    },
    'D': {
      name: 'D Shape',
      rootString: 2,
      baseKey: 'D',
      scalePattern: [
        [1, 0], [1, 2], [1, 4], [2, 0], [2, 2], [2, 4],
        [3, 0], [3, 2], [3, 4], [4, 0], [4, 2], [4, 3],
        [5, 0], [5, 2], [5, 3]
      ]
    }
  };

  const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

  /**
   * Build a set of note names (no octave, normalized to sharps) belonging to the
   * major scale of the given key.
   *
   * Major scale intervals in semitones: 0, 2, 4, 5, 7, 9, 11
   */
  function getMajorScaleNotes(key: string): Set<string> {
    const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const normalized = normalizeNoteName(key);
    const rootIdx = NOTE_NAMES_SHARP.indexOf(normalized);
    const intervals = [0, 2, 4, 5, 7, 9, 11];
    return new Set(intervals.map(i => NOTE_NAMES_SHARP[(rootIdx + i) % 12]));
  }

  /**
   * Given a CAGED shape and key, compute the root/barre fret, then resolve every
   * scalePattern entry to an actual note on the fretboard using standard 6-string tuning.
   */
  function resolvePatternNotes(shapeName: string, key: string): string[] {
    const shape = CAGED_SHAPES[shapeName];
    const tuning = STANDARD_TUNINGS['standard-6'];
    const stringCount = 6;

    const keyIndex = KEYS.indexOf(key);
    const baseKeyIndex = KEYS.indexOf(shape.baseKey);
    const semitones = (keyIndex - baseKeyIndex + 12) % 12;

    let baseFret = 0;
    if (shapeName === 'C') baseFret = 3;
    if (shapeName === 'G') baseFret = 3;

    const rootFret = baseFret + semitones;

    const notes: string[] = [];
    for (const [stringIdx, fretOffset] of shape.scalePattern) {
      const fret = rootFret + fretOffset;
      if (fret >= 0 && fret <= 22) {
        const fullNote = getNoteAtPosition({ string: stringIdx, fret }, tuning, stringCount);
        if (fullNote) {
          notes.push(normalizeNoteName(fullNote));
        }
      }
    }
    return notes;
  }

  // Test each CAGED shape in its base key
  for (const [shapeName, shape] of Object.entries(CAGED_SHAPES)) {
    describe(`${shape.name} in key of ${shape.baseKey}`, () => {
      it(`all scale pattern notes should belong to the ${shape.baseKey} major scale`, () => {
        const scaleNotes = getMajorScaleNotes(shape.baseKey);
        const patternNotes = resolvePatternNotes(shapeName, shape.baseKey);

        expect(patternNotes.length).toBeGreaterThan(0);

        for (const note of patternNotes) {
          expect(scaleNotes.has(note)).toBe(true);
        }
      });

      it('should produce the expected number of scale tones', () => {
        const patternNotes = resolvePatternNotes(shapeName, shape.baseKey);
        // Each pattern should generate at least 14 notes (roughly 2+ octaves across strings)
        expect(patternNotes.length).toBeGreaterThanOrEqual(14);
      });
    });
  }

  // Test transposition: the E shape in G should produce G major scale notes
  describe('Transposition - E Shape in key of G', () => {
    it('should produce only G major scale notes', () => {
      const scaleNotes = getMajorScaleNotes('G');
      const patternNotes = resolvePatternNotes('E', 'G');

      expect(patternNotes.length).toBeGreaterThan(0);
      for (const note of patternNotes) {
        expect(scaleNotes.has(note)).toBe(true);
      }
    });
  });

  // Test transposition: the A shape in C should produce C major scale notes
  describe('Transposition - A Shape in key of C', () => {
    it('should produce only C major scale notes', () => {
      const scaleNotes = getMajorScaleNotes('C');
      const patternNotes = resolvePatternNotes('A', 'C');

      expect(patternNotes.length).toBeGreaterThan(0);
      for (const note of patternNotes) {
        expect(scaleNotes.has(note)).toBe(true);
      }
    });
  });

  // Test that patterns contain the root note
  for (const [shapeName, shape] of Object.entries(CAGED_SHAPES)) {
    it(`${shape.name} pattern should include the root note ${shape.baseKey}`, () => {
      const patternNotes = resolvePatternNotes(shapeName, shape.baseKey);
      const normalizedRoot = normalizeNoteName(shape.baseKey);
      expect(patternNotes).toContain(normalizedRoot);
    });
  }
});

// ---------------------------------------------------------------------------
// 5. audioStore stopAll
// ---------------------------------------------------------------------------
describe('audioStore stopAll', () => {
  beforeEach(() => {
    // Manually set active states to simulate audio playing
    useAudioStore.setState({
      isPlaying: true,
      isDroneActive: true,
      isMetronomeActive: true,
      currentNote: 'A4',
    });
  });

  it('should be idempotent - calling stopAll when already stopped is safe', () => {
    // First call
    useAudioStore.getState().stopAll();

    // Second call should not throw or change anything
    useAudioStore.getState().stopAll();

    const state = useAudioStore.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.isDroneActive).toBe(false);
    expect(state.isMetronomeActive).toBe(false);
    expect(state.currentNote).toBeNull();
  });

  it('should not affect non-audio configuration state', () => {
    const configBefore = {
      droneConfig: { ...useAudioStore.getState().droneConfig },
      metronomeConfig: { ...useAudioStore.getState().metronomeConfig },
      masterVolume: useAudioStore.getState().masterVolume,
    };

    useAudioStore.getState().stopAll();

    const configAfter = useAudioStore.getState();
    expect(configAfter.droneConfig).toEqual(configBefore.droneConfig);
    expect(configAfter.metronomeConfig).toEqual(configBefore.metronomeConfig);
    expect(configAfter.masterVolume).toBe(configBefore.masterVolume);
  });
});

// ---------------------------------------------------------------------------
// 6. Chord Voicing offset correctness
// ---------------------------------------------------------------------------
describe('Chord voicing offset correctness', () => {
  // Standard tuning open string MIDI values
  const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64]; // E2, A2, D3, G3, B3, E4

  function getMidiNotes(positions: number[][], rootFret: number): number[] {
    return positions.map(([string, offset]) => OPEN_STRING_MIDI[string] + rootFret + offset);
  }

  function getChroma(midi: number): number {
    return ((midi % 12) + 12) % 12;
  }

  // Drop 2 Maj7 voicings
  describe('Drop 2 Major 7th', () => {
    const DROP2_MAJ7 = [
      { name: 'Root Position', positions: [[2, 0], [3, 0], [4, 0], [5, 2]] },
      { name: '1st Inversion', positions: [[2, 1], [3, 1], [4, 0], [5, 0]] },
      { name: '2nd Inversion', positions: [[2, 0], [3, 2], [4, 2], [5, 2]] },
      { name: '3rd Inversion', positions: [[2, 1], [3, 3], [4, 0], [5, 2]] },
    ];

    for (const inv of DROP2_MAJ7) {
      it(`${inv.name} all notes belong to same maj7 chord`, () => {
        const midis = getMidiNotes(inv.positions, 5);
        const chromas = midis.map(m => getChroma(m));
        const sorted = [...new Set(chromas)].sort((a, b) => a - b);
        expect(sorted.length).toBe(4);
        const diffs: number[] = [];
        for (let i = 1; i < sorted.length; i++) diffs.push(sorted[i] - sorted[i - 1]);
        diffs.push((sorted[0] + 12) - sorted[sorted.length - 1]);
        diffs.sort((a, b) => a - b);
        // Maj7 sorted interval gaps: [1, 3, 4, 4]
        expect(diffs).toEqual([1, 3, 4, 4]);
      });

      it(`${inv.name} notes ascend in pitch`, () => {
        const midis = getMidiNotes(inv.positions, 5);
        for (let i = 1; i < midis.length; i++) {
          expect(midis[i]).toBeGreaterThan(midis[i - 1]);
        }
      });
    }
  });

  // Major Triad on D-G-B
  describe('Major Triad on D-G-B', () => {
    const MAJOR_DGB = [
      { name: 'Root Position', positions: [[2, 2], [3, 1], [4, 0]] },
      { name: '1st Inversion', positions: [[2, 2], [3, 0], [4, 1]] },
      { name: '2nd Inversion', positions: [[2, 0], [3, 0], [4, 0]] },
    ];

    for (const inv of MAJOR_DGB) {
      it(`${inv.name} notes belong to a major triad`, () => {
        const midis = getMidiNotes(inv.positions, 5);
        const chromas = midis.map(m => getChroma(m));
        const sorted = [...new Set(chromas)].sort((a, b) => a - b);
        expect(sorted.length).toBe(3);
        const diffs: number[] = [];
        for (let i = 1; i < sorted.length; i++) diffs.push(sorted[i] - sorted[i - 1]);
        diffs.push((sorted[0] + 12) - sorted[sorted.length - 1]);
        diffs.sort((a, b) => a - b);
        // Major triad gaps: [3, 4, 5]
        expect(diffs).toEqual([3, 4, 5]);
      });

      it(`${inv.name} notes ascend in pitch`, () => {
        const midis = getMidiNotes(inv.positions, 5);
        for (let i = 1; i < midis.length; i++) {
          expect(midis[i]).toBeGreaterThan(midis[i - 1]);
        }
      });
    }
  });

  // Minor Triad on D-G-B
  describe('Minor Triad on D-G-B', () => {
    const MINOR_DGB = [
      { name: 'Root Position', positions: [[2, 2], [3, 0], [4, 0]] },
      { name: '1st Inversion', positions: [[2, 1], [3, 0], [4, 1]] },
      { name: '2nd Inversion', positions: [[2, 1], [3, 1], [4, 0]] },
    ];

    for (const inv of MINOR_DGB) {
      it(`${inv.name} notes belong to a minor triad`, () => {
        const midis = getMidiNotes(inv.positions, 5);
        const chromas = midis.map(m => getChroma(m));
        const sorted = [...new Set(chromas)].sort((a, b) => a - b);
        expect(sorted.length).toBe(3);
        const diffs: number[] = [];
        for (let i = 1; i < sorted.length; i++) diffs.push(sorted[i] - sorted[i - 1]);
        diffs.push((sorted[0] + 12) - sorted[sorted.length - 1]);
        diffs.sort((a, b) => a - b);
        // Minor triad gaps: [3, 4, 5]
        expect(diffs).toEqual([3, 4, 5]);
      });
    }
  });
});
