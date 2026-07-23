import React from 'react';
import { useProgressStore } from '../stores/progressStore';
import { useExerciseStore } from '../stores/exerciseStore';
import SessionPlanner from './SessionPlanner';
import { FlameIcon } from './icons';
import PracticePlanCard from './PracticePlanCard';
import ReviewSessionCard from './ReviewSessionCard';

const ProgressDashboard: React.FC<{ showSessionPlanner?: boolean }> = React.memo(({ showSessionPlanner = true }) => {
  const { progress, getNextReviews } = useProgressStore();
  const { sessionResults } = useExerciseStore();

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  const nextReviews = getNextReviews();
  const sessionAccuracy = sessionResults.length > 0
    ? Math.round(sessionResults.reduce((acc, r) => acc + r.score, 0) / sessionResults.length * 100)
    : 0;

  return (
    <>
    <PracticePlanCard />
    <ReviewSessionCard />
    {showSessionPlanner && <SessionPlanner />}

    <div className="card">
      <h3 className="font-semibold mb-4 text-fg-strong">
        Progress
      </h3>

      <div className="space-y-4">
        {/* Streak — single semantic highlight (warm) */}
        <div
          className="flex items-center justify-between p-3 rounded-lg bg-warning-bg"
          role="region"
          aria-label="Practice streak"
        >
          <div>
            <p className="text-sm text-warning" id="streak-label">Current Streak</p>
            <p
              className="text-2xl font-bold tabular-nums text-warning"
              aria-labelledby="streak-label"
              aria-describedby="streak-value"
            >
              <span id="streak-value">{progress.currentStreak} {progress.currentStreak === 1 ? 'day' : 'days'}</span>
            </p>
          </div>
          <FlameIcon size={28} className="text-warning" aria-hidden="true" />
        </div>

        {/* Stats Grid — accent + neutral family */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="Practice statistics">
          <div
            className="p-3 rounded-lg bg-accent-subtle"
            role="region"
            aria-label={`Exercises completed: ${progress.totalExercisesCompleted}`}
          >
            <p className="text-xs text-accent">Exercises Done</p>
            <p className="text-xl font-bold tabular-nums text-accent" aria-hidden="true">
              {progress.totalExercisesCompleted}
            </p>
          </div>
          <div
            className="p-3 rounded-lg bg-surface-sunken"
            role="region"
            aria-label={`Time practiced: ${formatTime(progress.totalTimeSpent)}`}
          >
            <p className="text-xs text-fg-muted">Time Practiced</p>
            <p className="text-xl font-bold tabular-nums text-fg" aria-hidden="true">
              {formatTime(progress.totalTimeSpent)}
            </p>
          </div>
          <div
            className="p-3 rounded-lg bg-surface-sunken"
            role="region"
            aria-label={`Best streak: ${progress.longestStreak} ${progress.longestStreak === 1 ? 'day' : 'days'}`}
          >
            <p className="text-xs text-fg-muted">Best Streak</p>
            <p className="text-xl font-bold tabular-nums text-fg" aria-hidden="true">
              {progress.longestStreak} {progress.longestStreak === 1 ? 'day' : 'days'}
            </p>
          </div>
          <div
            className="p-3 rounded-lg bg-surface-sunken"
            role="region"
            aria-label={`Last practice: ${formatDate(progress.lastPracticeDate)}`}
          >
            <p className="text-xs text-fg-muted">Last Practice</p>
            <p className="text-sm font-bold text-fg" aria-hidden="true">
              {formatDate(progress.lastPracticeDate)}
            </p>
          </div>
        </div>

        {/* Session Stats */}
        {sessionResults.length > 0 && (
          <div
            className="p-3 rounded-lg bg-surface-sunken"
            role="region"
            aria-label={`This session: ${sessionResults.length} exercises completed with ${sessionAccuracy}% accuracy`}
          >
            <p className="text-sm font-medium mb-2 text-fg-strong">
              This Session
            </p>
            <div className="flex justify-between text-sm text-fg tabular-nums">
              <span>Exercises: {sessionResults.length}</span>
              <span>Accuracy: {sessionAccuracy}%</span>
            </div>
          </div>
        )}

        {/* Due for Review */}
        {nextReviews.length > 0 && (
          <div
            className="p-3 rounded-lg bg-warning-bg"
            role="alert"
            aria-label={`${nextReviews.length} exercises due for review`}
          >
            <p className="text-sm font-medium mb-2 text-warning">
              Due for Review
            </p>
            <p className="text-2xl font-bold tabular-nums text-warning" aria-hidden="true">
              {nextReviews.length} exercises
            </p>
          </div>
        )}

        {/* Weak Areas */}
        <div role="region" aria-label="Areas to improve">
          <p className="text-sm font-medium mb-2 text-fg-strong">
            Areas to Improve
          </p>
          {progress.weakAreas.length > 0 ? (
            <ul className="flex flex-wrap gap-2 list-none p-0 m-0" aria-label={`${progress.weakAreas.length} areas need improvement`}>
              {progress.weakAreas.map((area, idx) => (
                <li
                  key={idx}
                  className="text-xs px-2 py-1 rounded bg-danger-bg text-danger"
                >
                  {area}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-fg-muted">
              Practice more exercises to discover areas for improvement
            </p>
          )}
        </div>

        {/* Strong Areas */}
        <div role="region" aria-label="Strengths">
          <p className="text-sm font-medium mb-2 text-fg-strong">
            Strengths
          </p>
          {progress.strongAreas.length > 0 ? (
            <ul className="flex flex-wrap gap-2 list-none p-0 m-0" aria-label={`${progress.strongAreas.length} strength areas`}>
              {progress.strongAreas.map((area, idx) => (
                <li
                  key={idx}
                  className="text-xs px-2 py-1 rounded bg-success-bg text-success"
                >
                  {area}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-fg-muted">
              Keep practicing to build your strengths
            </p>
          )}
        </div>
      </div>
    </div>
    </>
  );
});

export default ProgressDashboard;
