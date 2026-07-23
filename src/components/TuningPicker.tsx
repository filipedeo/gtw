import React from 'react';
import { useGuitarStore } from '../stores/guitarStore';
import {
  STANDARD_TUNINGS,
  NOTE_NAMES,
  normalizeNoteName,
  makeCustomTuning,
  findStandardTuningKey,
} from '../types/guitar';

/**
 * Self-contained tuning picker.
 *
 * Lets the user pick a preset tuning (standard, Drop D, DADGAD, Open G/D, Eb
 * standard, 7/8-string, bass variants) or define an arbitrary per-string custom
 * tuning. It reads/writes the shared guitar store directly, so it can be mounted
 * anywhere (settings panel, a toolbar popover, a dedicated page) with no props.
 *
 * The open-string tuning is the single source of truth every fretboard/exercise
 * derives note names from (see utils/fretboardCalculations.getNoteAtPosition),
 * so changing it here propagates everywhere automatically.
 */

// Synthetic <select> value representing a user-defined tuning.
const CUSTOM_TUNING_VALUE = '__custom__';

// Octaves offered per string in the custom-tuning editor (covers guitar + bass ranges).
const CUSTOM_TUNING_OCTAVES = [0, 1, 2, 3, 4, 5, 6];

// Split a tuning note (e.g. "C#3" / "Eb2") into its pitch class and octave for editing.
function parseTuningNote(note: string): { pitch: string; octave: number } {
  const match = note.match(/^([A-G](?:#|b)?)(-?\d+)$/);
  if (!match) return { pitch: 'E', octave: 2 };
  return { pitch: match[1], octave: parseInt(match[2], 10) };
}

// Re-spell a note with sharps so the custom editor's pitch <select> (which only
// offers sharp names) can match presets stored with flats (e.g. Eb standard).
function toSharpNote(note: string): string {
  const { pitch, octave } = parseTuningNote(note);
  return `${normalizeNoteName(pitch)}${octave}`;
}

interface TuningPickerProps {
  /** Show the string-count selector above the tuning picker. Default: true. */
  showStringCount?: boolean;
  /** Render the "Number of Strings" / "Tuning" section labels. Default: true. */
  labels?: boolean;
  className?: string;
}

const TuningPicker: React.FC<TuningPickerProps> = ({
  showStringCount = true,
  labels = true,
  className,
}) => {
  const {
    instrument,
    stringCount,
    tuning,
    setStringCount,
    setTuning,
  } = useGuitarStore();

  // Guitar: 6/7/8 strings. Bass: 4/5/6 strings.
  const stringOptions: (4 | 5 | 6 | 7 | 8)[] =
    instrument === 'bass' ? [4, 5, 6] : [6, 7, 8];

  // Presets that match the current instrument and string count. Filtering by
  // note count (rather than a key suffix) keeps 7/8-string and bass variants
  // correct without special cases.
  const availableTunings = Object.entries(STANDARD_TUNINGS).filter(([key, t]) => {
    const isBass = key.startsWith('bass-');
    if (instrument === 'bass') return isBass && t.notes.length === stringCount;
    return !isBass && t.notes.length === stringCount;
  });

  // A tuning that matches no STANDARD_TUNINGS entry is a user-defined custom one.
  const currentTuningKey = findStandardTuningKey(tuning);
  const isCustomTuning = !currentTuningKey;

  const handleTuningChange = (tuningKey: string) => {
    if (tuningKey === CUSTOM_TUNING_VALUE) {
      // Enter custom mode seeded from the current tuning's notes (re-spelled with
      // sharps) so the per-string editor starts from a sensible, editable point.
      setTuning(makeCustomTuning(tuning.notes.map(toSharpNote)));
      return;
    }
    const newTuning = STANDARD_TUNINGS[tuningKey];
    if (newTuning) setTuning(newTuning);
  };

  // Update a single string of the (already custom) tuning.
  const handleCustomStringChange = (stringIndex: number, note: string) => {
    const notes = [...tuning.notes];
    notes[stringIndex] = note;
    setTuning(makeCustomTuning(notes));
  };

  return (
    <div className={className}>
      {/* String Count */}
      {showStringCount && (
        <div className="mb-4">
          {labels && (
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              Number of Strings
            </label>
          )}
          <div className="flex gap-2">
            {stringOptions.map(count => (
              <button
                key={count}
                onClick={() => setStringCount(count)}
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
      )}

      {/* Tuning */}
      <div>
        {labels && (
          <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            Tuning
          </label>
        )}
        <select
          value={currentTuningKey ?? CUSTOM_TUNING_VALUE}
          onChange={(e) => handleTuningChange(e.target.value)}
          aria-label="Tuning"
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
  );
};

export default TuningPicker;
