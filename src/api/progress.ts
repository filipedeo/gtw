import { UserProgress, SpacedRepetitionData } from '../types/progress';

let userProgress: UserProgress = {
    exercisesCompleted: 0,
    lastSessionDate: new Date()
};

let spacedRepetitionData: SpacedRepetitionData = {
    reviewItems: []
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