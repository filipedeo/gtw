import { Exercise } from '../types/exercise';

const exercises: Exercise[] = require('../data/exercises.json');

export function getExercises(): Promise<Exercise[]> {
    return new Promise(resolve => setTimeout(() => resolve(exercises), 1000)); // Simulate async API call
}