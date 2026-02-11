import React, { useState } from 'react';
import GuitarTuner from './GuitarTuner';
import MetronomeControls from './MetronomeControls';

type ActiveTab = 'tuner' | 'metronome' | null;

const ToolsToolbar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>(null);

  const toggleTab = (tab: ActiveTab) => {
    setActiveTab((prev) => (prev === tab ? null : tab));
  };

  return (
    <div className="max-w-[1800px] mx-auto px-4 mt-2">
      {/* Tab toggles */}
      <div className="flex gap-2">
        <button
          onClick={() => toggleTab('tuner')}
          className="px-3 py-1.5 rounded-t-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: activeTab === 'tuner' ? 'var(--card-bg)' : 'var(--bg-tertiary)',
            color: activeTab === 'tuner' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'tuner' ? '2px solid var(--accent-primary)' : '2px solid transparent',
          }}
        >
          🎵 Tuner
        </button>
        <button
          onClick={() => toggleTab('metronome')}
          className="px-3 py-1.5 rounded-t-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: activeTab === 'metronome' ? 'var(--card-bg)' : 'var(--bg-tertiary)',
            color: activeTab === 'metronome' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'metronome' ? '2px solid var(--accent-primary)' : '2px solid transparent',
          }}
        >
          🥁 Metronome
        </button>
      </div>

      {/* Panel content — both always mounted for audio persistence, visibility toggled */}
      <div
        className="card rounded-t-none"
        style={{ display: activeTab ? 'block' : 'none' }}
      >
        <div style={{ display: activeTab === 'tuner' ? 'block' : 'none' }}>
          <GuitarTuner />
        </div>
        <div style={{ display: activeTab === 'metronome' ? 'block' : 'none' }}>
          <MetronomeControls />
        </div>
      </div>
    </div>
  );
};

export default ToolsToolbar;
