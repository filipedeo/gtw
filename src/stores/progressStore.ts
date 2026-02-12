import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProgress, ExerciseProgress, ReviewItem, SpacedRepetitionData } from '../types/progress';

function formatTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'note-identification': 'Note Identification',
    'caged-system': 'CAGED System',
    'pentatonic': 'Pentatonic Scales',
    'three-nps': '3-Notes-Per-String',
    'modal-practice': 'Modal Practice',
    'interval-recognition': 'Interval Recognition',
    'chord-voicing': 'Chord Voicings',
    'ear-training': 'Ear Training',
    'chord-progression': 'Chord Progressions',
  };
  return labels[type] ?? type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

interface ProgressState {
  // User progress
  progress: UserProgress;
  spacedRepetition: SpacedRepetitionData;
  
  // Actions
  recordExerciseCompletion: (exerciseId: string, score: number, timeSpent: number, exerciseType?: string) => void;
  updateStreak: () => void;
  getNextReviews: () => ReviewItem[];
  updateReviewItem: (exerciseId: string, quality: number) => void;
  resetProgress: () => void;
}

const initialProgress: UserProgress = {
  totalExercisesCompleted: 0,
  totalTimeSpent: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastPracticeDate: null,
  exerciseProgress: {},
  weakAreas: [],
  strongAreas: [],
};

const initialSpacedRepetition: SpacedRepetitionData = {
  items: {},
  lastReviewDate: null,
};

// SM-2 Algorithm implementation
function calculateNextReview(item: ReviewItem, quality: number): ReviewItem {
  let { easeFactor, interval, repetitions } = item;
  
  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }
  
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);
  
  return {
    ...item,
    easeFactor,
    interval,
    repetitions,
    nextReview,
  };
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      progress: initialProgress,
      spacedRepetition: initialSpacedRepetition,
      
      recordExerciseCompletion: (exerciseId, score, timeSpent, exerciseType) => set((state) => {
        const existing = state.progress.exerciseProgress[exerciseId];
        const newProgress: ExerciseProgress = existing ? {
          ...existing,
          totalAttempts: existing.totalAttempts + 1,
          correctAttempts: existing.correctAttempts + (score >= 0.7 ? 1 : 0),
          averageTime: (existing.averageTime * existing.totalAttempts + timeSpent) / (existing.totalAttempts + 1),
          lastAttempt: new Date(),
          bestScore: Math.max(existing.bestScore, score),
        } : {
          exerciseId,
          exerciseType,
          totalAttempts: 1,
          correctAttempts: score >= 0.7 ? 1 : 0,
          averageTime: timeSpent,
          lastAttempt: new Date(),
          bestScore: score,
        };
        
        const updatedExerciseProgress = {
          ...state.progress.exerciseProgress,
          [exerciseId]: newProgress,
        };

        // Recompute weak/strong areas from all exercise progress
        const typeScores: Record<string, { totalScore: number; count: number }> = {};
        for (const ep of Object.values(updatedExerciseProgress)) {
          const type = ep.exerciseType;
          if (type && ep.totalAttempts >= 2) {
            if (!typeScores[type]) typeScores[type] = { totalScore: 0, count: 0 };
            typeScores[type].totalScore += ep.bestScore;
            typeScores[type].count += 1;
          }
        }

        const weakAreas: string[] = [];
        const strongAreas: string[] = [];
        for (const [type, { totalScore, count }] of Object.entries(typeScores)) {
          const avg = totalScore / count;
          const label = formatTypeLabel(type);
          if (avg < 0.6) weakAreas.push(label);
          else if (avg >= 0.8) strongAreas.push(label);
        }

        return {
          progress: {
            ...state.progress,
            totalExercisesCompleted: state.progress.totalExercisesCompleted + 1,
            totalTimeSpent: state.progress.totalTimeSpent + timeSpent,
            lastPracticeDate: new Date(),
            exerciseProgress: updatedExerciseProgress,
            weakAreas,
            strongAreas,
          },
        };
      }),
      
      updateStreak: () => set((state) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastPractice = state.progress.lastPracticeDate;

        if (!lastPractice) {
          return {
            progress: {
              ...state.progress,
              currentStreak: 1,
              longestStreak: Math.max(1, state.progress.longestStreak),
            },
          };
        }

        const lastDate = new Date(lastPractice);
        lastDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          return state;
        } else if (diffDays === 1) {
          const newStreak = state.progress.currentStreak + 1;
          return {
            progress: {
              ...state.progress,
              currentStreak: newStreak,
              longestStreak: Math.max(newStreak, state.progress.longestStreak),
            },
          };
        } else {
          return {
            progress: {
              ...state.progress,
              currentStreak: 1,
            },
          };
        }
      }),
      
      getNextReviews: () => {
        const { items } = get().spacedRepetition;
        const now = new Date();
        return Object.values(items)
          .filter(item => new Date(item.nextReview) <= now)
          .sort((a, b) => new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime());
      },
      
      updateReviewItem: (exerciseId, quality) => set((state) => {
        const existing = state.spacedRepetition.items[exerciseId] || {
          exerciseId,
          easeFactor: 2.5,
          interval: 0,
          nextReview: new Date(),
          repetitions: 0,
        };
        
        const updated = calculateNextReview(existing, quality);
        
        return {
          spacedRepetition: {
            ...state.spacedRepetition,
            items: {
              ...state.spacedRepetition.items,
              [exerciseId]: updated,
            },
            lastReviewDate: new Date(),
          },
        };
      }),
      
      resetProgress: () => set({
        progress: initialProgress,
        spacedRepetition: initialSpacedRepetition,
      }),
    }),
    {
      name: 'guitar-theory-progress',
    }
  )
);