import { describe, it, expect, beforeEach } from 'vitest';
import { useAudioStore } from '../stores/audioStore';

const defaultDroneConfig = {
  note: 'A',
  octave: 2,
  volume: 0.5,
  waveform: 'sine' as const,
};

const defaultMetronomeConfig = {
  bpm: 120,
  timeSignature: [4, 4] as [number, number],
  volume: 0.7,
  accentFirst: true,
};

const initialState = {
  isPlaying: false,
  isDroneActive: false,
  isMetronomeActive: false,
  droneConfig: defaultDroneConfig,
  metronomeConfig: defaultMetronomeConfig,
  masterVolume: 0.8,
  currentNote: null,
};

describe('audioStore', () => {
  beforeEach(() => {
    useAudioStore.setState(initialState);
  });

  describe('setMasterVolume', () => {
    it('sets volume within valid range', () => {
      useAudioStore.getState().setMasterVolume(0.5);
      expect(useAudioStore.getState().masterVolume).toBe(0.5);
    });

    it('clamps volume above 1 to 1', () => {
      useAudioStore.getState().setMasterVolume(1.5);
      expect(useAudioStore.getState().masterVolume).toBe(1);
    });

    it('clamps volume below 0 to 0', () => {
      useAudioStore.getState().setMasterVolume(-0.5);
      expect(useAudioStore.getState().masterVolume).toBe(0);
    });
  });

  describe('setDroneConfig', () => {
    it('merges partial config', () => {
      useAudioStore.getState().setDroneConfig({ note: 'E' });
      const config = useAudioStore.getState().droneConfig;
      expect(config.note).toBe('E');
      expect(config.octave).toBe(2); // unchanged
      expect(config.volume).toBe(0.5); // unchanged
    });

    it('merges multiple fields', () => {
      useAudioStore.getState().setDroneConfig({ note: 'C', octave: 3, waveform: 'triangle' });
      const config = useAudioStore.getState().droneConfig;
      expect(config.note).toBe('C');
      expect(config.octave).toBe(3);
      expect(config.waveform).toBe('triangle');
    });
  });

  describe('setMetronomeConfig', () => {
    it('merges partial config', () => {
      useAudioStore.getState().setMetronomeConfig({ bpm: 120 });
      const config = useAudioStore.getState().metronomeConfig;
      expect(config.bpm).toBe(120);
      expect(config.volume).toBe(0.7); // unchanged
      expect(config.accentFirst).toBe(true); // unchanged
    });

    it('merges time signature', () => {
      useAudioStore.getState().setMetronomeConfig({ timeSignature: [3, 4] });
      expect(useAudioStore.getState().metronomeConfig.timeSignature).toEqual([3, 4]);
    });
  });

  describe('stopAll', () => {
    it('resets all active flags', () => {
      useAudioStore.setState({ isPlaying: true, isDroneActive: true, isMetronomeActive: true, currentNote: 'A4' });
      useAudioStore.getState().stopAll();
      const state = useAudioStore.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.isDroneActive).toBe(false);
      expect(state.isMetronomeActive).toBe(false);
      expect(state.currentNote).toBeNull();
    });
  });
});
