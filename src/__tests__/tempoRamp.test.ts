import { describe, it, expect } from 'vitest';
import { nextRampBpm, MIN_BPM, MAX_BPM } from '../utils/metronome';

describe('nextRampBpm', () => {
  const startBpm = 100;
  const step = 5;
  const everyBars = 2;
  const maxBpm = 200;

  it('returns the start BPM before the first ramp boundary', () => {
    expect(nextRampBpm(startBpm, step, everyBars, maxBpm, 0)).toBe(100);
    expect(nextRampBpm(startBpm, step, everyBars, maxBpm, 1)).toBe(100);
  });

  it('increments by one step at the first boundary', () => {
    expect(nextRampBpm(startBpm, step, everyBars, maxBpm, 2)).toBe(105);
  });

  it('increments by further steps at subsequent boundaries', () => {
    expect(nextRampBpm(startBpm, step, everyBars, maxBpm, 4)).toBe(110);
    expect(nextRampBpm(startBpm, step, everyBars, maxBpm, 6)).toBe(115);
    expect(nextRampBpm(startBpm, step, everyBars, maxBpm, 10)).toBe(125);
  });

  it('does not increment between boundaries', () => {
    expect(nextRampBpm(startBpm, step, everyBars, maxBpm, 3)).toBe(105);
    expect(nextRampBpm(startBpm, step, everyBars, maxBpm, 5)).toBe(110);
  });

  it('caps at maxBpm and never exceeds it', () => {
    // 100 + 5*floor(40/2) = 200 -> exactly max
    expect(nextRampBpm(startBpm, step, everyBars, maxBpm, 40)).toBe(200);
    // well past the cap stays at max
    expect(nextRampBpm(startBpm, step, everyBars, maxBpm, 100)).toBe(200);
  });

  it('respects a tighter maxBpm', () => {
    expect(nextRampBpm(100, 10, 1, 130, 4)).toBe(130);
    expect(nextRampBpm(100, 10, 1, 130, 5)).toBe(130);
  });

  it('treats a non-positive everyBars as 1 (guard against div-by-zero)', () => {
    expect(nextRampBpm(100, 5, 0, 200, 3)).toBe(115);
    expect(nextRampBpm(100, 5, -4, 200, 3)).toBe(115);
  });

  it('clamps the result to the valid BPM range (MAX_BPM)', () => {
    // maxBpm above the absolute ceiling still clamps to MAX_BPM.
    expect(nextRampBpm(290, 50, 1, 999, 1)).toBe(MAX_BPM);
  });

  it('clamps the result to the valid BPM range (MIN_BPM) for nonsense inputs', () => {
    // A start far below the floor with a negative step still floors at MIN_BPM.
    expect(nextRampBpm(-500, -10, 1, 200, 5)).toBe(MIN_BPM);
  });

  it('rounds fractional results to the nearest integer', () => {
    // step=3, everyBars=2, completedBars=1 -> floor(1/2)=0 -> 100
    // completedBars=3 -> floor(3/2)=1 -> 103
    expect(nextRampBpm(100, 3, 2, 200, 3)).toBe(103);
  });

  it('ramps every bar when everyBars is 1', () => {
    expect(nextRampBpm(100, 5, 1, 200, 1)).toBe(105);
    expect(nextRampBpm(100, 5, 1, 200, 2)).toBe(110);
  });
});
