import { describe, it, expect, beforeEach } from 'vitest';
import { useExerciseStore } from '../stores/exerciseStore';
import { Exercise, ExerciseResult } from '../types/exercise';

const makeExercise = (id: string): Exercise => ({
  id,
  type: 'note-identification',
  title: `Exercise ${id}`,
  description: `Description ${id}`,
  difficulty: 1,
  instructions: [],
  audioRequired: false,
  fretboardRequired: false,
});

const initialState = {
  currentExercise: null,
  exerciseIndex: 0,
  exercises: [],
  selectedCategory: 'all',
  isActive: false,
  startTime: null,
  attempts: 0,
  correctAnswers: 0,
  sessionResults: [],
};

describe('exerciseStore', () => {
  beforeEach(() => {
    useExerciseStore.setState(initialState);
  });

  it('setExercises stores exercises array', () => {
    const exercises = [makeExercise('1'), makeExercise('2')];
    useExerciseStore.getState().setExercises(exercises);
    expect(useExerciseStore.getState().exercises).toEqual(exercises);
  });

  it('setCurrentExercise resets attempts/correctAnswers and sets isActive/startTime', () => {
    useExerciseStore.setState({ attempts: 5, correctAnswers: 3 });
    useExerciseStore.getState().setCurrentExercise(makeExercise('1'));
    const state = useExerciseStore.getState();
    expect(state.currentExercise?.id).toBe('1');
    expect(state.attempts).toBe(0);
    expect(state.correctAnswers).toBe(0);
    expect(state.isActive).toBe(true);
    expect(state.startTime).toBeTypeOf('number');
  });

  it('nextExercise increments index and updates currentExercise', () => {
    const exercises = [makeExercise('1'), makeExercise('2'), makeExercise('3')];
    useExerciseStore.setState({ exercises, exerciseIndex: 0, currentExercise: exercises[0] });
    useExerciseStore.getState().nextExercise();
    const state = useExerciseStore.getState();
    expect(state.exerciseIndex).toBe(1);
    expect(state.currentExercise?.id).toBe('2');
    expect(state.attempts).toBe(0);
    expect(state.correctAnswers).toBe(0);
  });

  it('nextExercise does nothing at last exercise', () => {
    const exercises = [makeExercise('1'), makeExercise('2')];
    useExerciseStore.setState({ exercises, exerciseIndex: 1, currentExercise: exercises[1] });
    useExerciseStore.getState().nextExercise();
    expect(useExerciseStore.getState().exerciseIndex).toBe(1);
  });

  it('previousExercise decrements index', () => {
    const exercises = [makeExercise('1'), makeExercise('2')];
    useExerciseStore.setState({ exercises, exerciseIndex: 1, currentExercise: exercises[1] });
    useExerciseStore.getState().previousExercise();
    expect(useExerciseStore.getState().exerciseIndex).toBe(0);
    expect(useExerciseStore.getState().currentExercise?.id).toBe('1');
  });

  it('previousExercise does nothing at first exercise', () => {
    const exercises = [makeExercise('1'), makeExercise('2')];
    useExerciseStore.setState({ exercises, exerciseIndex: 0, currentExercise: exercises[0] });
    useExerciseStore.getState().previousExercise();
    expect(useExerciseStore.getState().exerciseIndex).toBe(0);
  });

  it('goToExercise navigates to valid index', () => {
    const exercises = [makeExercise('1'), makeExercise('2'), makeExercise('3')];
    useExerciseStore.setState({ exercises, exerciseIndex: 0 });
    useExerciseStore.getState().goToExercise(2);
    expect(useExerciseStore.getState().exerciseIndex).toBe(2);
    expect(useExerciseStore.getState().currentExercise?.id).toBe('3');
  });

  it('goToExercise ignores out-of-bounds index', () => {
    const exercises = [makeExercise('1')];
    useExerciseStore.setState({ exercises, exerciseIndex: 0 });
    useExerciseStore.getState().goToExercise(5);
    expect(useExerciseStore.getState().exerciseIndex).toBe(0);
    useExerciseStore.getState().goToExercise(-1);
    expect(useExerciseStore.getState().exerciseIndex).toBe(0);
  });

  it('recordAttempt increments attempts, conditionally increments correctAnswers', () => {
    useExerciseStore.getState().recordAttempt(true);
    expect(useExerciseStore.getState().attempts).toBe(1);
    expect(useExerciseStore.getState().correctAnswers).toBe(1);

    useExerciseStore.getState().recordAttempt(false);
    expect(useExerciseStore.getState().attempts).toBe(2);
    expect(useExerciseStore.getState().correctAnswers).toBe(1);
  });

  it('endExercise appends to sessionResults and sets isActive false', () => {
    useExerciseStore.setState({ isActive: true });
    const result: ExerciseResult = {
      exerciseId: '1',
      score: 0.9,
      timeSpent: 30,
      attempts: 5,
      completedAt: new Date(),
    };
    useExerciseStore.getState().endExercise(result);
    const state = useExerciseStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.sessionResults).toHaveLength(1);
    expect(state.sessionResults[0].exerciseId).toBe('1');
  });

  it('resetSession restores initial state', () => {
    useExerciseStore.setState({
      currentExercise: makeExercise('1'),
      exerciseIndex: 3,
      isActive: true,
      attempts: 10,
      correctAnswers: 7,
      sessionResults: [{ exerciseId: '1', score: 1, timeSpent: 10, attempts: 1, completedAt: new Date() }],
    });
    useExerciseStore.getState().resetSession();
    const state = useExerciseStore.getState();
    expect(state.currentExercise).toBeNull();
    expect(state.exerciseIndex).toBe(0);
    expect(state.isActive).toBe(false);
    expect(state.attempts).toBe(0);
    expect(state.correctAnswers).toBe(0);
    expect(state.sessionResults).toHaveLength(0);
  });
});
