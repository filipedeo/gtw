import { create } from 'zustand';
import { Exercise, ExerciseResult } from '../types/exercise';

interface ExerciseState {
  // Current exercise
  currentExercise: Exercise | null;
  exerciseIndex: number;

  // Exercise list
  exercises: Exercise[];

  // Category filter (shared between ExerciseContainer and SessionPlanner)
  selectedCategory: string;

  // Session state
  isActive: boolean;
  startTime: number | null;
  attempts: number;
  correctAnswers: number;

  // Results
  sessionResults: ExerciseResult[];

  // Actions
  setExercises: (exercises: Exercise[]) => void;
  setCurrentExercise: (exercise: Exercise | null) => void;
  setSelectedCategory: (category: string) => void;
  startExercise: () => void;
  endExercise: (result: ExerciseResult) => void;
  recordAttempt: (correct: boolean) => void;
  nextExercise: () => void;
  previousExercise: () => void;
  goToExercise: (index: number) => void;
  resetSession: () => void;
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  // Initial state
  currentExercise: null,
  exerciseIndex: 0,
  exercises: [],
  selectedCategory: 'all',
  isActive: false,
  startTime: null,
  attempts: 0,
  correctAnswers: 0,
  sessionResults: [],
  
  // Actions
  setExercises: (exercises) => set({ exercises }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  
  setCurrentExercise: (exercise) => set({
    currentExercise: exercise,
    attempts: 0,
    correctAnswers: 0,
    isActive: true,
    startTime: Date.now(),
  }),
  
  startExercise: () => set({
    isActive: true,
    startTime: Date.now(),
    attempts: 0,
    correctAnswers: 0,
  }),
  
  endExercise: (result) => set((state) => ({
    isActive: false,
    startTime: null,
    sessionResults: [...state.sessionResults, result],
  })),
  
  recordAttempt: (correct) => set((state) => ({
    attempts: state.attempts + 1,
    correctAnswers: correct ? state.correctAnswers + 1 : state.correctAnswers,
  })),
  
  nextExercise: () => {
    const { exercises, exerciseIndex } = get();
    if (exerciseIndex < exercises.length - 1) {
      const newIndex = exerciseIndex + 1;
      set({
        exerciseIndex: newIndex,
        currentExercise: exercises[newIndex],

        isActive: true,
        startTime: Date.now(),
        attempts: 0,
        correctAnswers: 0,
      });
    }
  },

  previousExercise: () => {
    const { exercises, exerciseIndex } = get();
    if (exerciseIndex > 0) {
      const newIndex = exerciseIndex - 1;
      set({
        exerciseIndex: newIndex,
        currentExercise: exercises[newIndex],

        isActive: true,
        startTime: Date.now(),
        attempts: 0,
        correctAnswers: 0,
      });
    }
  },

  goToExercise: (index) => {
    const { exercises } = get();
    if (index >= 0 && index < exercises.length) {
      set({
        exerciseIndex: index,
        currentExercise: exercises[index],

        isActive: true,
        startTime: Date.now(),
        attempts: 0,
        correctAnswers: 0,
      });
    }
  },
  
  resetSession: () => set({
    currentExercise: null,
    exerciseIndex: 0,
    isActive: false,
    startTime: null,
    attempts: 0,
    correctAnswers: 0,
    sessionResults: [],
  }),
}));