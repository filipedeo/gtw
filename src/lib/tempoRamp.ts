// Tempo auto-ramp — self-contained config persistence (no shared store).
//
// Mirrors the noteSpeed personal-best helper: a tiny localStorage-backed store
// kept deliberately separate from progressStore so the metronome ramp feature
// owns its own state. The pure ramp math lives in src/utils/metronome.ts
// (`nextRampBpm`); this module only persists the user's ramp settings.

export interface TempoRampConfig {
  // Master switch for the auto-ramp.
  enabled: boolean;
  // BPM added each ramp step.
  step: number;
  // Apply a step every N completed bars.
  everyBars: number;
  // Never exceed this BPM.
  maxBpm: number;
}

const STORAGE_KEY = 'gtw-tempo-ramp';

export const DEFAULT_RAMP_STEP = 5;
export const DEFAULT_RAMP_EVERY_BARS = 2;
export const DEFAULT_RAMP_MAX_BPM = 200;

export function defaultTempoRampConfig(): TempoRampConfig {
  return {
    enabled: false,
    step: DEFAULT_RAMP_STEP,
    everyBars: DEFAULT_RAMP_EVERY_BARS,
    maxBpm: DEFAULT_RAMP_MAX_BPM,
  };
}

/** Read persisted ramp config; fall back to defaults when missing/invalid. */
export function loadTempoRampConfig(): TempoRampConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultTempoRampConfig();
    const parsed = JSON.parse(raw) as Partial<TempoRampConfig>;
    const defaults = defaultTempoRampConfig();
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : defaults.enabled,
      step: Number.isFinite(parsed.step) && (parsed.step as number) > 0 ? (parsed.step as number) : defaults.step,
      everyBars:
        Number.isFinite(parsed.everyBars) && (parsed.everyBars as number) > 0
          ? (parsed.everyBars as number)
          : defaults.everyBars,
      maxBpm: Number.isFinite(parsed.maxBpm) && (parsed.maxBpm as number) > 0 ? (parsed.maxBpm as number) : defaults.maxBpm,
    };
  } catch {
    return defaultTempoRampConfig();
  }
}

/** Persist the ramp config. Tolerates a missing localStorage (SSR / privacy). */
export function saveTempoRampConfig(config: TempoRampConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage unavailable — ignore.
  }
}
