import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProgress, ExerciseProgress, ReviewItem, SpacedRepetitionData } from '../types/progress';
import { formatTypeLabel } from '../api/exercises';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

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
  exportData: () => string;
  importData: (json: string) => { ok: boolean; error?: string };

  // Learning-journey state (persisted alongside progress; kept OUT of the
  // UserProgress export schema so exportData/importData stay unchanged).
  lastExerciseId: string | null;
  goal: SkillLevel | null;
  setLastExercise: (id: string) => void;
  setGoal: (goal: SkillLevel | null) => void;
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

// Current export schema version. Bump when the persisted shape changes so an
// importer can detect (and, in future, migrate) older backups.
export const PROGRESS_EXPORT_VERSION = 1;
const PROGRESS_EXPORT_SCHEMA = 'gtw-progress';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

// Structural validation of an imported UserProgress blob (dates arrive as
// strings; the store parses them lazily on read, so we don't revive them here).
function isValidProgress(p: unknown): p is UserProgress {
  if (!isRecord(p)) return false;
  return (
    typeof p.totalExercisesCompleted === 'number' &&
    typeof p.totalTimeSpent === 'number' &&
    typeof p.currentStreak === 'number' &&
    typeof p.longestStreak === 'number' &&
    isRecord(p.exerciseProgress) &&
    Array.isArray(p.weakAreas) &&
    Array.isArray(p.strongAreas)
  );
}

function isValidSpacedRepetition(s: unknown): s is SpacedRepetitionData {
  return isRecord(s) && isRecord(s.items);
}
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

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Compute updated streak fields from the previous practice date.
 * Idempotent per day: practicing again the same day never increments.
 * Always stamps lastPracticeDate to today so the value stays self-consistent —
 * the previous implementation never wrote it, which inflated the streak on reload.
 */
function computeStreakUpdate(
  lastPracticeDate: Date | string | null,
  currentStreak: number,
  longestStreak: number,
  now: Date = new Date()
): { currentStreak: number; longestStreak: number; lastPracticeDate: Date } {
  const today = startOfDay(now);

  if (!lastPracticeDate) {
    return { currentStreak: 1, longestStreak: Math.max(1, longestStreak), lastPracticeDate: today };
  }

  const lastDate = startOfDay(new Date(lastPracticeDate));
  const diffDays = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    // Already practiced today — idempotent, no increment.
    return { currentStreak, longestStreak, lastPracticeDate: today };
  }
  if (diffDays === 1) {
    const newStreak = currentStreak + 1;
    return { currentStreak: newStreak, longestStreak: Math.max(newStreak, longestStreak), lastPracticeDate: today };
  }
  // Gap of more than one day — reset to 1.
  return { currentStreak: 1, longestStreak: Math.max(1, longestStreak), lastPracticeDate: today };
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      progress: initialProgress,
      spacedRepetition: initialSpacedRepetition,
      lastExerciseId: null,
      goal: null,
      setLastExercise: (id) => set({ lastExerciseId: id }),
      setGoal: (goal) => set({ goal }),
      
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

        // Recording a completion is "actual practice" — advance the streak from
        // the prior practice date (idempotent within the same day).
        const streak = computeStreakUpdate(
          state.progress.lastPracticeDate,
          state.progress.currentStreak,
          state.progress.longestStreak
        );

        return {
          progress: {
            ...state.progress,
            totalExercisesCompleted: state.progress.totalExercisesCompleted + 1,
            totalTimeSpent: state.progress.totalTimeSpent + timeSpent,
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
            lastPracticeDate: streak.lastPracticeDate,
            exerciseProgress: updatedExerciseProgress,
            weakAreas,
            strongAreas,
          },
        };
      }),
      
      updateStreak: () => set((state) => {
        // Idempotent: same-day calls do not increment; next-day increments once;
        // a gap resets to 1. lastPracticeDate is always written.
        const streak = computeStreakUpdate(
          state.progress.lastPracticeDate,
          state.progress.currentStreak,
          state.progress.longestStreak
        );
        return {
          progress: {
            ...state.progress,
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
            lastPracticeDate: streak.lastPracticeDate,
          },
        };
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

      exportData: () => {
        const { progress, spacedRepetition } = get();
        return JSON.stringify(
          {
            schema: PROGRESS_EXPORT_SCHEMA,
            version: PROGRESS_EXPORT_VERSION,
            exportedAt: new Date().toISOString(),
            progress,
            spacedRepetition,
          },
          null,
          2
        );
      },

      importData: (json: string) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(json);
        } catch {
          return { ok: false, error: 'That file is not valid JSON.' };
        }
        if (!isRecord(parsed)) {
          return { ok: false, error: 'That file is not a progress backup.' };
        }
        const { progress, spacedRepetition } = parsed;
        if (!isValidProgress(progress) || !isValidSpacedRepetition(spacedRepetition)) {
          return {
            ok: false,
            error: 'That file is not a recognized gtw progress export.',
          };
        }
        set({ progress, spacedRepetition });
        return { ok: true };
      },
    }),
    {
      name: 'guitar-theory-progress',
    }
  )
);