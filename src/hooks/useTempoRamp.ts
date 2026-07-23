import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioStore } from '../stores/audioStore';
import { onMetronomeBeat } from '../lib/audioEngine';
import { nextRampBpm, clampBpm, MIN_BPM, MAX_BPM } from '../utils/metronome';
import {
  TempoRampConfig,
  loadTempoRampConfig,
  saveTempoRampConfig,
  defaultTempoRampConfig,
} from '../lib/tempoRamp';

// Bounds for the user-facing ramp inputs.
const MIN_STEP = 1;
const MAX_STEP = 50;
const MIN_EVERY_BARS = 1;
const MAX_EVERY_BARS = 32;

function clampInt(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export interface UseTempoRamp {
  enabled: boolean;
  step: number;
  everyBars: number;
  maxBpm: number;
  setEnabled: (enabled: boolean) => void;
  setStep: (step: number) => void;
  setEveryBars: (everyBars: number) => void;
  setMaxBpm: (maxBpm: number) => void;
}

/**
 * Tempo auto-ramp: while the metronome runs and the ramp is enabled, count
 * completed bars (derived from the current time-signature's beats-per-bar, the
 * same source `MetronomeControls` reads) and step the BPM up via `nextRampBpm`,
 * applying it through the shared `setMetronomeConfig` store action used by the
 * +/- steppers and tap tempo. Counters reset when the ramp is toggled off or the
 * metronome stops; the start BPM is captured at (re)enable time.
 */
export function useTempoRamp(): UseTempoRamp {
  const isMetronomeActive = useAudioStore((s) => s.isMetronomeActive);
  const timeSignature = useAudioStore((s) => s.metronomeConfig.timeSignature);
  const bpm = useAudioStore((s) => s.metronomeConfig.bpm);
  const setMetronomeConfig = useAudioStore((s) => s.setMetronomeConfig);

  const [config, setConfig] = useState<TempoRampConfig>(() => loadTempoRampConfig());

  // Persist any config change.
  useEffect(() => {
    saveTempoRampConfig(config);
  }, [config]);

  const beatsInBarRef = useRef(0);
  const completedBarsRef = useRef(0);
  const startBpmRef = useRef(bpm);

  // Reset counters on toggle / metronome start-stop; capture the start BPM at
  // the moment the ramp becomes active.
  useEffect(() => {
    if (config.enabled && isMetronomeActive) {
      beatsInBarRef.current = 0;
      completedBarsRef.current = 0;
      startBpmRef.current = bpm;
    } else {
      beatsInBarRef.current = 0;
      completedBarsRef.current = 0;
    }
    // `bpm` is intentionally read only at the toggle boundary so we capture the
    // starting tempo once rather than on every ramp-driven BPM change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.enabled, isMetronomeActive]);

  // Subscribe to metronome beats and advance the ramp at each completed bar.
  useEffect(() => {
    if (!config.enabled || !isMetronomeActive) return;
    const beatsPerBar = timeSignature[0];
    const unsubscribe = onMetronomeBeat(() => {
      beatsInBarRef.current += 1;
      if (beatsInBarRef.current >= beatsPerBar) {
        beatsInBarRef.current = 0;
        completedBarsRef.current += 1;
        const next = nextRampBpm(
          startBpmRef.current,
          config.step,
          config.everyBars,
          config.maxBpm,
          completedBarsRef.current
        );
        setMetronomeConfig({ bpm: next });
      }
    });
    return unsubscribe;
  }, [
    config.enabled,
    config.step,
    config.everyBars,
    config.maxBpm,
    isMetronomeActive,
    timeSignature,
    setMetronomeConfig,
  ]);

  const setEnabled = useCallback((enabled: boolean) => {
    setConfig((c) => ({ ...c, enabled }));
  }, []);

  const setStep = useCallback((step: number) => {
    setConfig((c) => ({ ...c, step: clampInt(step, MIN_STEP, MAX_STEP) }));
  }, []);

  const setEveryBars = useCallback((everyBars: number) => {
    setConfig((c) => ({ ...c, everyBars: clampInt(everyBars, MIN_EVERY_BARS, MAX_EVERY_BARS) }));
  }, []);

  const setMaxBpm = useCallback((maxBpm: number) => {
    setConfig((c) => ({ ...c, maxBpm: clampBpm(clampInt(maxBpm, MIN_BPM, MAX_BPM)) }));
  }, []);

  return {
    enabled: config.enabled,
    step: config.step,
    everyBars: config.everyBars,
    maxBpm: config.maxBpm,
    setEnabled,
    setStep,
    setEveryBars,
    setMaxBpm,
  };
}

// Re-export for tests / consumers that need the defaults.
export { defaultTempoRampConfig };
