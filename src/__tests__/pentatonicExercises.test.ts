import { describe, it, expect } from 'vitest';

// Test that exercises.ts has all expected pentatonic exercises
describe('Pentatonic exercise definitions', () => {
  it('has individual minor pentatonic shapes 1-5', async () => {
    const { getExercisesByType } = await import('../api/exercises');
    const exercises = await getExercisesByType('pentatonic');

    expect(exercises.find(e => e.id === 'pentatonic-1')).toBeDefined();
    expect(exercises.find(e => e.id === 'pentatonic-minor-2')).toBeDefined();
    expect(exercises.find(e => e.id === 'pentatonic-minor-3')).toBeDefined();
    expect(exercises.find(e => e.id === 'pentatonic-minor-4')).toBeDefined();
    expect(exercises.find(e => e.id === 'pentatonic-minor-5')).toBeDefined();
  });

  it('has individual major pentatonic shapes 1-5', async () => {
    const { getExercisesByType } = await import('../api/exercises');
    const exercises = await getExercisesByType('pentatonic');

    expect(exercises.find(e => e.id === 'pentatonic-major-1')).toBeDefined();
    expect(exercises.find(e => e.id === 'pentatonic-major-2')).toBeDefined();
    expect(exercises.find(e => e.id === 'pentatonic-major-3')).toBeDefined();
    expect(exercises.find(e => e.id === 'pentatonic-major-4')).toBeDefined();
    expect(exercises.find(e => e.id === 'pentatonic-major-5')).toBeDefined();
  });

  it('has pentatonic-to-modes exercise', async () => {
    const { getExercisesByType } = await import('../api/exercises');
    const exercises = await getExercisesByType('pentatonic');
    expect(exercises.find(e => e.id === 'pentatonic-4')).toBeDefined();
  });

  it('all pentatonic exercises require fretboard', async () => {
    const { getExercisesByType } = await import('../api/exercises');
    const exercises = await getExercisesByType('pentatonic');
    for (const ex of exercises) {
      expect(ex.fretboardRequired).toBe(true);
    }
  });

  it('does not have removed all-shapes exercises', async () => {
    const { getExercisesByType } = await import('../api/exercises');
    const exercises = await getExercisesByType('pentatonic');
    expect(exercises.find(e => e.id === 'pentatonic-2')).toBeUndefined();
    expect(exercises.find(e => e.id === 'pentatonic-3')).toBeUndefined();
  });

  it('has exactly 11 pentatonic exercises', async () => {
    const { getExercisesByType } = await import('../api/exercises');
    const exercises = await getExercisesByType('pentatonic');
    // 5 minor + 5 major + 1 modes progression = 11
    expect(exercises).toHaveLength(11);
  });
});
