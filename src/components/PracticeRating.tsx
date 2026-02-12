import React, { useState } from 'react';
import { useProgressStore } from '../stores/progressStore';
import { useExerciseStore } from '../stores/exerciseStore';

interface PracticeRatingProps {
  exerciseId: string;
  exerciseType: string;
}

const RATING_LABELS: Record<number, { label: string; bg: string; color: string }> = {
  1: { label: 'Struggled', bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' },
  3: { label: 'OK', bg: 'rgba(251, 191, 36, 0.1)', color: 'var(--warning)' },
  5: { label: 'Nailed It', bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' },
};

const PracticeRating: React.FC<PracticeRatingProps> = React.memo(({ exerciseId, exerciseType }) => {
  const [ratedQuality, setRatedQuality] = useState<number | null>(null);
  const { recordExerciseCompletion, updateReviewItem } = useProgressStore();
  const { startTime } = useExerciseStore();

  const handleRate = (quality: number) => {
    const timeSpent = startTime ? (Date.now() - startTime) / 1000 : 0;
    const score = quality >= 4 ? 0.9 : quality >= 3 ? 0.7 : 0.4;
    recordExerciseCompletion(exerciseId, score, timeSpent, exerciseType);
    updateReviewItem(exerciseId, quality);
    setRatedQuality(quality);
  };

  if (ratedQuality !== null) {
    const info = RATING_LABELS[ratedQuality] || RATING_LABELS[3];
    return (
      <div
        className="p-3 rounded-lg text-center text-sm font-medium flex items-center justify-center gap-2"
        style={{ backgroundColor: info.bg, color: info.color }}
      >
        <span>{ratedQuality >= 4 ? '✓' : ratedQuality >= 3 ? '•' : '↻'}</span>
        <span>Recorded: {info.label}</span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
      <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
        How did this practice go?
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => handleRate(1)}
          className="flex-1 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}
        >
          Struggled
        </button>
        <button
          onClick={() => handleRate(3)}
          className="flex-1 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', color: 'var(--warning)' }}
        >
          OK
        </button>
        <button
          onClick={() => handleRate(5)}
          className="flex-1 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}
        >
          Nailed It
        </button>
      </div>
    </div>
  );
});

export default PracticeRating;
