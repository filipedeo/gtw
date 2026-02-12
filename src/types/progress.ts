export type ReviewItem = {
  exerciseId: string;
  easeFactor: number;
  interval: number; // days
  nextReview: Date;
  repetitions: number;
};

export type SpacedRepetitionData = {
  items: Record<string, ReviewItem>;
  lastReviewDate: Date | null;
};

export type ExerciseProgress = {
  exerciseId: string;
  totalAttempts: number;
  correctAttempts: number;
  averageTime: number;
  lastAttempt: Date;
  bestScore: number;
};

export type UserProgress = {
  totalExercisesCompleted: number;
  totalTimeSpent: number; // in seconds
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: Date | null;
  exerciseProgress: Record<string, ExerciseProgress>;
  weakAreas: string[];
  strongAreas: string[];
};

