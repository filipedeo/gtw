import { Exercise, ExerciseType } from '../types/exercise';

/**
 * Generate a new exercise of the specified type
 * This is a utility for dynamically creating exercises
 */
export function generateExercise(type: ExerciseType): Exercise {
  const timestamp = Date.now();
  
  switch (type) {
    case 'note-identification':
      return {
        id: `note-id-${timestamp}`,
        type: 'note-identification',
        title: 'Note Identification',
        description: 'Identify the notes on the fretboard.',
        difficulty: 1,
        instructions: ['Identify the highlighted note on the fretboard'],
        audioRequired: true,
        fretboardRequired: true,
      };
      
    case 'modal-practice':
      return {
        id: `modal-${timestamp}`,
        type: 'modal-practice',
        title: 'Modal Practice',
        description: 'Practice different musical modes.',
        difficulty: 2,
        instructions: ['Practice the scale with the drone playing'],
        audioRequired: true,
        fretboardRequired: true,
      };
      
    case 'interval-recognition':
      return {
        id: `interval-${timestamp}`,
        type: 'interval-recognition',
        title: 'Interval Recognition',
        description: 'Identify intervals by ear.',
        difficulty: 2,
        instructions: ['Listen to the two notes and identify the interval'],
        audioRequired: true,
        fretboardRequired: true,
      };
      
    case 'chord-voicing':
      return {
        id: `chord-${timestamp}`,
        type: 'chord-voicing',
        title: 'Chord Voicing',
        description: 'Learn chord voicings across the fretboard.',
        difficulty: 3,
        instructions: ['Study the chord voicing shown on the fretboard'],
        audioRequired: true,
        fretboardRequired: true,
      };
      
    case 'ear-training':
      return {
        id: `ear-${timestamp}`,
        type: 'ear-training',
        title: 'Ear Training',
        description: 'Train your ear to recognize musical elements.',
        difficulty: 2,
        instructions: ['Listen and identify the musical element'],
        audioRequired: true,
        fretboardRequired: false,
      };
      
    case 'caged-system':
      return {
        id: `caged-${timestamp}`,
        type: 'caged-system',
        title: 'CAGED System',
        description: 'Learn the CAGED system for fretboard navigation.',
        difficulty: 2,
        instructions: ['Study the CAGED shape and practice the positions'],
        audioRequired: true,
        fretboardRequired: true,
      };
      
    default:
      throw new Error(`Unsupported exercise type: ${type}`);
  }
}

/**
 * Generate a batch of exercises for a practice session
 */
export function generatePracticeSession(
  types: ExerciseType[],
  count: number = 5
): Exercise[] {
  const exercises: Exercise[] = [];
  
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    exercises.push(generateExercise(type));
  }
  
  return exercises;
}
