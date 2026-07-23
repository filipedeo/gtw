import React, { useState, useRef } from 'react';
import { useGuitarStore } from '../stores/guitarStore';
import { useProgressStore } from '../stores/progressStore';
import { useThemeStore } from '../stores/themeStore';
import { Instrument } from '../types/guitar';
import TuningPicker from './TuningPicker';
import { SunIcon, MoonIcon, MonitorIcon } from './icons';

const SettingsPanel: React.FC = () => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    instrument,
    displayMode,
    showAllNotes,
    setInstrument,
    setDisplayMode,
    toggleShowAllNotes,
  } = useGuitarStore();

  const { resetProgress, exportData, importData } = useProgressStore();
  const { theme, setTheme } = useThemeStore();

  const handleInstrumentChange = (inst: Instrument) => {
    setInstrument(inst);
  };

  const handleResetProgress = () => {
    if (showResetConfirm) {
      resetProgress();
      setShowResetConfirm(false);
    } else {
      setShowResetConfirm(true);
    }
  };

  const handleExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gtw-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clear the input so re-selecting the same file still fires onChange.
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importData(typeof reader.result === 'string' ? reader.result : '');
      setImportMsg(
        result.ok
          ? { ok: true, text: 'Progress imported successfully.' }
          : { ok: false, text: result.error ?? 'Import failed.' }
      );
    };
    reader.onerror = () => setImportMsg({ ok: false, text: 'Could not read that file.' });
    reader.readAsText(file);
  };

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
              className={`flex-1 phone-touch py-2 px-3 rounded-lg font-medium transition-all capitalize inline-flex items-center justify-center gap-2 ${
                theme === t ? 'btn-primary' : ''
              }`}
              style={theme !== t ? {
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)'
              } : {}}
            >
              {t === 'light' ? <SunIcon size={16} /> : t === 'dark' ? <MoonIcon size={16} /> : <MonitorIcon size={16} />}
              {t}
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
                className={`flex-1 phone-touch py-2 px-4 rounded-lg font-medium transition-all ${
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

        {/* String count + tuning (preset or custom) — self-contained picker */}
        <TuningPicker />
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
          <div className="flex flex-wrap gap-2">
            {([
              { value: 'notes', label: 'Notes' },
              { value: 'intervals', label: 'Intervals' },
              { value: 'degrees', label: 'Degrees' }
            ] as const).map(mode => (
              <button
                key={mode.value}
                onClick={() => setDisplayMode(mode.value)}
                className={`px-4 py-2 phone-touch rounded-lg font-medium transition-all text-sm ${
                  displayMode === mode.value ? 'btn-primary' : ''
                }`}
                style={displayMode !== mode.value ? {
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)'
                } : {}}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Show All Notes */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer phone-touch">
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

        {/* Backup / restore */}
        <div className="mb-4 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex-1 phone-touch py-2 px-4 rounded-lg font-medium transition-colors text-sm"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              Export progress
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 phone-touch py-2 px-4 rounded-lg font-medium transition-colors text-sm"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              Import progress
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Import progress backup file"
            onChange={handleImportFile}
          />
          {importMsg ? (
            <p
              className="text-xs"
              role="status"
              style={{ color: importMsg.ok ? 'var(--success)' : 'var(--error)' }}
            >
              {importMsg.text}
            </p>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Save a JSON backup of your progress, or restore one on another device.
            </p>
          )}
        </div>

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
