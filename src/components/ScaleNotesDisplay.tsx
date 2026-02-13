import React from 'react';
import { getModeNotes } from '../lib/theoryEngine';
import { normalizeNoteName } from '../types/guitar';

interface ScaleNotesDisplayProps {
  keyName: string;
  scaleName: string;
  displayName: string;
  formula?: string;
}

const ScaleNotesDisplay: React.FC<ScaleNotesDisplayProps> = ({ keyName, scaleName, displayName, formula }) => {
  const normalizedKey = normalizeNoteName(keyName);
  const notes = getModeNotes(normalizedKey, scaleName);

  if (!notes || notes.length === 0) return null;

  return (
    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
          {keyName} {displayName}:
        </span>
        <span className="text-sm font-mono font-medium tracking-wide" style={{ color: 'var(--text-primary)' }}>
          {notes.join(' – ')}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          ({notes.length} notes)
        </span>
      </div>
      {formula && (
        <div className="mt-1">
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            Formula: {formula}
          </span>
        </div>
      )}
    </div>
  );
};

export default React.memo(ScaleNotesDisplay);
