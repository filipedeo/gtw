import { useCallback, useEffect, useRef, useState } from 'react';
import { MicrophoneManager } from '../lib/microphoneManager';
import { PitchResult } from '../lib/pitchDetection';

export interface UsePlayAlongResult {
  /** True while the mic is open and pitch callbacks are firing. */
  listening: boolean;
  /** Human-readable error (e.g. mic denied); null when clean. */
  error: string | null;
  /** Most recent detected pitch, or null. */
  latest: PitchResult | null;
  /** Open the mic and start delivering pitches to `latest`. */
  start: () => Promise<void>;
  /** Close the mic and clear `latest`. */
  stop: () => void;
}

/**
 * Self-contained mic lifecycle for play-along modes. Owns its own
 * MicrophoneManager (one AudioContext / mic stream at a time) and exposes the
 * latest detected pitch plus listening/error state. On getUserMedia rejection
 * it surfaces a readable error and stays stopped rather than throwing.
 */
export function usePlayAlong(): UsePlayAlongResult {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<PitchResult | null>(null);

  const micRef = useRef<MicrophoneManager | null>(null);

  const stop = useCallback(() => {
    micRef.current?.stop();
    micRef.current = null;
    setListening(false);
    setLatest(null);
  }, []);

  const start = useCallback(async () => {
    // Guard against a double-start leaking a second AudioContext.
    if (micRef.current) return;

    let mic: MicrophoneManager | null = null;
    try {
      setError(null);
      mic = new MicrophoneManager();
      mic.onPitchDetected = (result) => {
        setLatest(result);
      };
      await mic.start();
      micRef.current = mic;
      setListening(true);
    } catch (e: unknown) {
      // Clean up any partially-initialized mic before reporting.
      mic?.stop();
      micRef.current = null;
      setListening(false);
      if (e instanceof DOMException && e.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else {
        setError('Could not access microphone. Please check your device settings.');
      }
    }
  }, []);

  // Always release the mic + AudioContext on unmount.
  useEffect(() => {
    return () => {
      micRef.current?.stop();
      micRef.current = null;
    };
  }, []);

  return { listening, error, latest, start, stop };
}
