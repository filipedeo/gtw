import React from 'react';
import { Button } from './ui';
import type { ActiveRecall } from '../hooks/useActiveRecall';

// Presentational shell for the active-recall self-test. All state/logic lives in
// useActiveRecall; this only renders it next to PracticeRating in a study
// exercise. Self-hides when a degree check isn't possible for the current view.
const ActiveRecallPanel: React.FC<{ recall: ActiveRecall }> = ({ recall }) => {
  if (!recall.available) return null;

  if (!recall.active) {
    return (
      <div className="card">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span className="eyebrow block mb-1">Active recall</span>
            <p className="text-sm text-fg-muted">
              Hide the labels, then find the asked scale degree on the neck above.
            </p>
          </div>
          <Button variant="primary" onClick={recall.toggle}>
            Test yourself
          </Button>
        </div>
      </div>
    );
  }

  if (recall.isComplete) {
    const { correct, total } = recall.score;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    return (
      <div className="card" role="region" aria-label="Active recall results">
        <span className="eyebrow block mb-1">Active recall — complete</span>
        <p className="text-fg-strong font-semibold mb-3 tabular-nums">
          {correct} / {total} correct ({pct}%)
        </p>
        <div className="flex gap-2">
          <Button variant="primary" onClick={recall.restart}>
            Try again
          </Button>
          <Button variant="secondary" onClick={recall.toggle}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" role="region" aria-label="Active recall test">
      <div className="flex items-center justify-between mb-2">
        <span className="eyebrow">Active recall</span>
        <span className="text-xs text-fg-muted tabular-nums">
          Q {recall.question}/{recall.total} · {recall.score.correct}/{recall.score.total}
        </span>
      </div>
      <p className="text-lg font-semibold text-fg-strong mb-2">{recall.prompt}</p>
      {recall.feedback === null ? (
        <p className="text-sm text-fg-muted">Click the matching note on the fretboard above.</p>
      ) : (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p
            className={`text-sm font-medium ${
              recall.feedback === 'correct' ? 'text-success' : 'text-danger'
            }`}
          >
            {recall.feedback === 'correct'
              ? 'Correct!'
              : 'Not quite — the answer is highlighted above.'}
          </p>
          <Button variant="primary" onClick={recall.next}>
            {recall.score.total >= recall.total ? 'Finish' : 'Next'}
          </Button>
        </div>
      )}
      <button
        onClick={recall.toggle}
        className="mt-3 text-xs text-fg-muted hover:text-fg underline"
      >
        Stop test
      </button>
    </div>
  );
};

export default ActiveRecallPanel;
