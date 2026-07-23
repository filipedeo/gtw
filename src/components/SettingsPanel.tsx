import React, { useState } from 'react';
import { useGuitarStore } from '../stores/guitarStore';
import { useProgressStore } from '../stores/progressStore';
import { useThemeStore } from '../stores/themeStore';
import { STANDARD_TUNINGS, Instrument, NOTE_NAMES, makeCustomTuning, findStandardTuningKey } from '../types/guitar';

// Synthetic <select> value representing a user-defined tuning.
const CUSTOM_TUNING_VALUE = '__custom__';

// Octaves offered per string in the custom-tuning editor (covers guitar + bass ranges).
const CUSTOM_TUNING_OCTAVES = [0, 1, 2, 3, 4, 5, 6];

// Split a tuning note (e.g. "C#3") into its pitch class and octave for editing.
function parseTuningNote(note: string): { pitch: string; octave: number } {
  const match = note.match(/^([A-G](?:#|b)?)(-?\d+)$/);
  if (!match) return { pitch: 'E', octave: 2 };
  return { pitch: match[1], octave: parseInt(match[2], 10) };
}

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
    if (tuningKey === CUSTOM_TUNING_VALUE) {
      // Enter custom mode seeded from the current tuning's notes so the user
      // edits from a sensible starting point.
      setTuning(makeCustomTuning(tuning.notes));
      return;
    }
    const newTuning = STANDARD_TUNINGS[tuningKey];
    if (newTuning) {
      setTuning(newTuning);
    }
  };

  // Update a single string of the (already custom) tuning.
  const handleCustomStringChange = (stringIndex: number, note: string) => {
    const notes = [...tuning.notes];
    notes[stringIndex] = note;
    setTuning(makeCustomTuning(notes));
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

  // A tuning that matches no STANDARD_TUNINGS entry is a user-defined custom one.
  const currentTuningKey = findStandardTuningKey(tuning);
  const isCustomTuning = !currentTuningKey;

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
              className={`flex-1 phone-touch py-2 px-3 rounded-lg font-medium transition-all capitalize ${
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
                className={`flex-1 phone-touch py-2 px-4 rounded-lg font-medium transition-all ${
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
            value={currentTuningKey ?? CUSTOM_TUNING_VALUE}
            onChange={(e) => handleTuningChange(e.target.value)} aria-label="Tuning"
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
            <option value={CUSTOM_TUNING_VALUE}>Custom…</option>
          </select>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {tuning.notes.join(' - ')}
          </p>

          {/* Custom tuning editor — one note picker per string (low to high). */}
          {isCustomTuning && (
            <div className="mt-3 space-y-2" role="group" aria-label="Custom tuning">
              {tuning.notes.map((note, i) => {
                const { pitch, octave } = parseTuningNote(note);
                const stringLabel = stringCount - i; // string 1 = highest pitch
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs w-16 shrink-0" style={{ color: 'var(--text-muted)' }}>
                      String {stringLabel}
                    </span>
                    <select
                      aria-label={`String ${stringLabel} note`}
                      value={pitch}
                      onChange={(e) => handleCustomStringChange(i, `${e.target.value}${octave}`)}
                      className="flex-1 px-2 py-1.5 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      {NOTE_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <select
                      aria-label={`String ${stringLabel} octave`}
                      value={String(octave)}
                      onChange={(e) => handleCustomStringChange(i, `${pitch}${e.target.value}`)}
                      className="w-16 shrink-0 px-2 py-1.5 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      {CUSTOM_TUNING_OCTAVES.map(o => <option key={o} value={String(o)}>{o}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
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
