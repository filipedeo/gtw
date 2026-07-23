import * as Tone from 'tone';
import { DroneConfig, MetronomeConfig, PlaybackOptions } from '../types/audio';
import { useAudioStore } from '../stores/audioStore';

let synth: Tone.PolySynth | null = null;
let droneSynth: Tone.Synth | null = null;
let droneOscillator: Tone.Oscillator | null = null;
let droneGain: Tone.Gain | null = null;
let metronomeLoop: Tone.Loop | null = null;
let metronomeSynth: Tone.MembraneSynth | null = null;
let tunerOscillator: Tone.Oscillator | null = null;
let tunerGain: Tone.Gain | null = null;
let tunerCleanupTimeout: ReturnType<typeof setTimeout> | null = null;
let isInitialized = false;
let droneCleanupTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingPlaybackTimeouts: ReturnType<typeof setTimeout>[] = [];

// --- Metronome beat notifications (for visual beat indicators) ---
// Listeners receive the 0-based beat within the bar and whether it is the
// accented downbeat. Kept independent of any store so subscribers can react to
// real audio beats without persistence or re-render coupling.
type MetronomeBeatListener = (beat: number, isAccent: boolean) => void;
const metronomeBeatListeners = new Set<MetronomeBeatListener>();

/** Subscribe to metronome beats. Returns an unsubscribe function. */
export function onMetronomeBeat(listener: MetronomeBeatListener): () => void {
  metronomeBeatListeners.add(listener);
  return () => {
    metronomeBeatListeners.delete(listener);
  };
}

function emitMetronomeBeat(beat: number, isAccent: boolean): void {
  metronomeBeatListeners.forEach((listener) => {
    try {
      listener(beat, isAccent);
    } catch (e) {
      console.error('Metronome beat listener failed:', e);
    }
  });
}

// Align the visual beat notification to the audio `time` using Tone.Draw (runs
// on an animation frame at `time`), so UI pulses land with the click rather
// than ahead of it (the Loop callback fires early by the scheduler lookahead).
// Falls back to an immediate emit if Draw is unavailable.
function scheduleBeatDraw(beat: number, isAccent: boolean, time: number): void {
  try {
    const draw = typeof Tone.getDraw === 'function' ? Tone.getDraw() : null;
    if (draw) {
      draw.schedule(() => emitMetronomeBeat(beat, isAccent), time);
      return;
    }
  } catch {
    // fall through to immediate emit
  }
  emitMetronomeBeat(beat, isAccent);
}

export async function initAudio(): Promise<void> {
  if (isInitialized) return;
  
  try {
    await Tone.start();
    synth = new Tone.PolySynth(Tone.Synth, {
      envelope: {
        attack: 0.02,
        decay: 0.3,
        sustain: 0.4,
        release: 0.8,
      },
    }).toDestination();
    synth.volume.value = -6;
    isInitialized = true;
    // Apply the stored/default master volume so the very first sounds respect it
    // (previously the default was ignored until the user moved the volume slider).
    setMasterVolume(useAudioStore.getState().masterVolume);
    console.log('Audio initialized');
  } catch (e) {
    console.error('Failed to initialize audio:', e);
  }
}

export async function playNote(
  note: string,
  options: PlaybackOptions = {}
): Promise<void> {
  if (!isInitialized) await initAudio();
  if (!synth) return;

  const { duration = 0.5, velocity = 0.7, delay = 0 } = options;

  const trigger = () => {
    try {
      if (synth) synth.triggerAttackRelease(note, duration, Tone.now(), velocity);
    } catch (e) {
      console.error('Failed to play note:', e);
    }
  };

  if (delay > 0) {
    const id = setTimeout(trigger, delay * 1000);
    pendingPlaybackTimeouts.push(id);
  } else {
    trigger();
  }
}

export async function playChord(
  notes: string[],
  options: PlaybackOptions = {}
): Promise<void> {
  if (!isInitialized) await initAudio();
  if (!synth) return;

  const { duration = 1, velocity = 0.6, delay = 0 } = options;

  const trigger = () => {
    try {
      if (synth) synth.triggerAttackRelease(notes, duration, Tone.now(), velocity);
    } catch (e) {
      console.error('Failed to play chord:', e);
    }
  };

  if (delay > 0) {
    const id = setTimeout(trigger, delay * 1000);
    pendingPlaybackTimeouts.push(id);
  } else {
    trigger();
  }
}

export async function startDrone(config: DroneConfig): Promise<void> {
  // Make sure audio is initialized
  if (!isInitialized) await initAudio();
  
  // Stop any existing drone
  stopDrone();
  
  const note = `${config.note}${config.octave}`;
  const frequency = Tone.Frequency(note).toFrequency();
  
  try {
    // Create gain node for volume control and fade in/out
    droneGain = new Tone.Gain(0).toDestination();
    
    // Create oscillator for continuous drone
    droneOscillator = new Tone.Oscillator({
      frequency: frequency,
      type: config.waveform,
    }).connect(droneGain);
    
    // Start oscillator (gain begins at 0 from the Gain(0) constructor above)
    droneOscillator.start();

    // Fade in from silence to the target volume. Setting the gain to its full
    // value here (before the ramp) would defeat the fade and cause an audible
    // click, so we explicitly start at 0 and ramp up.
    droneGain.gain.value = 0;
    droneGain.gain.rampTo(config.volume * 0.5, 0.5);
    
    console.log('Drone started:', note, config.waveform);
  } catch (e) {
    console.error('Failed to start drone:', e);
  }
}

