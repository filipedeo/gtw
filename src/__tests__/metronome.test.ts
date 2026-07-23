import { describe, it, expect } from 'vitest';
import {
  clampBpm,
  bpmFromTapTimes,
  recordTap,
  MIN_BPM,
  MAX_BPM,
  MAX_TAP_SAMPLES,
  TAP_RESET_MS,
  clampSubdivision,
  clickIntervalSeconds,
  SUBDIVISIONS,
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

describe('clampSubdivision', () => {
  it('accepts the supported subdivisions', () => {
    expect(clampSubdivision(1)).toBe(1);
    expect(clampSubdivision(2)).toBe(2);
    expect(clampSubdivision(3)).toBe(3);
    expect(clampSubdivision(4)).toBe(4);
  });

  it('falls back to 1 for unsupported values', () => {
    expect(clampSubdivision(0)).toBe(1);
    expect(clampSubdivision(5)).toBe(1);
    expect(clampSubdivision(-2)).toBe(1);
    expect(clampSubdivision(2.5)).toBe(1);
    expect(clampSubdivision(NaN)).toBe(1);
  });
});

describe('SUBDIVISIONS', () => {
  it('offers quarter/eighths/triplets/sixteenths', () => {
    expect(SUBDIVISIONS.map((s) => s.value)).toEqual([1, 2, 3, 4]);
    expect(SUBDIVISIONS.every((s) => typeof s.label === 'string' && s.label.length > 0)).toBe(true);
  });
});

describe('clickIntervalSeconds', () => {
  it('returns the quarter-note duration with no subdivision in 4/4', () => {
    // 120 BPM -> 0.5s per quarter note.
    expect(clickIntervalSeconds(120, 4, 1)).toBeCloseTo(0.5, 6);
  });

  it('halves the interval for eighths and quarters it for sixteenths', () => {
    expect(clickIntervalSeconds(120, 4, 2)).toBeCloseTo(0.25, 6);
    expect(clickIntervalSeconds(120, 4, 4)).toBeCloseTo(0.125, 6);
  });

  it('divides the beat into three for triplets', () => {
    expect(clickIntervalSeconds(120, 4, 3)).toBeCloseTo(0.5 / 3, 6);
  });

  it('uses an eighth-note beat unit for /8 signatures', () => {
    // In 6/8 the beat counter counts eighths, so the base unit is half a quarter.
    expect(clickIntervalSeconds(120, 8, 1)).toBeCloseTo(0.25, 6);
    expect(clickIntervalSeconds(120, 8, 2)).toBeCloseTo(0.125, 6);
  });

  it('clamps out-of-range bpm before computing', () => {
    // BPM clamps to 40 (min): 60/40 = 1.5s per quarter.
    expect(clickIntervalSeconds(10, 4, 1)).toBeCloseTo(1.5, 6);
  });
});
