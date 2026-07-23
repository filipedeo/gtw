import { describe, it, expect, beforeEach } from 'vitest';
import { useProgressStore } from '../stores/progressStore';

const initialProgress = {
  totalExercisesCompleted: 0,
  totalTimeSpent: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastPracticeDate: null,
  exerciseProgress: {},
  weakAreas: [],
  strongAreas: [],
};

const initialSpacedRepetition = {
  items: {},
  lastReviewDate: null,
};

describe('progressStore', () => {
  beforeEach(() => {
    useProgressStore.setState({
      progress: { ...initialProgress },
      spacedRepetition: { ...initialSpacedRepetition },
    });
  });

  describe('recordExerciseCompletion', () => {
    it('creates new progress entry for unknown exerciseId', () => {
      useProgressStore.getState().recordExerciseCompletion('ex-1', 0.85, 60);
      const state = useProgressStore.getState();
      expect(state.progress.totalExercisesCompleted).toBe(1);
      expect(state.progress.totalTimeSpent).toBe(60);
      const entry = state.progress.exerciseProgress['ex-1'];
      expect(entry).toBeDefined();
      expect(entry.totalAttempts).toBe(1);
      expect(entry.bestScore).toBe(0.85);
      expect(entry.averageTime).toBe(60);
      expect(entry.correctAttempts).toBe(1); // 0.85 >= 0.7
    });

    it('updates existing entry', () => {
      useProgressStore.getState().recordExerciseCompletion('ex-1', 0.85, 60);
      useProgressStore.getState().recordExerciseCompletion('ex-1', 0.5, 40);
      const entry = useProgressStore.getState().progress.exerciseProgress['ex-1'];
      expect(entry.totalAttempts).toBe(2);
      expect(entry.correctAttempts).toBe(1); // second score 0.5 < 0.7
      expect(entry.bestScore).toBe(0.85);
      expect(entry.averageTime).toBe(50); // (60*1 + 40) / 2
    });
  });

  describe('updateStreak', () => {
    it('sets streak to 1 on first practice', () => {
      useProgressStore.getState().updateStreak();
      expect(useProgressStore.getState().progress.currentStreak).toBe(1);
      expect(useProgressStore.getState().progress.longestStreak).toBe(1);
    });

    it('increments streak for consecutive days', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      useProgressStore.setState({
        progress: { ...initialProgress, currentStreak: 3, longestStreak: 3, lastPracticeDate: yesterday },
      });
      useProgressStore.getState().updateStreak();
      expect(useProgressStore.getState().progress.currentStreak).toBe(4);
      expect(useProgressStore.getState().progress.longestStreak).toBe(4);
    });

    it('resets streak after gap > 1 day', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      useProgressStore.setState({
        progress: { ...initialProgress, currentStreak: 5, longestStreak: 5, lastPracticeDate: threeDaysAgo },
      });
      useProgressStore.getState().updateStreak();
      expect(useProgressStore.getState().progress.currentStreak).toBe(1);
      // longestStreak should remain unchanged
      expect(useProgressStore.getState().progress.longestStreak).toBe(5);
    });

    it('does nothing if already practiced today', () => {
      const today = new Date();
      useProgressStore.setState({
        progress: { ...initialProgress, currentStreak: 3, longestStreak: 5, lastPracticeDate: today },
      });
      useProgressStore.getState().updateStreak();
      // State should remain unchanged
      expect(useProgressStore.getState().progress.currentStreak).toBe(3);
    });

    it('is idempotent within a day and increments once the next day', () => {
      // First practice today → streak starts at 1 and lastPracticeDate is stamped
      useProgressStore.getState().updateStreak();
      expect(useProgressStore.getState().progress.currentStreak).toBe(1);

      // Second call the SAME day → no increment (idempotent)
      useProgressStore.getState().updateStreak();
      expect(useProgressStore.getState().progress.currentStreak).toBe(1);

      // Simulate the recorded practice having happened yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      useProgressStore.setState({
        progress: { ...useProgressStore.getState().progress, lastPracticeDate: yesterday },
      });

      // Next-day call increments exactly once
      useProgressStore.getState().updateStreak();
      expect(useProgressStore.getState().progress.currentStreak).toBe(2);

      // Repeated call the same (next) day → still no further increment
      useProgressStore.getState().updateStreak();
      expect(useProgressStore.getState().progress.currentStreak).toBe(2);
    });
  });

  describe('SM-2 updateReviewItem', () => {
    it('quality < 3 resets repetitions and interval', () => {
      // First, create an item with some repetitions
      useProgressStore.getState().updateReviewItem('ex-1', 5);
      useProgressStore.getState().updateReviewItem('ex-1', 5);
      // Now fail it
      useProgressStore.getState().updateReviewItem('ex-1', 2);
      const item = useProgressStore.getState().spacedRepetition.items['ex-1'];
      expect(item.repetitions).toBe(0);
      expect(item.interval).toBe(1);
    });

    it('quality >= 3 increases interval and repetitions', () => {
      useProgressStore.getState().updateReviewItem('ex-1', 4);
      const item1 = useProgressStore.getState().spacedRepetition.items['ex-1'];
      expect(item1.repetitions).toBe(1);
      expect(item1.interval).toBe(1); // first rep → interval 1

      useProgressStore.getState().updateReviewItem('ex-1', 4);
      const item2 = useProgressStore.getState().spacedRepetition.items['ex-1'];
      expect(item2.repetitions).toBe(2);
      expect(item2.interval).toBe(6); // second rep → interval 6
    });

    it('easeFactor never drops below 1.3', () => {
      // Repeatedly give quality 0 to drive easeFactor down
      for (let i = 0; i < 20; i++) {
        useProgressStore.getState().updateReviewItem('ex-1', 0);
      }
      const item = useProgressStore.getState().spacedRepetition.items['ex-1'];
      expect(item.easeFactor).toBeGreaterThanOrEqual(1.3);
    });
  });

  describe('getNextReviews', () => {
    it('returns items with nextReview <= now', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      useProgressStore.setState({
        spacedRepetition: {
          lastReviewDate: null,
          items: {
            'ex-1': { exerciseId: 'ex-1', easeFactor: 2.5, interval: 1, repetitions: 1, nextReview: pastDate },
            'ex-2': { exerciseId: 'ex-2', easeFactor: 2.5, interval: 10, repetitions: 3, nextReview: futureDate },
          },
        },
      });
      const reviews = useProgressStore.getState().getNextReviews();
      expect(reviews).toHaveLength(1);
      expect(reviews[0].exerciseId).toBe('ex-1');
    });
  });

  describe('resetProgress', () => {
    it('restores initial state', () => {
      useProgressStore.getState().recordExerciseCompletion('ex-1', 0.9, 30);
      useProgressStore.getState().updateReviewItem('ex-1', 4);
      useProgressStore.getState().resetProgress();
      const state = useProgressStore.getState();
      expect(state.progress.totalExercisesCompleted).toBe(0);
      expect(state.progress.exerciseProgress).toEqual({});
      expect(state.spacedRepetition.items).toEqual({});
    });
  });

  describe('exportData / importData', () => {
    it('exports a versioned JSON snapshot of progress', () => {
      useProgressStore.getState().recordExerciseCompletion('ex-1', 0.9, 30);
      const json = useProgressStore.getState().exportData();
      const parsed = JSON.parse(json);
      expect(parsed.schema).toBe('gtw-progress');
      expect(parsed.version).toBe(1);
      expect(typeof parsed.exportedAt).toBe('string');
      expect(parsed.progress.totalExercisesCompleted).toBe(1);
      expect(parsed.progress.exerciseProgress['ex-1']).toBeDefined();
      expect(parsed.spacedRepetition.items).toEqual({});
    });

    it('round-trips: import restores an exported snapshot', () => {
      useProgressStore.getState().recordExerciseCompletion('ex-1', 0.9, 30);
      useProgressStore.getState().updateReviewItem('ex-1', 4);
      const json = useProgressStore.getState().exportData();

      // Wipe, then import the snapshot back.
      useProgressStore.getState().resetProgress();
      expect(useProgressStore.getState().progress.totalExercisesCompleted).toBe(0);

      const result = useProgressStore.getState().importData(json);
      expect(result.ok).toBe(true);
      const state = useProgressStore.getState();
      expect(state.progress.totalExercisesCompleted).toBe(1);
      expect(state.progress.exerciseProgress['ex-1']).toBeDefined();
      expect(state.spacedRepetition.items['ex-1']).toBeDefined();
    });

    it('replaces (not merges) current progress on import', () => {
      useProgressStore.getState().recordExerciseCompletion('ex-1', 0.9, 30);
      const json = useProgressStore.getState().exportData();
      // Add a second exercise that is NOT in the snapshot.
      useProgressStore.getState().recordExerciseCompletion('ex-2', 0.8, 20);
      expect(Object.keys(useProgressStore.getState().progress.exerciseProgress)).toHaveLength(2);

      useProgressStore.getState().importData(json);
      const keys = Object.keys(useProgressStore.getState().progress.exerciseProgress);
      expect(keys).toEqual(['ex-1']);
    });

    it('rejects non-JSON input without mutating state', () => {
      useProgressStore.getState().recordExerciseCompletion('ex-1', 0.9, 30);
      const result = useProgressStore.getState().importData('not json {');
      expect(result.ok).toBe(false);
      expect(result.error).toBeTruthy();
      // State untouched.
      expect(useProgressStore.getState().progress.totalExercisesCompleted).toBe(1);
    });

    it('rejects valid JSON that is not a progress export', () => {
      const result = useProgressStore.getState().importData(JSON.stringify({ hello: 'world' }));
      expect(result.ok).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
});
