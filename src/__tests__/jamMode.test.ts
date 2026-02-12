import { describe, it, expect } from 'vitest';
import { JAM_PROGRESSIONS } from '../data/jamProgressions';
import { buildProgressionChords, getModeNotes } from '../lib/theoryEngine';
import { normalizeNoteName } from '../types/guitar';

describe('Jam progressions data', () => {
  it('all progressions have valid structure', () => {
    for (const prog of JAM_PROGRESSIONS) {
      expect(prog.name, 'progression missing name').toBeTruthy();
      expect(prog.numerals.length, `${prog.name}: numerals empty`).toBeGreaterThan(0);
      expect(prog.degrees.length, `${prog.name}: degrees empty`).toBeGreaterThan(0);
      expect(prog.numerals.length, `${prog.name}: numerals/degrees length mismatch`).toBe(prog.degrees.length);
      expect(prog.suggestedScale, `${prog.name}: missing suggestedScale`).toBeTruthy();
      expect(prog.genre, `${prog.name}: missing genre`).toBeTruthy();
      expect(prog.beatsPerChord, `${prog.name}: invalid beatsPerChord`).toBeGreaterThan(0);
    }
  });

  it('all progression genres are non-empty strings', () => {
    const validGenres = new Set(['Blues', 'Rock', 'Jazz', 'Pop', 'Flamenco']);
    for (const prog of JAM_PROGRESSIONS) {
      expect(validGenres.has(prog.genre), `${prog.name}: unknown genre "${prog.genre}"`).toBe(true);
    }
  });

  it('has at least 1 progression per genre', () => {
    const genreCounts = new Map<string, number>();
    for (const prog of JAM_PROGRESSIONS) {
      genreCounts.set(prog.genre, (genreCounts.get(prog.genre) ?? 0) + 1);
    }
    for (const [genre, count] of genreCounts) {
      expect(count, `Genre "${genre}" has no progressions`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('buildProgressionChords with jam progressions', () => {
  it('produces correct number of chords for each jam progression', () => {
    for (const prog of JAM_PROGRESSIONS) {
      const chords = buildProgressionChords('C', prog.degrees);
      expect(chords.length, `${prog.name}: wrong chord count`).toBe(prog.degrees.length);
    }
  });

  it('produces valid chord data for each progression in multiple keys', () => {
    const keys = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb'];
    for (const key of keys) {
      for (const prog of JAM_PROGRESSIONS) {
        const chords = buildProgressionChords(key, prog.degrees);
        for (const chord of chords) {
          expect(chord.root, `${prog.name} in ${key}: chord missing root`).toBeTruthy();
          expect(chord.intervals.length, `${prog.name} in ${key}: chord missing intervals`).toBeGreaterThanOrEqual(3);
          expect(chord.intervals[0], `${prog.name} in ${key}: first interval should be 0`).toBe(0);
        }
      }
    }
  });
});

describe('Jam mode exercise definitions', () => {
  it('jam-mode exercises exist with correct type', async () => {
    const { getExercisesByType } = await import('../api/exercises');
    const exercises = await getExercisesByType('jam-mode');

    expect(exercises.length).toBeGreaterThanOrEqual(4);

    const expectedIds = ['jam-1', 'jam-2', 'jam-3', 'jam-4'];
    for (const id of expectedIds) {
      const ex = exercises.find(e => e.id === id);
      expect(ex, `Missing jam exercise: ${id}`).toBeDefined();
      expect(ex!.type).toBe('jam-mode');
      expect(ex!.audioRequired).toBe(true);
      expect(ex!.fretboardRequired).toBe(true);
      expect(ex!.instructions.length).toBeGreaterThan(0);
    }
  });

  it('jam-mode category label is set', async () => {
    const { getExerciseCategories } = await import('../api/exercises');
    const categories = getExerciseCategories();
    const jamCategory = categories.find(c => c.type === 'jam-mode');
    expect(jamCategory).toBeDefined();
    expect(jamCategory!.label).toBe('Jam Mode');
    expect(jamCategory!.count).toBeGreaterThanOrEqual(4);
  });
});

describe('Jam progression suggested scales resolve to valid notes', () => {
  it('each suggestedScale produces valid scale notes via getModeNotes', () => {
    const testKeys = ['C', 'A', 'G', 'E'];
    for (const prog of JAM_PROGRESSIONS) {
      for (const key of testKeys) {
        const normalizedKey = normalizeNoteName(key);
        const notes = getModeNotes(normalizedKey, prog.suggestedScale);
        expect(
          notes.length,
          `${prog.name}: getModeNotes("${key}", "${prog.suggestedScale}") returned empty`
        ).toBeGreaterThan(0);
      }
    }
  });

  it('all suggested scales are recognized mode names', () => {
    const validScales = new Set([
      'ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian',
      'harmonic minor', 'melodic minor', 'blues', 'major', 'phrygian dominant',
    ]);
    for (const prog of JAM_PROGRESSIONS) {
      expect(
        validScales.has(prog.suggestedScale),
        `${prog.name}: unrecognized suggestedScale "${prog.suggestedScale}"`
      ).toBe(true);
    }
  });
});
