import create from 'zustand';
import { GuitarConfig } from '../types/guitar';

interface GuitarState {
    config: GuitarConfig;
    setConfig: (config: GuitarConfig) => void;
}

export const useGuitarStore = create<GuitarState>((set) => ({
    config: { numberOfStrings: 6, tuning: [] }, // Default configuration
    setConfig: (config) => set({ config })
}));