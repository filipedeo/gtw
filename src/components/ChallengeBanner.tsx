import React from 'react';
import { Button, Card } from './ui';
import { TargetIcon, PlayIcon, StopIcon } from './icons';

export interface ChallengeBannerProps {
  active: boolean;
  timeLeft: number;
  answered: number;
  score: number;
  personalBest: number;
  isNewBest: boolean;
  onStart: () => void;
  onStop: () => void;
}

/**
 * Presentational banner for challenge mode. Shows the countdown timer, current
 * score, personal best, and a Start/Stop control. All state is owned by the
 * `useChallengeMode` hook — this component only renders what it's given.
 */
const ChallengeBanner: React.FC<ChallengeBannerProps> = ({
  active,
  timeLeft,
  answered,
  score,
  personalBest,
  isNewBest,
  onStart,
  onStop,
}) => {
  return (
    <Card elevation={1} className="p-[var(--space-4)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: identity + stats */}
        <div className="flex items-center gap-3">
          <TargetIcon size={20} className="text-accent" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[length:var(--fs-sm)] font-semibold text-fg-strong">
              Challenge Mode
            </span>
            <span className="text-[length:var(--fs-xs)] text-fg-muted tabular-nums">
              {active
                ? `Time ${timeLeft}s · Score ${score}/${answered}`
                : `Best: ${personalBest}`}
            </span>
          </div>
        </div>

        {/* Right: new-best badge + control */}
        <div className="flex items-center gap-2">
          {isNewBest && active && (
            <span className="text-[length:var(--fs-xs)] font-semibold text-accent">
              New best!
            </span>
          )}
          <Button
            variant={active ? 'danger' : 'primary'}
            size="sm"
            onClick={active ? onStop : onStart}
          >
            {active ? (
              <>
                <StopIcon size={16} /> Stop
              </>
            ) : (
              <>
                <PlayIcon size={16} /> Start
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ChallengeBanner;
