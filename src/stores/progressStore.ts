import create from 'zustand';
import { UserProgress, SpacedRepetitionData } from '../types/progress';

interface ProgressStoreState {
    userProgress: UserProgress;
    spacedRepetitionData: SpacedRepetitionData;
    updateUserProgress: (progress: UserProgress) => void;
    updateSpacedRepetitionData: (data: SpacedRepetitionData) => void;
}

export const useProgressStore = create<ProgressStoreState>((set) => ({
    userProgress: { exercisesCompleted: 0, lastSessionDate: new Date() },
    spacedRepetitionData: { reviewItems: [] },
    updateUserProgress: (progress) => set({ userProgress: progress }),
    updateSpacedRepetitionData: (data) => set({ spacedRepetitionData: data })
}));