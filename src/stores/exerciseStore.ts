import create from 'zustand';
import { Exercise, ExerciseState } from '../types/exercise';

interface ExerciseStoreState {
    exerciseState: ExerciseState;
    setExercise: (exercise: Exercise | null) => void;
    completeExercise: (exercise: Exercise) => void;
}

export const useExerciseStore = create<ExerciseStoreState>((set) => ({
    exerciseState: { currentExercise: null, completedExercises: [] },
    setExercise: (exercise) => set((state) => ({
        exerciseState: { ...state.exerciseState, currentExercise: exercise }
    })),
    completeExercise: (exercise) => set((state) => ({
        exerciseState: {
            ...state.exerciseState,
            completedExercises: [...state.exerciseState.completedExercises, exercise]
        }
    }))
}));