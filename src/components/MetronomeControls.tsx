import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAudioStore } from '../stores/audioStore';
import { startMetronome, stopMetronome, initAudio, onMetronomeBeat } from '../lib/audioEngine';
import { clampBpm, bpmFromTapTimes, recordTap } from '../utils/metronome';

const TIME_SIGNATURES: [number, number][] = [
  [4, 4],
  [3, 4],
  [6, 8],
  [7, 8],
];

// In-panel visual beat indicator: one dot per beat in the bar, pulsing on the
// active beat (accent downbeat highlighted). Subscribes to real metronome beats
// so the pulse is synced to the audio click.
const BeatIndicator: React.FC<{ beats: number; active: boolean }> = ({ beats, active }) => {
  const [current, setCurrent] = useState(-1);

  useEffect(() => {
    if (!active) {
      setCurrent(-1);
      return;
    }
    const unsubscribe = onMetronomeBeat((beat) => setCurrent(beat));
    return () => {
      unsubscribe();
      setCurrent(-1);
    };
  }, [active]);

  return (
    <div className="flex items-center gap-1.5" role="img" aria-label={`${beats} beats per bar`}>
      {Array.from({ length: beats }).map((_, i) => {
        const isCurrent = active && i === current;
        const isDownbeat = i === 0;
        return (
          <span
            key={i}
            className="inline-block rounded-full transition-transform duration-100"
            style={{
              width: isDownbeat ? '13px' : '11px',
              height: isDownbeat ? '13px' : '11px',
              backgroundColor: isCurrent
                ? (isDownbeat ? 'var(--accent-primary)' : 'var(--success)')
                : 'var(--bg-tertiary)',
              transform: isCurrent ? 'scale(1.3)' : 'scale(1)',
            }}
          />
        );
      })}
    </div>
  );
};

const MetronomeControls: React.FC = React.memo(() => {
  const {
    isMetronomeActive,
    metronomeConfig,
    setMetronomeActive,
    setMetronomeConfig,
  } = useAudioStore();

  const audioInitialized = useRef(false);

  const ensureAudioInit = async () => {
    if (!audioInitialized.current) {
      await initAudio();
      audioInitialized.current = true;
    }
  };

  const toggleMetronome = async () => {
    await ensureAudioInit();
    if (isMetronomeActive) {
      stopMetronome();
      setMetronomeActive(false);
    } else {
      startMetronome(metronomeConfig);
      setMetronomeActive(true);
    }
  };

  // Restart metronome when config changes while active
  useEffect(() => {
    if (isMetronomeActive) {
      stopMetronome();
      startMetronome(metronomeConfig);
    }
  }, [metronomeConfig, isMetronomeActive]);

  // --- Tap tempo + BPM steppers ---
  const tapTimesRef = useRef<number[]>([]);
  const tapResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending tap-reset timer on unmount.
  useEffect(() => () => {
    if (tapResetRef.current) clearTimeout(tapResetRef.current);
  }, []);

  const adjustBpm = useCallback((delta: number) => {
    setMetronomeConfig({ bpm: clampBpm(metronomeConfig.bpm + delta) });
  }, [metronomeConfig.bpm, setMetronomeConfig]);

  const handleTap = useCallback(() => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const times = recordTap(tapTimesRef.current, now);
    tapTimesRef.current = times;
    const bpm = bpmFromTapTimes(times);
    if (bpm !== null) {
      setMetronomeConfig({ bpm });
    }
    if (tapResetRef.current) clearTimeout(tapResetRef.current);
    tapResetRef.current = setTimeout(() => {
      tapTimesRef.current = [];
    }, 2500);
  }, [setMetronomeConfig]);

  const tsKey = (ts: [number, number]) => `${ts[0]}/${ts[1]}`;
  const currentTs = tsKey(metronomeConfig.timeSignature);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>Metronome</h4>
        <button
          onClick={toggleMetronome}
          className="px-4 py-2 rounded-lg font-medium transition-colors text-white text-sm"
          style={{ backgroundColor: isMetronomeActive ? 'var(--error)' : 'var(--success)' }}
        >
          {isMetronomeActive ? 'Stop' : 'Start'}
        </button>
      </div>

      {/* Visual beat indicator */}
      <div className="mb-4">
        <BeatIndicator beats={metronomeConfig.timeSignature[0]} active={isMetronomeActive} />
      </div>

      {/* BPM */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>BPM</label>
          <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {metronomeConfig.bpm}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => adjustBpm(-5)}
            aria-label="Decrease tempo by 5 BPM"
            className="w-9 h-9 shrink-0 rounded-lg font-bold text-lg flex items-center justify-center transition-colors phone-touch"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            -
          </button>
          <input
            type="range"
            id="metronome-tempo"
            name="metronome-tempo"
            min="40"
            max="300"
            value={metronomeConfig.bpm}
            onChange={(e) => setMetronomeConfig({ bpm: clampBpm(parseInt(e.target.value)) })}
            className="flex-1"
            aria-label="Metronome tempo (BPM)"
          />
          <button
            onClick={() => adjustBpm(5)}
            aria-label="Increase tempo by 5 BPM"
            className="w-9 h-9 shrink-0 rounded-lg font-bold text-lg flex items-center justify-center transition-colors phone-touch"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            +
          </button>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>40-300 BPM</span>
          <button
            onClick={handleTap}
            aria-label="Tap tempo: tap repeatedly to set BPM"
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors phone-touch"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            Tap Tempo
          </button>
        </div>
      </div>

      {/* Volume */}
      <div className="mb-4">
        <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
          Volume: {Math.round(metronomeConfig.volume * 100)}%
        </label>
        <input
          type="range"
          id="metronome-volume"
          name="metronome-volume"
          aria-label="Metronome volume"
          min="0"
          max="100"
          value={metronomeConfig.volume * 100}
          onChange={(e) => setMetronomeConfig({ volume: parseInt(e.target.value) / 100 })}
          className="w-full"
        />
      </div>

      {/* Time Signature */}
      <div className="mb-3">
        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
          Time Signature
        </label>
        <div className="flex gap-2 flex-wrap">
          {TIME_SIGNATURES.map((ts) => {
            const key = tsKey(ts);
            const isActive = currentTs === key;
            return (
              <button
                key={key}
                onClick={() => setMetronomeConfig({ timeSignature: ts })}
                className="px-3 py-2 phone-touch rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--bg-primary)',
                  color: isActive ? 'white' : 'var(--text-primary)',
                  border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                }}
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent first beat */}
      <label className="flex items-center gap-2 text-sm phone-touch" style={{ color: 'var(--text-secondary)' }}>
        <input
          type="checkbox"
          checked={metronomeConfig.accentFirst}
          onChange={(e) => setMetronomeConfig({ accentFirst: e.target.checked })}
          className="rounded"
        />
        Accent first beat
      </label>
    </div>
  );
});

export default MetronomeControls;
