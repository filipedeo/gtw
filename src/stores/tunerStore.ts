import { create } from 'zustand';
import { PitchResult } from '../lib/pitchDetection';

interface TunerStoreState {
  isListening: boolean;
  detectedPitch: PitchResult | null;
  selectedStringIndex: number | null;
  isPlayingReference: boolean;
  micError: string | null;

  setListening: (listening: boolean) => void;
  setDetectedPitch: (pitch: PitchResult | null) => void;
  setSelectedStringIndex: (index: number | null) => void;
  setPlayingReference: (playing: boolean) => void;
  setMicError: (error: string | null) => void;
  reset: () => void;
}

export const useTunerStore = create<TunerStoreState>((set) => ({
  isListening: false,
  detectedPitch: null,
  selectedStringIndex: null,
  isPlayingReference: false,
  micError: null,

  setListening: (listening) => set({ isListening: listening }),
  setDetectedPitch: (pitch) => set({ detectedPitch: pitch }),
  setSelectedStringIndex: (index) => set({ selectedStringIndex: index }),
  setPlayingReference: (playing) => set({ isPlayingReference: playing }),
  setMicError: (error) => set({ micError: error }),
  reset: () =>
    set({
      isListening: false,
      detectedPitch: null,
      selectedStringIndex: null,
      isPlayingReference: false,
      micError: null,
    }),
}));
