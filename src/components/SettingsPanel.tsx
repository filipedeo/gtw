import React, { useState } from 'react';
import { useGuitarStore } from '../stores/guitarStore';
import { useProgressStore } from '../stores/progressStore';
import { useThemeStore } from '../stores/themeStore';
import { STANDARD_TUNINGS, DisplayMode, Instrument } from '../types/guitar';

const SettingsPanel: React.FC = () => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const {
    instrument,
    stringCount,
    tuning,
    displayMode,
    showAllNotes,
    setInstrument,
    setStringCount,
    setTuning,
    setDisplayMode,
    toggleShowAllNotes,
  } = useGuitarStore();

  const { resetProgress } = useProgressStore();
  const { theme, setTheme } = useThemeStore();

  const handleInstrumentChange = (inst: Instrument) => {
    setInstrument(inst);
  };

  const handleStringCountChange = (count: 4 | 5 | 6 | 7) => {
    setStringCount(count);
  };

  const handleTuningChange = (tuningKey: string) => {
    const newTuning = STANDARD_TUNINGS[tuningKey];
    if (newTuning) {
      setTuning(newTuning);
    }
  };

  const handleResetProgress = () => {
    if (showResetConfirm) {
      resetProgress();
      setShowResetConfirm(false);
    } else {
      setShowResetConfirm(true);
    }
  };

  const stringOptions: (4 | 5 | 6 | 7)[] = instrument === 'bass' ? [4, 5, 6] : [6, 7];

  const availableTunings = Object.entries(STANDARD_TUNINGS).filter(([key]) => {
    if (instrument === 'bass') {
      return key.startsWith('bass-') && STANDARD_TUNINGS[key].notes.length === stringCount;
    }
    if (stringCount === 6) return key.includes('-6') && !key.startsWith('bass-');
    return key.includes('-7') && !key.startsWith('bass-');
  });

  return (
    <div className="space-y-6">
      {/* Theme */}
      <div>
        <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          Appearance
        </h4>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all capitalize ${
                theme === t ? 'btn-primary' : ''
              }`}
              style={theme !== t ? {
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)'
              } : {}}
            >
              {t === 'light' ? '☀️ ' : t === 'dark' ? '🌙 ' : '💻 '}{t}
            </button>
          ))}
        </div>
      </div>

      {/* Instrument & Guitar Configuration */}
      <div>
        <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          Instrument
        </h4>

        {/* Instrument Toggle */}
        <div className="mb-4">
          <div className="flex gap-2">
            {(['guitar', 'bass'] as Instrument[]).map(inst => (
              <button
                key={inst}
                onClick={() => handleInstrumentChange(inst)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  instrument === inst ? 'btn-primary' : ''
                }`}
                style={instrument !== inst ? {
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)'
                } : {}}
              >
                {inst === 'guitar' ? '🎸 Guitar' : '🎸 Bass'}
              </button>
            ))}
          </div>
        </div>

        {/* String Count */}
        <div className="mb-4">
          <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            Number of Strings
          </label>
          <div className="flex gap-2">
            {stringOptions.map(count => (
              <button
                key={count}
                onClick={() => handleStringCountChange(count)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  stringCount === count ? 'btn-primary' : ''
                }`}
                style={stringCount !== count ? {
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)'
                } : {}}
              >
                {count} Strings
              </button>
            ))}
          </div>
        </div>

        {/* Tuning */}
        <div className="mb-4">
          <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            Tuning
          </label>
          <select
            value={Object.entries(STANDARD_TUNINGS).find(([_, t]) => t.name === tuning.name)?.[0] || ''}
            onChange={(e) => handleTuningChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }}
          >
            {availableTunings.map(([key, t]) => (
              <option key={key} value={key}>{t.name}</option>
            ))}
          </select>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {tuning.notes.join(' - ')}
          </p>
        </div>
      </div>

      {/* Display Settings */}
      <div>
        <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          Display Settings
        </h4>

        {/* Display Mode */}
        <div className="mb-4">
          <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            Note Display
          </label>
          <select
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
            className="w-full px-3 py-2 rounded-lg"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }}
          >
            <option value="notes">Note Names (C, D, E...)</option>
            <option value="intervals">Intervals (R, 2, 3...)</option>
            <option value="degrees">Scale Degrees (1, 2, 3...)</option>
          </select>
        </div>

        {/* Show All Notes */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showAllNotes}
              onChange={toggleShowAllNotes}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              Show all notes on fretboard
            </span>
          </label>
        </div>
      </div>

      {/* Data Management */}
      <div>
        <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          Data Management
        </h4>
        {showResetConfirm ? (
          <div className="p-4 rounded-lg space-y-3" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--error)' }}>
              Are you sure? This will permanently delete all your practice history and progress.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleResetProgress}
                className="flex-1 py-2 px-4 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: 'var(--error)', color: 'white' }}
              >
                Yes, Reset Everything
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 px-4 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={handleResetProgress}
              className="w-full py-2 px-4 rounded-lg transition-colors"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--error)'
              }}
            >
              Reset All Progress
            </button>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              This will clear all your practice history and progress data.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
