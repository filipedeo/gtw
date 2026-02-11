import * as Tone from 'tone';
import { DroneConfig, MetronomeConfig, PlaybackOptions } from '../types/audio';

let synth: Tone.PolySynth | null = null;
let droneSynth: Tone.Synth | null = null;
let droneOscillator: Tone.Oscillator | null = null;
let droneGain: Tone.Gain | null = null;
let metronomeLoop: Tone.Loop | null = null;
let metronomeSynth: Tone.MembraneSynth | null = null;
let isInitialized = false;
let droneCleanupTimeout: ReturnType<typeof setTimeout> | null = null;

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
  
  try {
    synth.triggerAttackRelease(
      note, 
      duration, 
      Tone.now() + delay, 
      velocity
    );
  } catch (e) {
    console.error('Failed to play note:', e);
  }
}

export async function playChord(
  notes: string[], 
  options: PlaybackOptions = {}
): Promise<void> {
  if (!isInitialized) await initAudio();
  if (!synth) return;
  
  const { duration = 1, velocity = 0.6, delay = 0 } = options;
  
  try {
    synth.triggerAttackRelease(
      notes, 
      duration, 
      Tone.now() + delay, 
      velocity
    );
  } catch (e) {
    console.error('Failed to play chord:', e);
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
    
    // Set volume
    droneGain.gain.value = config.volume * 0.5;
    
    // Start oscillator
    droneOscillator.start();
    
    // Fade in
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

export function updateDroneVolume(volume: number): void {
  if (droneGain) {
    droneGain.gain.rampTo(volume * 0.5, 0.1);
  }
}

export function updateDroneNote(note: string, octave: number): void {
  if (droneOscillator) {
    const frequency = Tone.Frequency(`${note}${octave}`).toFrequency();
    droneOscillator.frequency.rampTo(frequency, 0.2);
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
    
    let beat = 0;
    metronomeLoop = new Tone.Loop((time) => {
      if (!metronomeSynth) return;
      const isAccent = config.accentFirst && beat === 0;
      metronomeSynth.triggerAttackRelease(isAccent ? 'C3' : 'G3', '32n', time);
      beat = (beat + 1) % config.timeSignature[0];
    }, '4n');
    
    metronomeLoop.start(0);
    Tone.Transport.start();
    
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
    Tone.Transport.stop();
    Tone.Transport.cancel();
    
    console.log('Metronome stopped');
  } catch (e) {
    console.error('Failed to stop metronome:', e);
  }
}

export function updateMetronomeBPM(bpm: number): void {
  Tone.Transport.bpm.value = bpm;
}

export function setMasterVolume(volume: number): void {
  Tone.Destination.volume.value = Tone.gainToDb(Math.max(0.01, volume));
}

export function disposeAll(): void {
  stopDrone();
  stopMetronome();
  if (synth) {
    synth.dispose();
    synth = null;
  }
  isInitialized = false;
}

export function isAudioInitialized(): boolean {
  return isInitialized;
}