import { describe, it, expect, beforeEach } from 'vitest';
import { useTunerStore } from '../stores/tunerStore';

const initialState = {
  isListening: false,
  detectedPitch: null,
  selectedStringIndex: null,
  isPlayingReference: false,
  micError: null,
};

describe('tunerStore', () => {
  beforeEach(() => {
    useTunerStore.setState(initialState);
  });

  it('setListening updates isListening', () => {
    useTunerStore.getState().setListening(true);
    expect(useTunerStore.getState().isListening).toBe(true);
  });

  it('setDetectedPitch updates detectedPitch', () => {
    const pitch = { frequency: 440, noteName: 'A4', noteNameWithoutOctave: 'A', octave: 4, cents: 0, clarity: 0.95 };
    useTunerStore.getState().setDetectedPitch(pitch);
    expect(useTunerStore.getState().detectedPitch).toEqual(pitch);
  });

  it('setSelectedStringIndex updates selectedStringIndex', () => {
    useTunerStore.getState().setSelectedStringIndex(3);
    expect(useTunerStore.getState().selectedStringIndex).toBe(3);
  });

  it('setPlayingReference updates isPlayingReference', () => {
    useTunerStore.getState().setPlayingReference(true);
    expect(useTunerStore.getState().isPlayingReference).toBe(true);
  });

  it('setMicError updates micError', () => {
    useTunerStore.getState().setMicError('Permission denied');
    expect(useTunerStore.getState().micError).toBe('Permission denied');
  });

  it('reset restores all fields to initial values', () => {
    useTunerStore.setState({
      isListening: true,
      detectedPitch: { frequency: 440, noteName: 'A4', noteNameWithoutOctave: 'A', octave: 4, cents: 0, clarity: 0.95 },
      selectedStringIndex: 2,
      isPlayingReference: true,
      micError: 'some error',
    });
    useTunerStore.getState().reset();
    const state = useTunerStore.getState();
    expect(state.isListening).toBe(false);
    expect(state.detectedPitch).toBeNull();
    expect(state.selectedStringIndex).toBeNull();
    expect(state.isPlayingReference).toBe(false);
    expect(state.micError).toBeNull();
  });
});
