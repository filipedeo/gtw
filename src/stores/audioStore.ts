import { create } from 'zustand';
import { DroneConfig, MetronomeConfig } from '../types/audio';
import { stopDrone, stopMetronome } from '../lib/audioEngine';

interface AudioStoreState {
  // State
  isPlaying: boolean;
  isDroneActive: boolean;
  isMetronomeActive: boolean;
  droneConfig: DroneConfig;
  metronomeConfig: MetronomeConfig;
  masterVolume: number;
  currentNote: string | null;
  
  // Actions
  setPlaying: (playing: boolean) => void;
  setDroneActive: (active: boolean) => void;
  setMetronomeActive: (active: boolean) => void;
  setDroneConfig: (config: Partial<DroneConfig>) => void;
  setMetronomeConfig: (config: Partial<MetronomeConfig>) => void;
  setMasterVolume: (volume: number) => void;
  setCurrentNote: (note: string | null) => void;
  stopAll: () => void;
}

const defaultDroneConfig: DroneConfig = {
  note: 'A',
  octave: 2,
  volume: 0.5,
  waveform: 'sine',
};

const defaultMetronomeConfig: MetronomeConfig = {
  bpm: 120,
  timeSignature: [4, 4],
  volume: 0.7,
  accentFirst: true,
};

export const useAudioStore = create<AudioStoreState>((set) => ({
  // Initial state
  isPlaying: false,
  isDroneActive: false,
  isMetronomeActive: false,
  droneConfig: defaultDroneConfig,
  metronomeConfig: defaultMetronomeConfig,
  masterVolume: 0.8,
  currentNote: null,
  
  // Actions
  setPlaying: (playing) => set({ isPlaying: playing }),
  
  setDroneActive: (active) => set({ isDroneActive: active }),
  
  setMetronomeActive: (active) => set({ isMetronomeActive: active }),
  
  setDroneConfig: (config) => set((state) => ({
    droneConfig: { ...state.droneConfig, ...config }
  })),
  
  setMetronomeConfig: (config) => set((state) => ({
    metronomeConfig: { ...state.metronomeConfig, ...config }
  })),
  
  setMasterVolume: (volume) => {
    const clamped = Math.max(0, Math.min(1, volume));
    set({ masterVolume: clamped });
  },
  
  setCurrentNote: (note) => set({ currentNote: note }),
  
  stopAll: () => {
    stopDrone();
    stopMetronome();
    set({
      isPlaying: false,
      isDroneActive: false,
      isMetronomeActive: false,
      currentNote: null,
    });
  },
}));