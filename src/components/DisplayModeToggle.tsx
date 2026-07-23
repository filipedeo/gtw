import React from 'react';
import { useGuitarStore } from '../stores/guitarStore';
import { DisplayMode } from '../types/guitar';
import { SegmentedControl } from './ui';

interface DisplayModeToggleProps {
  compact?: boolean;
}

const DisplayModeToggle: React.FC<DisplayModeToggleProps> = React.memo(({ compact = false }) => {
  const { displayMode, setDisplayMode } = useGuitarStore();

  const modes: { value: DisplayMode; label: string; shortLabel: string }[] = [
    { value: 'notes', label: 'Notes', shortLabel: 'Notes' },
    { value: 'intervals', label: 'Intervals', shortLabel: 'Int.' },
    { value: 'degrees', label: 'Degrees', shortLabel: 'Deg.' },
  ];

  return (
    <div className="flex items-center gap-2">
      {!compact && (
        <span className="text-xs text-fg-muted">Display:</span>
      )}
      <SegmentedControl
        ariaLabel="Display mode"
        compact={compact}
        value={displayMode}
        onChange={setDisplayMode}
        options={modes.map((mode) => ({
          value: mode.value,
          label: compact ? mode.shortLabel : mode.label,
        }))}
      />
    </div>
  );
});

export default DisplayModeToggle;
