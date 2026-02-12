import React, { useState, useEffect, useRef, useCallback } from 'react';

interface PracticeTimerProps {
  targetMinutes?: number;
}

const TARGET_PRESETS = [5, 10, 15, 30, 60];

const PracticeTimer: React.FC<PracticeTimerProps> = React.memo(({ targetMinutes: initialTarget }) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [targetMinutes, setTargetMinutes] = useState<number | null>(initialTarget ?? null);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setElapsedSeconds(0);
  }, []);

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }, [isRunning, pauseTimer, startTimer]);

  // Interval management
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const targetSeconds = targetMinutes ? targetMinutes * 60 : null;
  const targetReached = targetSeconds !== null && elapsedSeconds >= targetSeconds;
  const progressPercent = targetSeconds ? Math.min((elapsedSeconds / targetSeconds) * 100, 100) : 0;

  // Determine timer color based on state
  const getTimerColor = (): string => {
    if (targetReached) return 'var(--success)';
    if (isRunning) return 'var(--accent-primary)';
    return 'var(--text-secondary)';
  };

  return (
    <div className="flex items-center gap-2 relative">
      {/* Timer display */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-mono cursor-pointer transition-all min-w-[44px] min-h-[44px]"
        style={{
          backgroundColor: targetReached
            ? 'rgba(16, 185, 129, 0.15)'
            : isRunning
              ? 'rgba(59, 130, 246, 0.1)'
              : 'var(--bg-tertiary)',
          color: getTimerColor(),
          border: `1px solid ${targetReached ? 'var(--success)' : 'transparent'}`,
        }}
        onClick={toggleTimer}
        title={isRunning ? 'Pause timer' : 'Start timer'}
        role="button"
        aria-label={`Practice timer: ${formatTime(elapsedSeconds)}${targetMinutes ? ` of ${targetMinutes} minutes` : ''}. ${isRunning ? 'Click to pause' : 'Click to start'}`}
      >
        {/* Play/Pause icon */}
        <span className="text-xs" aria-hidden="true">
          {isRunning ? '⏸' : '▶'}
        </span>

        {/* Time display */}
        <span className="font-bold tabular-nums" style={{ minWidth: '3.5rem', textAlign: 'center' }}>
          {formatTime(elapsedSeconds)}
        </span>

        {/* Target indicator */}
        {targetMinutes && (
          <span
            className="text-xs opacity-70"
            style={{ color: getTimerColor() }}
          >
            / {targetMinutes}m
          </span>
        )}
      </div>

      {/* Progress bar (only when target is set) */}
      {targetMinutes && isRunning && (
        <div
          className="absolute bottom-0 left-0 h-0.5 rounded-full transition-all"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: targetReached ? 'var(--success)' : 'var(--accent-primary)',
          }}
          role="progressbar"
          aria-valuenow={elapsedSeconds}
          aria-valuemin={0}
          aria-valuemax={targetSeconds ?? 0}
          aria-label="Timer progress"
        />
      )}

      {/* Target time picker button */}
      <button
        className="text-xs px-2 py-1.5 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-muted)',
        }}
        onClick={() => setShowTargetPicker(!showTargetPicker)}
        title="Set target time"
        aria-label="Set target practice time"
        aria-expanded={showTargetPicker}
      >
        {targetMinutes ? `${targetMinutes}m` : 'Set'}
      </button>

      {/* Reset button */}
      {elapsedSeconds > 0 && (
        <button
          className="text-xs px-2 py-1.5 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-muted)',
          }}
          onClick={resetTimer}
          title="Reset timer"
          aria-label="Reset practice timer"
        >
          Reset
        </button>
      )}

      {/* Target picker dropdown */}
      {showTargetPicker && (
        <div
          className="absolute top-full right-0 mt-1 p-2 rounded-lg shadow-lg z-50"
          style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
          }}
          role="menu"
          aria-label="Target time options"
        >
          <p className="text-xs mb-1.5 px-1" style={{ color: 'var(--text-muted)' }}>
            Target time
          </p>
          <div className="flex flex-col gap-1">
            {TARGET_PRESETS.map((mins) => (
              <button
                key={mins}
                className="text-xs px-3 py-2 rounded text-left transition-colors min-h-[44px] flex items-center"
                style={{
                  backgroundColor: targetMinutes === mins ? 'var(--accent-primary)' : 'transparent',
                  color: targetMinutes === mins ? 'white' : 'var(--text-secondary)',
                }}
                onClick={() => {
                  setTargetMinutes(mins);
                  setShowTargetPicker(false);
                }}
                role="menuitem"
              >
                {mins} min
              </button>
            ))}
            <button
              className="text-xs px-3 py-2 rounded text-left transition-colors min-h-[44px] flex items-center"
              style={{
                backgroundColor: targetMinutes === null ? 'var(--accent-primary)' : 'transparent',
                color: targetMinutes === null ? 'white' : 'var(--text-muted)',
              }}
              onClick={() => {
                setTargetMinutes(null);
                setShowTargetPicker(false);
              }}
              role="menuitem"
            >
              No target
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default PracticeTimer;
