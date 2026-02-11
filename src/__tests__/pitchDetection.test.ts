import { describe, it, expect } from 'vitest';
import { detectPitch, frequencyToNote, noteToFrequency } from '../lib/pitchDetection';

describe('pitchDetection', () => {
  describe('frequencyToNote', () => {
    it('should identify A4 = 440 Hz', () => {
      const result = frequencyToNote(440);
      expect(result.noteNameWithoutOctave).toBe('A');
      expect(result.octave).toBe(4);
      expect(result.cents).toBe(0);
      expect(result.noteName).toBe('A4');
    });

    it('should identify standard tuning notes', () => {
      const cases: [number, string, number][] = [
        [82.41, 'E', 2],
        [110.0, 'A', 2],
        [146.83, 'D', 3],
        [196.0, 'G', 3],
        [246.94, 'B', 3],
        [329.63, 'E', 4],
      ];
      for (const [freq, note, octave] of cases) {
        const result = frequencyToNote(freq);
        expect(result.noteNameWithoutOctave).toBe(note);
        expect(result.octave).toBe(octave);
        expect(Math.abs(result.cents)).toBeLessThanOrEqual(1);
      }
    });

    it('should identify B1 (7-string low)', () => {
      const result = frequencyToNote(61.74);
      expect(result.noteNameWithoutOctave).toBe('B');
      expect(result.octave).toBe(1);
      expect(Math.abs(result.cents)).toBeLessThanOrEqual(1);
    });

    it('should detect sharp cents for frequency above note', () => {
      // 10 cents sharp of A4
      const sharpFreq = 440 * Math.pow(2, 10 / 1200);
      const result = frequencyToNote(sharpFreq);
      expect(result.noteNameWithoutOctave).toBe('A');
      expect(result.cents).toBe(10);
    });

    it('should detect flat cents for frequency below note', () => {
      // 10 cents flat of A4
      const flatFreq = 440 * Math.pow(2, -10 / 1200);
      const result = frequencyToNote(flatFreq);
      expect(result.noteNameWithoutOctave).toBe('A');
      expect(result.cents).toBe(-10);
    });

    it('should handle C4 (middle C)', () => {
      const result = frequencyToNote(261.63);
      expect(result.noteNameWithoutOctave).toBe('C');
      expect(result.octave).toBe(4);
    });

    it('should handle sharps correctly', () => {
      // F#4 = 369.99 Hz
      const result = frequencyToNote(369.99);
      expect(result.noteNameWithoutOctave).toBe('F#');
      expect(result.octave).toBe(4);
    });
  });

  describe('noteToFrequency', () => {
    it('should return 440 for A4', () => {
      expect(noteToFrequency('A4')).toBeCloseTo(440, 1);
    });

    it('should return correct frequencies for standard tuning', () => {
      expect(noteToFrequency('E2')).toBeCloseTo(82.41, 1);
      expect(noteToFrequency('A2')).toBeCloseTo(110.0, 1);
      expect(noteToFrequency('D3')).toBeCloseTo(146.83, 1);
      expect(noteToFrequency('G3')).toBeCloseTo(196.0, 1);
      expect(noteToFrequency('B3')).toBeCloseTo(246.94, 1);
      expect(noteToFrequency('E4')).toBeCloseTo(329.63, 1);
    });

    it('should return correct frequency for B1', () => {
      expect(noteToFrequency('B1')).toBeCloseTo(61.74, 1);
    });

    it('should handle sharps', () => {
      expect(noteToFrequency('F#4')).toBeCloseTo(369.99, 0);
      expect(noteToFrequency('C#3')).toBeCloseTo(138.59, 1);
    });

    it('should throw for invalid note names', () => {
      expect(() => noteToFrequency('X4')).toThrow();
      expect(() => noteToFrequency('invalid')).toThrow();
    });

    it('should roundtrip with frequencyToNote', () => {
      const notes = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4', 'A4', 'B1'];
      for (const note of notes) {
        const freq = noteToFrequency(note);
        const result = frequencyToNote(freq);
        expect(result.noteName).toBe(note);
        expect(Math.abs(result.cents)).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('detectPitch', () => {
    function generateSineWave(frequency: number, sampleRate: number, length: number, amplitude: number = 0.5): Float32Array {
      const buffer = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        buffer[i] = amplitude * Math.sin(2 * Math.PI * frequency * i / sampleRate);
      }
      return buffer;
    }

    it('should detect A4 = 440 Hz', () => {
      const sampleRate = 44100;
      const buffer = generateSineWave(440, sampleRate, 2048);
      const result = detectPitch(buffer, sampleRate);
      expect(result).not.toBeNull();
      expect(Math.abs(result!.frequency - 440)).toBeLessThan(3);
      expect(result!.noteNameWithoutOctave).toBe('A');
      expect(result!.octave).toBe(4);
    });

    it('should detect E2 = 82.41 Hz', () => {
      const sampleRate = 44100;
      const buffer = generateSineWave(82.41, sampleRate, 4096);
      const result = detectPitch(buffer, sampleRate);
      expect(result).not.toBeNull();
      expect(Math.abs(result!.frequency - 82.41)).toBeLessThan(3);
      expect(result!.noteNameWithoutOctave).toBe('E');
    });

    it('should detect B1 = 61.74 Hz', () => {
      const sampleRate = 44100;
      // Use longer buffer for low frequencies
      const buffer = generateSineWave(61.74, sampleRate, 4096);
      const result = detectPitch(buffer, sampleRate);
      expect(result).not.toBeNull();
      expect(Math.abs(result!.frequency - 61.74)).toBeLessThan(3);
      expect(result!.noteNameWithoutOctave).toBe('B');
    });

    it('should return null for silence', () => {
      const buffer = new Float32Array(2048); // all zeros
      const result = detectPitch(buffer, 44100);
      expect(result).toBeNull();
    });

    it('should return null for very low amplitude', () => {
      const buffer = generateSineWave(440, 44100, 2048, 0.005);
      const result = detectPitch(buffer, 44100);
      expect(result).toBeNull();
    });

    it('should return null for noise', () => {
      const buffer = new Float32Array(2048);
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = (Math.random() * 2 - 1) * 0.5;
      }
      const result = detectPitch(buffer, 44100);
      // Noise should either return null or have very low clarity
      if (result !== null) {
        expect(result.clarity).toBeLessThan(0.95);
      }
    });

    it('should include clarity above threshold', () => {
      const buffer = generateSineWave(440, 44100, 2048);
      const result = detectPitch(buffer, 44100);
      expect(result).not.toBeNull();
      expect(result!.clarity).toBeGreaterThanOrEqual(0.9);
    });
  });
});
