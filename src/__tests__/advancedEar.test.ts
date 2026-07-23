import { describe, it, expect } from 'vitest';
import {
  createRng,
  generateAdvancedEarQuestion,
  generateScaleQuestion,
  generateCadenceQuestion,
  generateIntervalQuestion,
  generateDegreeQuestion,
  intervalsForDifficulty,
  subModeFromExerciseId,
  type AdvancedEarQuestion,
  type Difficulty,
} from '../lib/advancedEar';

// A valid Tone.js note name: a letter A-G, an optional accidental (# or b,
// possibly doubled), and a trailing octave digit.
const NOTE_RE = /^[A-G](?:##|bb|#|b)?-?\d+$/;

function allNotes(q: AdvancedEarQuestion): string[] {
  return q.playSequence;
}

function assertWellFormed(q: AdvancedEarQuestion) {
  // correct answer is always present in the options
  expect(q.options).toContain(q.correct);
  // options are unique
  expect(new Set(q.options).size).toBe(q.options.length);
  // at least 2 options so it is actually a choice
  expect(q.options.length).toBeGreaterThanOrEqual(2);
  // every played note is a valid note name
  for (const n of allNotes(q)) {
    expect(n).toMatch(NOTE_RE);
  }
  // prompt + explanation are non-empty
  expect(q.prompt.length).toBeGreaterThan(0);
  expect(q.explanation.length).toBeGreaterThan(0);
  // at least one event with at least one note
  expect(q.events.length).toBeGreaterThan(0);
  for (const e of q.events) expect(e.notes.length).toBeGreaterThan(0);
}

const DIFFICULTIES: Difficulty[] = [1, 2, 3, 4, 5];

describe('advanced ear training — generators', () => {
  describe('well-formedness across modes + difficulties', () => {
    for (const d of DIFFICULTIES) {
      it(`scale question is well formed at difficulty ${d}`, () => {
        const rng = createRng(1000 + d);
        assertWellFormed(generateScaleQuestion(d, rng));
      });

      it(`cadence question is well formed at difficulty ${d}`, () => {
        const rng = createRng(2000 + d);
        assertWellFormed(generateCadenceQuestion(d, rng));
      });

      it(`interval question (ascending) is well formed at difficulty ${d}`, () => {
        const rng = createRng(3000 + d);
        assertWellFormed(generateIntervalQuestion(d, rng, 'ascending'));
      });

      it(`interval question (descending) is well formed at difficulty ${d}`, () => {
        const rng = createRng(3100 + d);
        assertWellFormed(generateIntervalQuestion(d, rng, 'descending'));
      });

      it(`interval question (harmonic) is well formed at difficulty ${d}`, () => {
        const rng = createRng(3200 + d);
        assertWellFormed(generateIntervalQuestion(d, rng, 'harmonic'));
      });

      it(`degree question is well formed at difficulty ${d}`, () => {
        const rng = createRng(4000 + d);
        assertWellFormed(generateDegreeQuestion(d, rng));
      });
    }
  });

  describe('determinism under seed', () => {
    it('same seed reproduces the same scale question', () => {
      const a = generateScaleQuestion(3, createRng(42));
      const b = generateScaleQuestion(3, createRng(42));
      expect(a).toEqual(b);
    });

    it('same seed reproduces the same cadence question', () => {
      const a = generateCadenceQuestion(3, createRng(42));
      const b = generateCadenceQuestion(3, createRng(42));
      expect(a).toEqual(b);
    });

    it('same seed reproduces the same interval question for each direction', () => {
      for (const dir of ['ascending', 'descending', 'harmonic'] as const) {
        const a = generateIntervalQuestion(4, createRng(7), dir);
        const b = generateIntervalQuestion(4, createRng(7), dir);
        expect(a).toEqual(b);
      }
    });

    it('same seed reproduces the same degree question', () => {
      const a = generateDegreeQuestion(3, createRng(99));
      const b = generateDegreeQuestion(3, createRng(99));
      expect(a).toEqual(b);
    });

    it('different seeds usually differ', () => {
      // Not guaranteed for every pair, but across 20 draws two distinct seeds
      // should produce at least one different question.
      let anyDifferent = false;
      for (let i = 0; i < 20 && !anyDifferent; i++) {
        const a = generateScaleQuestion(3, createRng(1 + i));
        const b = generateScaleQuestion(3, createRng(1000 + i));
        if (a.correct !== b.correct || a.playSequence.join(',') !== b.playSequence.join(',')) {
          anyDifferent = true;
        }
      }
      expect(anyDifferent).toBe(true);
    });
  });

  describe('interval direction shapes the events', () => {
    it('ascending plays the lower note first', () => {
      const q = generateIntervalQuestion(4, createRng(5), 'ascending');
      expect(q.events).toHaveLength(2);
      expect(q.events[0].notes).toHaveLength(1);
      expect(q.events[1].notes).toHaveLength(1);
    });

    it('descending plays two sequential single-note events', () => {
      const q = generateIntervalQuestion(4, createRng(5), 'descending');
      expect(q.events).toHaveLength(2);
      expect(q.events[0].notes).toHaveLength(1);
      expect(q.events[1].notes).toHaveLength(1);
    });

    it('harmonic plays both notes as one simultaneous event', () => {
      const q = generateIntervalQuestion(4, createRng(5), 'harmonic');
      expect(q.events).toHaveLength(1);
      expect(q.events[0].notes).toHaveLength(2);
    });
  });

  describe('difficulty widens the interval set', () => {
    it('difficulty 1 exposes only consonant fourths/fifths', () => {
      const set = intervalsForDifficulty(1).map((i) => i.short);
      expect(set).toEqual(['P4', 'P5']);
    });

    it('difficulty 5 exposes all twelve intervals', () => {
      expect(intervalsForDifficulty(5)).toHaveLength(12);
    });

    it('a generated interval answer always comes from the difficulty set', () => {
      for (const d of DIFFICULTIES) {
        const allowed = intervalsForDifficulty(d).map((i) => i.name);
        const q = generateIntervalQuestion(d, createRng(d), 'ascending');
        expect(allowed).toContain(q.correct);
      }
    });
  });

  describe('degree generator', () => {
    it('difficulty 1 only uses stable degrees 1, 3, 5', () => {
      const seen = new Set<string>();
      const rng = createRng(123);
      for (let i = 0; i < 60; i++) seen.add(generateDegreeQuestion(1, rng).correct);
      expect([...seen].sort()).toEqual(['1', '3', '5']);
    });

    it('always plays a tonic triad then a single target note', () => {
      const q = generateDegreeQuestion(3, createRng(55));
      expect(q.events).toHaveLength(2);
      expect(q.events[0].notes.length).toBe(3); // triad
      expect(q.events[1].notes.length).toBe(1); // target degree
    });
  });

  describe('dispatcher + id mapping', () => {
    it('dispatches to each sub-mode', () => {
      const rng = createRng(1);
      const scale = generateAdvancedEarQuestion('scale', { difficulty: 3, rng });
      const cadence = generateAdvancedEarQuestion('cadence', { difficulty: 3, rng });
      const interval = generateAdvancedEarQuestion('interval', { difficulty: 3, rng });
      const degree = generateAdvancedEarQuestion('degree', { difficulty: 3, rng });
      assertWellFormed(scale);
      assertWellFormed(cadence);
      assertWellFormed(interval);
      assertWellFormed(degree);
    });

    it('maps exercise ids to sub-modes', () => {
      expect(subModeFromExerciseId('ear-adv-scale')).toBe('scale');
      expect(subModeFromExerciseId('ear-adv-cadence')).toBe('cadence');
      expect(subModeFromExerciseId('ear-adv-interval')).toBe('interval');
      expect(subModeFromExerciseId('ear-adv-degree')).toBe('degree');
      expect(subModeFromExerciseId('ear-adv-unknown')).toBe('scale');
    });
  });
});
