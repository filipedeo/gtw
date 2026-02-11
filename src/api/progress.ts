import { UserProgress, SpacedRepetitionData } from '../types/progress';

let userProgress: UserProgress = {
    totalExercisesCompleted: 0,
    lastPracticeDate: new Date(),
    totalTimeSpent: 0,
    currentStreak: 0,
    longestStreak: 0,
    exerciseProgress: {},
    weakAreas: [],
    strongAreas: []
};

let spacedRepetitionData: SpacedRepetitionData = {
    items: {},
    lastReviewDate: null
};

export function getUserProgress(): Promise<UserProgress> {
    return new Promise(resolve => setTimeout(() => resolve(userProgress), 1000)); // Simulate async API call
}

export function updateUserProgress(progress: UserProgress): void {
    userProgress = progress;
}

export function getSpacedRepetitionData(): Promise<SpacedRepetitionData> {
    return new Promise(resolve => setTimeout(() => resolve(spacedRepetitionData), 1000)); // Simulate async API call
}

export function updateSpacedRepetitionData(data: SpacedRepetitionData): void {
    spacedRepetitionData = data;
}