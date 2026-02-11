export type UserProgress = {
    exercisesCompleted: number;
    lastSessionDate: Date;
};

export type ReviewItem = {
    exerciseId: string;
    reviewDate: Date;
};

export type SpacedRepetitionData = {
    reviewItems: ReviewItem[];
};