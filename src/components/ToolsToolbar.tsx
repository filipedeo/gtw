import React, { useState } from 'react';
import GuitarTuner from './GuitarTuner';
import MetronomeControls from './MetronomeControls';
import { Card } from './ui';
import { cn } from '../lib/cn';
import { TargetIcon, MusicIcon } from './icons';

export type ActiveToolTab = 'tuner' | 'metronome' | null;

interface ToolsToolbarProps {
  activeTab?: ActiveToolTab;
  onTabChange?: (tab: ActiveToolTab) => void;
  hideTabButtons?: boolean;
}

const TAB_BASE =
  'inline-flex items-center gap-1.5 px-3 phone-touch min-h-[var(--target-compact)] ' +
  'rounded-t-[var(--rad-md)] text-[length:var(--fs-sm)] font-medium transition-colors border-b-2 cursor-pointer';

const ToolsToolbar: React.FC<ToolsToolbarProps> = ({
  activeTab: controlledTab,
  onTabChange,
  hideTabButtons = false,
}) => {
  const [internalTab, setInternalTab] = useState<ActiveToolTab>(null);
  const activeTab = controlledTab !== undefined ? controlledTab : internalTab;

  const toggleTab = (tab: ActiveToolTab) => {
    const next = activeTab === tab ? null : tab;
    if (onTabChange) {
      onTabChange(next);
    } else {
      setInternalTab(next);
    }
  };

  const tabClass = (tab: ActiveToolTab) =>
    cn(
      TAB_BASE,
      activeTab === tab
        ? 'bg-surface-raised text-accent border-accent'
        : 'bg-surface-sunken text-fg-muted border-transparent hover:bg-surface-hover hover:text-fg',
    );

  return (
    <div className="max-w-[1800px] mx-auto px-4 mt-2">
      {/* Tab toggles */}
      <div className="flex gap-2" style={{ display: hideTabButtons ? 'none' : undefined }}>
        <button
          type="button"
          onClick={() => toggleTab('tuner')}
          className={tabClass('tuner')}
          aria-pressed={activeTab === 'tuner'}
        >
          <TargetIcon size={16} /> Tuner
        </button>
        <button
          type="button"
          onClick={() => toggleTab('metronome')}
          className={tabClass('metronome')}
          aria-pressed={activeTab === 'metronome'}
        >
          <MusicIcon size={16} /> Metronome
        </button>
      </div>

      {/* Panel content — both always mounted for audio persistence, visibility toggled */}
      <Card
        elevation={2}
        className="rounded-t-none"
        style={{ display: activeTab ? 'block' : 'none' }}
      >
        <div style={{ display: activeTab === 'tuner' ? 'block' : 'none' }}>
          <GuitarTuner />
        </div>
        <div style={{ display: activeTab === 'metronome' ? 'block' : 'none' }}>
          <MetronomeControls />
        </div>
      </Card>
    </div>
  );
};

export default ToolsToolbar;
