import React from 'react';
import { useProgressStore } from '../stores/progressStore';
import { useExerciseStore } from '../stores/exerciseStore';

const ProgressDashboard: React.FC = () => {
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
    <div className="card">
      <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Progress
      </h3>
      
      <div className="space-y-4">
        {/* Streak */}
        <div 
          className="flex items-center justify-between p-3 rounded-lg"
          style={{ backgroundColor: 'rgba(251, 146, 60, 0.1)' }}
        >
          <div>
            <p className="text-sm" style={{ color: 'var(--warning)' }}>Current Streak</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>
              {progress.currentStreak} days
            </p>
          </div>
          <div className="text-3xl">🔥</div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
          >
            <p className="text-xs" style={{ color: 'var(--accent-primary)' }}>Exercises Done</p>
            <p className="text-xl font-bold" style={{ color: 'var(--accent-primary)' }}>
              {progress.totalExercisesCompleted}
            </p>
          </div>
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
          >
            <p className="text-xs" style={{ color: 'var(--success)' }}>Time Practiced</p>
            <p className="text-xl font-bold" style={{ color: 'var(--success)' }}>
              {formatTime(progress.totalTimeSpent)}
            </p>
          </div>
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}
          >
            <p className="text-xs" style={{ color: '#8b5cf6' }}>Best Streak</p>
            <p className="text-xl font-bold" style={{ color: '#8b5cf6' }}>
              {progress.longestStreak} days
            </p>
          </div>
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Last Practice</p>
            <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
              {formatDate(progress.lastPracticeDate)}
            </p>
          </div>
        </div>

        {/* Session Stats */}
        {sessionResults.length > 0 && (
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              This Session
            </p>
            <div className="flex justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>Exercises: {sessionResults.length}</span>
              <span>Accuracy: {sessionAccuracy}%</span>
            </div>
          </div>
        )}

        {/* Due for Review */}
        {nextReviews.length > 0 && (
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)' }}
          >
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--warning)' }}>
              Due for Review
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>
              {nextReviews.length} exercises
            </p>
          </div>
        )}

        {/* Weak Areas */}
        {progress.weakAreas.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Areas to Improve
            </p>
            <div className="flex flex-wrap gap-2">
              {progress.weakAreas.map((area, idx) => (
                <span 
                  key={idx} 
                  className="text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Strong Areas */}
        {progress.strongAreas.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Strengths
            </p>
            <div className="flex flex-wrap gap-2">
              {progress.strongAreas.map((area, idx) => (
                <span 
                  key={idx} 
                  className="text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressDashboard;