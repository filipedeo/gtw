import { describe, it, expect } from 'vitest';

describe('Exercise coverage', () => {
  it('has individual 3NPS exercises for all 7 diatonic modes plus harmonic/melodic minor', async () => {
    const { getExercisesByType } = await import('../api/exercises');
    const exercises = await getExercisesByType('three-nps');

    // Individual mode exercises
    const modeIds = [
      'three-nps-1',        // Ionian
      'three-nps-2',        // Dorian
      'three-nps-phrygian',
      'three-nps-lydian',
      'three-nps-mixolydian',
      'three-nps-aeolian',
      'three-nps-locrian',
      'three-nps-harmonic-minor',
      'three-nps-melodic-minor',
    ];

    for (const id of modeIds) {
      expect(exercises.find(e => e.id === id), `Missing 3NPS exercise: ${id}`).toBeDefined();
    }

    // Plus the "All 7 Modes" exercise
    expect(exercises.find(e => e.id === 'three-nps-3')).toBeDefined();
  });

  it('has modal practice exercises for all 7 diatonic modes plus extras', async () => {
    const { getExercisesByType } = await import('../api/exercises');
    const exercises = await getExercisesByType('modal-practice');

    // Should have: ionian, dorian, mixolydian, lydian, phrygian, aeolian, locrian, parallel comparison, harmonic minor, melodic minor, blues
    expect(exercises.find(e => e.id === 'modal-ionian'), 'Missing Ionian modal exercise').toBeDefined();
    expect(exercises.find(e => e.id === 'modal-1'), 'Missing Dorian').toBeDefined();
    expect(exercises.find(e => e.id === 'modal-7'), 'Missing Locrian').toBeDefined();
    expect(exercises.find(e => e.id === 'modal-8'), 'Missing Harmonic Minor').toBeDefined();
    expect(exercises.find(e => e.id === 'modal-9'), 'Missing Melodic Minor').toBeDefined();
    expect(exercises.find(e => e.id === 'modal-10'), 'Missing Blues').toBeDefined();
  });

  it('every exercise type has at least 3 exercises', async () => {
    const { getExerciseCategories } = await import('../api/exercises');
    const categories = getExerciseCategories();

    for (const cat of categories) {
      expect(cat.count, `Category ${cat.type} has too few exercises`).toBeGreaterThanOrEqual(3);
    }
  });

  it('all exercises have required fields', async () => {
    const { getExercises } = await import('../api/exercises');
    const exercises = await getExercises();

    for (const ex of exercises) {
      expect(ex.id, 'Exercise missing id').toBeTruthy();
      expect(ex.type, `Exercise ${ex.id} missing type`).toBeTruthy();
      expect(ex.title, `Exercise ${ex.id} missing title`).toBeTruthy();
      expect(ex.description, `Exercise ${ex.id} missing description`).toBeTruthy();
      expect(ex.difficulty, `Exercise ${ex.id} missing difficulty`).toBeGreaterThanOrEqual(1);
      expect(ex.instructions?.length, `Exercise ${ex.id} missing instructions`).toBeGreaterThan(0);
    }
  });
});
