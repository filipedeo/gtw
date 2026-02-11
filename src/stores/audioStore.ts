import create from 'zustand';
import { AudioState } from '../types/audio';

interface AudioStoreState {
    audioState: AudioState;
    setAudioState: (state: AudioState) => void;
}

export const useAudioStore = create<AudioStoreState>((set) => ({
    audioState: { isPlaying: false, volume: 0.5 }, // Default state
    setAudioState: (state) => set({ audioState: state })
}));