import React, { useEffect, useRef } from 'react';
import { useAudioStore } from '../stores/audioStore';
import { startDrone, stopDrone, startMetronome, stopMetronome, initAudio } from '../lib/audioEngine';

const AudioControls: React.FC = () => {
  const {
    isDroneActive,
    isMetronomeActive,
    droneConfig,
    metronomeConfig,
    masterVolume,
    setDroneActive,
    setMetronomeActive,
    setDroneConfig,
    setMetronomeConfig,
    setMasterVolume,
    stopAll,
  } = useAudioStore();
  
  const audioInitialized = useRef(false);

  // Initialize audio on first interaction
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll();
      stopDrone();
      stopMetronome();
    };
  }, [stopAll]);

  // Update drone when config changes
  useEffect(() => {
    if (isDroneActive) {
      stopDrone();
      startDrone(droneConfig);
    }
  }, [droneConfig, isDroneActive]);

  // Update metronome when config changes
  useEffect(() => {
    if (isMetronomeActive) {
      stopMetronome();
      startMetronome(metronomeConfig);
    }
  }, [metronomeConfig, isMetronomeActive]);

  const noteOptions = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  return (
    <div className="card">
      <h3 className="font-semibold mb-4">Audio Controls</h3>
      
      <div className="space-y-6">
        {/* Master Volume */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Master Volume: {Math.round(masterVolume * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={masterVolume * 100}
            onChange={(e) => setMasterVolume(parseInt(e.target.value) / 100)}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Drone Controls */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Drone</h4>
            <button
              onClick={toggleDrone}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isDroneActive 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isDroneActive ? 'Stop' : 'Start'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Note</label>
              <select
                value={droneConfig.note}
                onChange={(e) => setDroneConfig({ note: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {noteOptions.map(note => (
                  <option key={note} value={note}>{note}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Octave</label>
              <select
                value={droneConfig.octave}
                onChange={(e) => setDroneConfig({ octave: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {[1, 2, 3, 4].map(oct => (
                  <option key={oct} value={oct}>{oct}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Waveform</label>
              <select
                value={droneConfig.waveform}
                onChange={(e) => setDroneConfig({ waveform: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="sine">Sine</option>
                <option value="triangle">Triangle</option>
                <option value="sawtooth">Sawtooth</option>
                <option value="square">Square</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Volume</label>
              <input
                type="range"
                min="0"
                max="100"
                value={droneConfig.volume * 100}
                onChange={(e) => setDroneConfig({ volume: parseInt(e.target.value) / 100 })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Metronome Controls */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Metronome</h4>
            <button
              onClick={toggleMetronome}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isMetronomeActive 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isMetronomeActive ? 'Stop' : 'Start'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">BPM: {metronomeConfig.bpm}</label>
              <input
                type="range"
                min="40"
                max="200"
                value={metronomeConfig.bpm}
                onChange={(e) => setMetronomeConfig({ bpm: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Volume</label>
              <input
                type="range"
                min="0"
                max="100"
                value={metronomeConfig.volume * 100}
                onChange={(e) => setMetronomeConfig({ volume: parseInt(e.target.value) / 100 })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
          
          <div className="mt-3">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={metronomeConfig.accentFirst}
                onChange={(e) => setMetronomeConfig({ accentFirst: e.target.checked })}
                className="rounded"
              />
              Accent first beat
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioControls;