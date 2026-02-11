import React from 'react';
import { useGuitarStore } from '../stores/guitarStore';
import { DisplayMode } from '../types/guitar';

interface DisplayModeToggleProps {
  compact?: boolean;
}

const DisplayModeToggle: React.FC<DisplayModeToggleProps> = ({ compact = false }) => {
  const { displayMode, setDisplayMode } = useGuitarStore();

  const modes: { value: DisplayMode; label: string; shortLabel: string }[] = [
    { value: 'notes', label: 'Notes', shortLabel: 'Notes' },
    { value: 'intervals', label: 'Intervals', shortLabel: 'Int.' },
    { value: 'degrees', label: 'Degrees', shortLabel: 'Deg.' },
  ];

  return (
    <div className="flex items-center gap-1">
      {!compact && (
        <span className="text-xs mr-1" style={{ color: 'var(--text-muted)' }}>Display:</span>
      )}
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => setDisplayMode(mode.value)}
          className={`px-2 py-1 rounded text-xs font-medium transition-all ${
            displayMode === mode.value ? 'btn-primary' : ''
          }`}
          style={displayMode !== mode.value ? {
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
          } : { padding: '0.25rem 0.5rem' }}
          aria-pressed={displayMode === mode.value}
          title={`Show ${mode.label.toLowerCase()}`}
        >
          {compact ? mode.shortLabel : mode.label}
        </button>
      ))}
    </div>
  );
};

export default DisplayModeToggle;
