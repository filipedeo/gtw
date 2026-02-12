import React, { useEffect, useRef } from 'react';
import { useAudioStore } from '../stores/audioStore';
import { startDrone, stopDrone, initAudio, setMasterVolume as setEngineVolume } from '../lib/audioEngine';

const AudioControls: React.FC = React.memo(() => {
  const {
    isDroneActive,
    droneConfig,
    masterVolume,
    setDroneActive,
    setDroneConfig,
    setMasterVolume,
  } = useAudioStore();

  const audioInitialized = useRef(false);

  const ensureAudioInit = async () => {
    if (!audioInitialized.current) {
      await initAudio();
      audioInitialized.current = true;
    }
  };

  const toggleDrone = async () => {
    await ensureAudioInit();
    if (isDroneActive) {
      stopDrone();
      setDroneActive(false);
    } else {
      startDrone(droneConfig);
      setDroneActive(true);
    }
  };

  // Only stop drone on unmount — metronome lives in always-mounted ToolsToolbar
  useEffect(() => {
    return () => {
      if (useAudioStore.getState().isDroneActive) {
        stopDrone();
        useAudioStore.getState().setDroneActive(false);
      }
    };
  }, []);

  // Update drone when config changes
  useEffect(() => {
    if (isDroneActive) {
      stopDrone();
      startDrone(droneConfig);
    }
  }, [droneConfig, isDroneActive]);

  const noteOptions = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  return (
    <div className="space-y-6">
      {/* Master Volume */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Master Volume: {Math.round(masterVolume * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={masterVolume * 100}
          onChange={(e) => {
            const vol = parseInt(e.target.value) / 100;
            setMasterVolume(vol);
            setEngineVolume(vol);
          }}
          className="w-full"
        />
      </div>

      {/* Drone Controls */}
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>Drone</h4>
          <button
            onClick={toggleDrone}
            className="px-4 py-2 rounded-lg font-medium transition-colors text-white"
            style={{ backgroundColor: isDroneActive ? 'var(--error)' : 'var(--success)' }}
          >
            {isDroneActive ? 'Stop' : 'Start'}
          </button>
        </div>

        <div className="space-y-4">
          {/* Note Selection */}
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Note</label>
            <div className="flex flex-wrap gap-1">
              {noteOptions.map(note => (
                <button
                  key={note}
                  onClick={() => setDroneConfig({ note })}
                  className={`px-2 py-1 rounded text-sm font-medium transition-all min-w-[36px] ${
                    droneConfig.note === note ? 'btn-primary' : ''
                  }`}
                  style={droneConfig.note !== note ? {
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)'
                  } : {}}
                >
                  {note}
                </button>
              ))}
            </div>
          </div>

          {/* Octave Selection */}
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Octave</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(oct => (
                <button
                  key={oct}
                  onClick={() => setDroneConfig({ octave: oct })}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    droneConfig.octave === oct ? 'btn-primary' : ''
                  }`}
                  style={droneConfig.octave !== oct ? {
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)'
                  } : {}}
                >
                  {oct}
                </button>
              ))}
            </div>
          </div>

          {/* Waveform Selection */}
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Waveform</label>
            <div className="flex flex-wrap gap-2">
              {(['sine', 'triangle', 'sawtooth', 'square'] as const).map(wave => (
                <button
                  key={wave}
                  onClick={() => setDroneConfig({ waveform: wave })}
                  className={`px-3 py-2 rounded-lg font-medium transition-all text-sm capitalize ${
                    droneConfig.waveform === wave ? 'btn-primary' : ''
                  }`}
                  style={droneConfig.waveform !== wave ? {
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)'
                  } : {}}
                >
                  {wave}
                </button>
              ))}
            </div>
          </div>

          {/* Volume Slider */}
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              Volume: {Math.round(droneConfig.volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={droneConfig.volume * 100}
              onChange={(e) => setDroneConfig({ volume: parseInt(e.target.value) / 100 })}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default AudioControls;