export function stopDrone(): void {
  try {
    // Cancel any pending cleanup from previous stopDrone calls
    if (droneCleanupTimeout) {
      clearTimeout(droneCleanupTimeout);
      droneCleanupTimeout = null;
    }
    
    // Capture current references to avoid race conditions
    const oscillatorToStop = droneOscillator;
    const gainToDispose = droneGain;
    const synthToDispose = droneSynth;
    
    // Clear references immediately to prevent double-disposal
    droneOscillator = null;
    droneGain = null;
    droneSynth = null;
    
    if (gainToDispose) {
      // Fade out
      gainToDispose.gain.rampTo(0, 0.3);
    }
    
    // Dispose after fade out completes
    droneCleanupTimeout = setTimeout(() => {
      droneCleanupTimeout = null;
      try {
        if (oscillatorToStop) {
          oscillatorToStop.stop();
          oscillatorToStop.dispose();
        }
        if (gainToDispose) {
          gainToDispose.dispose();
        }
        if (synthToDispose) {
          synthToDispose.dispose();
        }
      } catch (e) {
        // Ignore disposal errors (node may already be disposed)
        console.debug('Drone cleanup:', e);
      }
    }, 400);
    
    console.log('Drone stopped');
  } catch (e) {
    console.error('Failed to stop drone:', e);
  }
}

export async function startMetronome(config: MetronomeConfig): Promise<void> {
  if (!isInitialized) await initAudio();
  
  stopMetronome();
  
  try {
    Tone.Transport.bpm.value = config.bpm;
    
    metronomeSynth = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 2,
      envelope: {
        attack: 0.001,
        decay: 0.3,
        sustain: 0,
        release: 0.1,
      },
    }).toDestination();
    
    metronomeSynth.volume.value = Tone.gainToDb(config.volume) - 6;
    
    // Derive subdivision from bottom number of time signature
    const subdivision = config.timeSignature[1] === 8 ? '8n' : '4n';

    let beat = 0;
    metronomeLoop = new Tone.Loop((time) => {
      if (!metronomeSynth) return;
      const currentBeat = beat;
      const isAccent = config.accentFirst && currentBeat === 0;
      metronomeSynth.triggerAttackRelease(isAccent ? 'C3' : 'G3', '32n', time);
      scheduleBeatDraw(currentBeat, isAccent, time);
      beat = (beat + 1) % config.timeSignature[0];
    }, subdivision);
    
    metronomeLoop.start(0);
    // Only start the shared Transport if it isn't already running (Jam Mode may
    // have started it). Restarting a running Transport resets its position and
    // would disrupt the other feature's scheduling.
    if (Tone.Transport.state !== 'started') {
      Tone.Transport.start();
    }
    
    console.log('Metronome started:', config.bpm, 'BPM');
  } catch (e) {
    console.error('Failed to start metronome:', e);
  }
}

export function stopMetronome(): void {
  try {
    if (metronomeLoop) {
      metronomeLoop.stop();
      metronomeLoop.dispose();
      metronomeLoop = null;
    }
    if (metronomeSynth) {
      metronomeSynth.dispose();
      metronomeSynth = null;
    }
    // NOTE: Do NOT call Tone.Transport.stop()/cancel() here. The Transport is a
    // global clock shared with Jam Mode; stopping or cancelling it would wipe the
    // other feature's scheduled events (desyncing it from its UI state). Stopping
    // and disposing our own Loop above already unschedules only the metronome.
    
    console.log('Metronome stopped');
  } catch (e) {
    console.error('Failed to stop metronome:', e);
  }
}

export async function startTunerTone(frequency: number, volume: number = 0.3): Promise<void> {
  if (!isInitialized) await initAudio();

  stopTunerTone();

  try {
    tunerGain = new Tone.Gain(0).toDestination();
    tunerOscillator = new Tone.Oscillator({
      frequency,
      type: 'sine',
    }).connect(tunerGain);

    tunerOscillator.start();
    tunerGain.gain.rampTo(volume * 0.5, 0.3);
  } catch (e) {
    console.error('Failed to start tuner tone:', e);
  }
}

export function stopTunerTone(): void {
  try {
    if (tunerCleanupTimeout) {
      clearTimeout(tunerCleanupTimeout);
      tunerCleanupTimeout = null;
    }

    const oscillatorToStop = tunerOscillator;
    const gainToDispose = tunerGain;

    tunerOscillator = null;
    tunerGain = null;

    if (gainToDispose) {
      gainToDispose.gain.rampTo(0, 0.3);
    }

    tunerCleanupTimeout = setTimeout(() => {
      tunerCleanupTimeout = null;
      try {
        if (oscillatorToStop) {
          oscillatorToStop.stop();
          oscillatorToStop.dispose();
        }
        if (gainToDispose) {
          gainToDispose.dispose();
        }
      } catch (e) {
        console.debug('Tuner tone cleanup:', e);
      }
    }, 400);
  } catch (e) {
    console.error('Failed to stop tuner tone:', e);
  }
}

export function stopAllNotes(): void {
  // Cancel all pending scheduled playback
  for (const id of pendingPlaybackTimeouts) clearTimeout(id);
  pendingPlaybackTimeouts = [];
  // Release all currently sounding notes
  if (synth) {
    synth.releaseAll();
  }
}

export function setMasterVolume(volume: number): void {
  Tone.Destination.volume.value = Tone.gainToDb(Math.max(0.01, volume));
}

