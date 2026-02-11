import React, { useEffect, useRef } from 'react';
import { useAudioStore } from '../stores/audioStore';
import { startMetronome, stopMetronome, initAudio } from '../lib/audioEngine';

const TIME_SIGNATURES: [number, number][] = [
  [4, 4],
  [3, 4],
  [6, 8],
  [7, 8],
];

const MetronomeControls: React.FC = () => {
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

      {/* BPM */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>BPM</label>
          <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {metronomeConfig.bpm}
          </span>
        </div>
        <input
          type="range"
          min="40"
          max="300"
          value={metronomeConfig.bpm}
          onChange={(e) => setMetronomeConfig({ bpm: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          <span>40</span>
          <span>300</span>
        </div>
      </div>

      {/* Volume */}
      <div className="mb-4">
        <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
          Volume: {Math.round(metronomeConfig.volume * 100)}%
        </label>
        <input
          type="range"
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
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
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
      <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
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
};

export default MetronomeControls;
