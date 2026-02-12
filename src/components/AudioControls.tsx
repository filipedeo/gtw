import React, { useEffect, useRef } from 'react';
import { useAudioStore } from '../stores/audioStore';
import { DroneConfig } from '../types/audio';
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Note</label>
            <select
              value={droneConfig.note}
              onChange={(e) => setDroneConfig({ note: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            >
              {noteOptions.map(note => (
                <option key={note} value={note}>{note}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Octave</label>
            <select
              value={droneConfig.octave}
              onChange={(e) => setDroneConfig({ octave: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            >
              {[1, 2, 3, 4].map(oct => (
                <option key={oct} value={oct}>{oct}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Waveform</label>
            <select
              value={droneConfig.waveform}
              onChange={(e) => setDroneConfig({ waveform: e.target.value as DroneConfig['waveform'] })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            >
              <option value="sine">Sine</option>
              <option value="triangle">Triangle</option>
              <option value="sawtooth">Sawtooth</option>
              <option value="square">Square</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Volume</label>
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
