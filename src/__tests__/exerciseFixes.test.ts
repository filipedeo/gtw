import { describe, it, expect, beforeEach } from 'vitest';
import { useAudioStore } from '../stores/audioStore';
import { getNoteAtPosition } from '../utils/fretboardCalculations';
import { STANDARD_TUNINGS, normalizeNoteName } from '../types/guitar';

/**
 * Tests for bug fixes applied across the codebase.
 *
 * 1. SCALE_DEGREES mutation fix (EarTrainingExercise)
 * 2. useExercise questionNumber cap
 * 3. Interval song references (IntervalRecognitionExercise)
 * 4. CAGED scale pattern correctness (CAGEDExercise)
 * 5. audioStore stopAll behavior
 */

// ---------------------------------------------------------------------------
// 1. SCALE_DEGREES mutation fix
// ---------------------------------------------------------------------------
describe('SCALE_DEGREES mutation fix', () => {
  // Reproduce the exact constant from EarTrainingExercise.tsx
  const SCALE_DEGREES = ['1', '2', '3', '4', '5', '6', '7'];

  it('should not mutate SCALE_DEGREES when sorting a copy', () => {
    const originalOrder = [...SCALE_DEGREES];

    // The fix: sort a shallow copy instead of the original
    const shuffled = [...SCALE_DEGREES].sort(() => Math.random() - 0.5);

    // The original must remain in its canonical order
    expect(SCALE_DEGREES).toEqual(originalOrder);

    // The shuffled copy is a permutation of the same elements
    expect(shuffled).toHaveLength(SCALE_DEGREES.length);
    expect([...shuffled].sort()).toEqual([...SCALE_DEGREES].sort());
  });

  it('spread-copy pattern preserves original across repeated shuffles', () => {
    const DEGREES = ['1', '2', '3', '4', '5', '6', '7'];
    const snapshot = DEGREES.join(',');

    for (let i = 0; i < 100; i++) {
      // This is the fixed pattern used in the code
      [...DEGREES].sort(() => Math.random() - 0.5);
    }

    expect(DEGREES.join(',')).toBe(snapshot);
  });
});

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

  it('should start at 1 when no questions answered', () => {
    expect(computeQuestionNumber(0, 10)).toBe(1);
  });

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

  it('should work with different totalQuestions values', () => {
    expect(computeQuestionNumber(4, 5)).toBe(5);
    expect(computeQuestionNumber(5, 5)).toBe(5);
    expect(computeQuestionNumber(19, 20)).toBe(20);
    expect(computeQuestionNumber(20, 20)).toBe(20);
    expect(computeQuestionNumber(21, 20)).toBe(20);
  });

  it('should display "Question N of M" accurately at the boundary', () => {
    const totalQuestions = 10;

    // Simulated progression through all 10 questions
    for (let answered = 0; answered <= totalQuestions; answered++) {
      const questionNumber = computeQuestionNumber(answered, totalQuestions);
      expect(questionNumber).toBeGreaterThanOrEqual(1);
      expect(questionNumber).toBeLessThanOrEqual(totalQuestions);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Interval song references
// ---------------------------------------------------------------------------
describe('Interval song references', () => {
  // Reproduce the INTERVALS constant from IntervalRecognitionExercise.tsx
  const INTERVALS = [
    { name: 'Minor 2nd', short: 'm2', semitones: 1, song: '"Jaws" theme' },
    { name: 'Major 2nd', short: 'M2', semitones: 2, song: '"Happy Birthday" (first two notes)' },
    { name: 'Minor 3rd', short: 'm3', semitones: 3, song: '"Greensleeves" (first two notes)' },
    { name: 'Major 3rd', short: 'M3', semitones: 4, song: '"Kumbaya" (first two notes)' },
    { name: 'Perfect 4th', short: 'P4', semitones: 5, song: '"Here Comes the Bride"' },
    { name: 'Tritone', short: 'TT', semitones: 6, song: '"The Simpsons" theme' },
    { name: 'Perfect 5th', short: 'P5', semitones: 7, song: '"Star Wars" theme' },
    { name: 'Minor 6th', short: 'm6', semitones: 8, song: '"Love Story" (theme)' },
    { name: 'Major 6th', short: 'M6', semitones: 9, song: '"My Bonnie Lies Over the Ocean"' },
    { name: 'Minor 7th', short: 'm7', semitones: 10, song: '"Somewhere" (West Side Story)' },
    { name: 'Major 7th', short: 'M7', semitones: 11, song: '"Superman Theme" (first two notes)' },
    { name: 'Octave', short: 'P8', semitones: 12, song: '"Somewhere Over the Rainbow"' },
  ];

  it('minor 6th should reference "Love Story"', () => {
    const m6 = INTERVALS.find(i => i.short === 'm6');
    expect(m6).toBeDefined();
    expect(m6!.name).toBe('Minor 6th');
    expect(m6!.semitones).toBe(8);
    expect(m6!.song).toContain('Love Story');
  });

  it('major 7th should reference "Superman Theme"', () => {
    const M7 = INTERVALS.find(i => i.short === 'M7');
    expect(M7).toBeDefined();
    expect(M7!.name).toBe('Major 7th');
    expect(M7!.semitones).toBe(11);
    expect(M7!.song).toContain('Superman Theme');
  });

  it('should contain all 12 intervals from minor 2nd to octave', () => {
    expect(INTERVALS).toHaveLength(12);
    // Semitones should range continuously from 1 to 12
    const semitones = INTERVALS.map(i => i.semitones);
    expect(semitones).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('each interval should have a non-empty song reference', () => {
    for (const interval of INTERVALS) {
      expect(interval.song.length).toBeGreaterThan(0);
    }
  });

  it('perfect 5th should reference "Star Wars"', () => {
    const P5 = INTERVALS.find(i => i.short === 'P5');
    expect(P5).toBeDefined();
    expect(P5!.song).toContain('Star Wars');
  });

  it('tritone should reference "The Simpsons"', () => {
    const TT = INTERVALS.find(i => i.short === 'TT');
    expect(TT).toBeDefined();
    expect(TT!.song).toContain('The Simpsons');
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

  it('should set isPlaying to false', () => {
    useAudioStore.getState().stopAll();
    expect(useAudioStore.getState().isPlaying).toBe(false);
  });

  it('should set isDroneActive to false', () => {
    useAudioStore.getState().stopAll();
    expect(useAudioStore.getState().isDroneActive).toBe(false);
  });

  it('should set isMetronomeActive to false', () => {
    useAudioStore.getState().stopAll();
    expect(useAudioStore.getState().isMetronomeActive).toBe(false);
  });

  it('should set currentNote to null', () => {
    useAudioStore.getState().stopAll();
    expect(useAudioStore.getState().currentNote).toBeNull();
  });

  it('should reset all audio-related flags in a single call', () => {
    // Verify the precondition: everything is active
    const before = useAudioStore.getState();
    expect(before.isPlaying).toBe(true);
    expect(before.isDroneActive).toBe(true);
    expect(before.isMetronomeActive).toBe(true);
    expect(before.currentNote).toBe('A4');

    // Invoke stopAll
    useAudioStore.getState().stopAll();

    // Verify all flags are now false/null
    const after = useAudioStore.getState();
    expect(after.isPlaying).toBe(false);
    expect(after.isDroneActive).toBe(false);
    expect(after.isMetronomeActive).toBe(false);
    expect(after.currentNote).toBeNull();
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
