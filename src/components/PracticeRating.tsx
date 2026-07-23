import React, { useState } from 'react';
import { useProgressStore } from '../stores/progressStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { SegmentedControl } from './ui';
import { CheckIcon, ResetIcon } from './icons';

interface PracticeRatingProps {
  exerciseId: string;
  exerciseType: string;
}

const RATING_LABELS: Record<number, { label: string; bg: string; color: string }> = {
  1: { label: 'Struggled', bg: 'var(--danger-bg)', color: 'var(--danger)' },
  3: { label: 'OK', bg: 'var(--warning-bg)', color: 'var(--warning)' },
  5: { label: 'Nailed It', bg: 'var(--success-bg)', color: 'var(--success)' },
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
        className="p-3 rounded-[var(--rad-md)] text-center text-sm font-medium flex items-center justify-center gap-2"
        style={{ backgroundColor: info.bg, color: info.color }}
      >
        <span aria-hidden="true">{ratedQuality >= 4 ? <CheckIcon size={16} /> : ratedQuality >= 3 ? '•' : <ResetIcon size={16} />}</span>
        <span>Recorded: {info.label}</span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-[var(--rad-md)] bg-surface-sunken">
      <p className="text-sm font-medium mb-3 text-fg-strong">
        How did this practice go?
      </p>
      <SegmentedControl
        ariaLabel="Rate this practice session"
        block
        value={0}
        onChange={(v) => handleRate(Number(v))}
        options={[
          { value: 1, label: 'Struggled', activeClassName: 'bg-danger text-white', inactiveClassName: 'text-danger' },
          { value: 3, label: 'OK', activeClassName: 'bg-warning text-white', inactiveClassName: 'text-warning' },
          { value: 5, label: 'Nailed It', activeClassName: 'bg-success text-white', inactiveClassName: 'text-success' },
        ]}
      />
    </div>
  );
});

export default PracticeRating;
