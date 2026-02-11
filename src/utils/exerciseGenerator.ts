import { Exercise, ExerciseType, ExerciseContent } from '../types/exercise';

export function generateExercise(type: ExerciseType): Exercise {
    let content: ExerciseContent;
    switch (type) {
        case ExerciseType.NoteIdentification:
            content = {
                description: 'Identify the notes on the fretboard.',
                data: {} // Data specific to note identification
            };
            break;
        case ExerciseType.ModalPractice:
            content = {
                description: 'Practice different musical modes.',
                data: {} // Data specific to modal practice
            };
            break;
        default:
            throw new Error('Unsupported exercise type');
    }
    return {
        id: `exercise-${Date.now()}`, // Unique ID for the exercise
        type,
        content
    };
}