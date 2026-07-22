import { describe, it, expect } from 'vitest';
import {
  clampBpm,
  bpmFromTapTimes,
  recordTap,
  MIN_BPM,
  MAX_BPM,
  MAX_TAP_SAMPLES,
  TAP_RESET_MS,
} from '../utils/metronome';

describe('clampBpm', () => {
  it('clamps below the minimum', () => {
    expect(clampBpm(10)).toBe(MIN_BPM);
    expect(clampBpm(-999)).toBe(MIN_BPM);
  });

  it('clamps above the maximum', () => {
    expect(clampBpm(999)).toBe(MAX_BPM);
  });

  it('rounds to the nearest integer', () => {
    expect(clampBpm(120.4)).toBe(120);
    expect(clampBpm(120.6)).toBe(121);
  });

  it('falls back to the minimum for non-finite values', () => {
    expect(clampBpm(NaN)).toBe(MIN_BPM);
    expect(clampBpm(Infinity)).toBe(MAX_BPM); // Infinity clamps to max, not NaN branch
  });
});

describe('bpmFromTapTimes', () => {
  it('returns null with fewer than 2 taps', () => {
    expect(bpmFromTapTimes([])).toBeNull();
    expect(bpmFromTapTimes([1000])).toBeNull();
  });

  it('computes BPM from an even 500ms interval (120 BPM)', () => {
    expect(bpmFromTapTimes([0, 500, 1000, 1500])).toBe(120);
  });

  it('computes BPM from a 1000ms interval (60 BPM)', () => {
    expect(bpmFromTapTimes([0, 1000])).toBe(60);
  });

  it('averages uneven intervals', () => {
    // intervals 400 and 600 -> avg 500ms -> 120 BPM
    expect(bpmFromTapTimes([0, 400, 1000])).toBe(120);
  });

  it('clamps very fast taps to the maximum', () => {
    // 100ms interval -> 600 BPM -> clamped to MAX_BPM
    expect(bpmFromTapTimes([0, 100])).toBe(MAX_BPM);
  });

  it('clamps very slow taps to the minimum', () => {
    // 3000ms interval -> 20 BPM -> clamped to MIN_BPM
    expect(bpmFromTapTimes([0, 3000])).toBe(MIN_BPM);
  });

  it('returns null for non-increasing timestamps', () => {
    expect(bpmFromTapTimes([1000, 1000])).toBeNull();
  });
});

describe('recordTap', () => {
  it('appends a tap to an empty sequence', () => {
    expect(recordTap([], 1000)).toEqual([1000]);
  });

  it('appends within the reset window', () => {
    expect(recordTap([1000], 1500)).toEqual([1000, 1500]);
  });

  it('resets the sequence after a long gap', () => {
    const gap = TAP_RESET_MS + 1;
    expect(recordTap([1000], 1000 + gap)).toEqual([1000 + gap]);
  });

  it('keeps only the most recent MAX_TAP_SAMPLES taps', () => {
    let times: number[] = [];
    for (let i = 0; i < MAX_TAP_SAMPLES + 3; i++) {
      times = recordTap(times, i * 500);
    }
    expect(times).toHaveLength(MAX_TAP_SAMPLES);
    // The oldest taps are dropped; the last one is the most recent.
    expect(times[times.length - 1]).toBe((MAX_TAP_SAMPLES + 2) * 500);
  });
});
