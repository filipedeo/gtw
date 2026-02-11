# Audio System Specification
## Guitar Theory Web App - Audio Engine Design

---

## 1. Audio Architecture Overview

### 1.1 Core Audio Components
```typescript
interface AudioSystem {
  engine: AudioEngine;          // Main Tone.js wrapper
  sampleLibrary: SampleLibrary; // Guitar samples across timbres
  drones: DroneGenerator;       // Continuous tones for modal practice
  metronome: MetronomeEngine;   // Practice timing support
  effects: EffectsChain;        // Reverb, chorus, distortion
  mixer: AudioMixer;            // Volume and routing control
  recorder?: AudioRecorder;     // Future: Record practice sessions
}

class AudioEngine {
  private audioContext: AudioContext;
  private destination: AudioNode;
  private isInitialized: boolean = false;
  
  async initialize(): Promise<void>;
  async loadSamples(): Promise<void>;
  cleanup(): void;
  
  // Core playback methods
  playNote(note: string, duration?: string, timbre?: GuitarTimbre): void;
  playChord(notes: string[], duration?: string, timbre?: GuitarTimbre): void;
  playSequence(sequence: NoteSequence): Promise<void>;
  
  // Modal practice support
  startDrone(note: string, volume?: number): void;
  stopDrone(): void;
  
  // Metronome functionality  
  startMetronome(tempo: number, subdivision?: string): void;
  stopMetronome(): void;
}
```

### 1.2 Web Audio API Integration
```typescript
// Browser compatibility and initialization
class AudioContextManager {
  private static instance: AudioContextManager;
  private audioContext: AudioContext | null = null;
  private isUnlocked: boolean = false;
  
  static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager();
    }
    return AudioContextManager.instance;
  }
  
  async initializeContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Handle iOS Safari audio context suspension
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    }
    
    return this.audioContext;
  }
  
  // Mobile browsers require user gesture to unlock audio
  async unlockAudioContext(): Promise<void> {
    if (!this.isUnlocked && this.audioContext) {
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      
      this.isUnlocked = true;
    }
  }
}
```

---

## 2. Guitar Sample Library

### 2.1 Sample Organization Structure
```
/public/audio/samples/
├── clean-electric/
│   ├── notes/
│   │   ├── C2.mp3   # Low B string, 1st fret
│   │   ├── C#2.mp3  # Low B string, 2nd fret  
│   │   ├── ...      # Chromatic samples every fret
│   │   ├── E4.mp3   # High E string, open
│   │   └── G#6.mp3  # High E string, 24th fret
│   └── chords/
│       ├── triads/
│       │   ├── C-major-open.mp3
│       │   ├── C-major-barre-3rd.mp3
│       │   └── ...
│       └── sevenths/
│           ├── Cmaj7-drop2-strings6543.mp3
│           └── ...
├── distorted/
│   ├── notes/      # Same structure as clean
│   └── chords/
├── acoustic-steel/
│   ├── notes/
│   └── chords/
├── acoustic-nylon/
│   ├── notes/
│   └── chords/
└── metadata/
    ├── sample-map.json    # Maps note names to file paths
    ├── chord-voicings.json # Pre-recorded chord voicing metadata
    └── loading-priorities.json # Which samples to load first
```

### 2.2 Sample Loading Strategy
```typescript
interface SampleMetadata {
  note: string;              // "C4"
  timbre: GuitarTimbre;      // "clean", "distorted", "acoustic-steel", "acoustic-nylon"
  string: number;            // 0-6 (high E to low B for 7-string)
  fret: number;              // 0-24
  velocity: number;          // Recorded at which velocity layer (1-4)
  fileSize: number;          // Bytes
  duration: number;          // Seconds
  priority: LoadingPriority; // When to load this sample
}

enum LoadingPriority {
  IMMEDIATE = 0,    // Critical for basic functionality (open strings, first 3 frets)
  HIGH = 1,         // Common practice notes (frets 4-7)
  MEDIUM = 2,       // Extended range (frets 8-12)
  LOW = 3,          // Full range (frets 13-24)
  BACKGROUND = 4    // Non-essential timbres or exotic chord voicings
}

class SampleLibrary {
  private samples: Map<string, Tone.ToneAudioBuffer> = new Map();
  private loadingQueue: SampleMetadata[] = [];
  private loadedPriorities: Set<LoadingPriority> = new Set();
  
  async initializeWithPriority(priority: LoadingPriority): Promise<void> {
    const samplesToLoad = this.loadingQueue.filter(s => s.priority <= priority);
    
    for (const sample of samplesToLoad) {
      try {
        const buffer = await this.loadSample(sample);
        this.samples.set(this.getSampleKey(sample), buffer);
      } catch (error) {
        console.warn(`Failed to load sample ${sample.note}`, error);
      }
    }
    
    this.loadedPriorities.add(priority);
  }
  
  private getSampleKey(metadata: SampleMetadata): string {
    return `${metadata.note}_${metadata.timbre}_s${metadata.string}_f${metadata.fret}`;
  }
  
  async ensureSampleLoaded(note: string, timbre: GuitarTimbre): Promise<boolean> {
    const key = `${note}_${timbre}_auto_auto`; // Auto-select best string/fret
    
    if (this.samples.has(key)) {
      return true;
    }
    
    // Dynamically load if not already loaded
    const metadata = this.findBestSample(note, timbre);
    if (metadata) {
      const buffer = await this.loadSample(metadata);
      this.samples.set(key, buffer);
      return true;
    }
    
    return false;
  }
}
```

### 2.3 Tone.js Sampler Configuration
```typescript
class GuitarSampler {
  private samplers: Map<GuitarTimbre, Tone.Sampler> = new Map();
  private effects: EffectsChain;
  
  async initialize(): Promise<void> {
    // Create separate samplers for each timbre
    const cleanSampler = new Tone.Sampler({
      urls: {
        'C2': 'clean-C2.mp3',
        'C3': 'clean-C3.mp3', 
        'C4': 'clean-C4.mp3',
        'C5': 'clean-C5.mp3',
        'C6': 'clean-C6.mp3'
      },
      baseUrl: '/audio/samples/clean-electric/notes/',
      onload: () => console.log('Clean guitar samples loaded'),
      attack: 0.01,      // Quick attack for guitar responsiveness
      release: 2.0,      // Natural guitar sustain
      curve: 'exponential'
    });
    
    const distortedSampler = new Tone.Sampler({
      urls: {
        'C2': 'dist-C2.mp3',
        'C3': 'dist-C3.mp3',
        'C4': 'dist-C4.mp3', 
        'C5': 'dist-C5.mp3',
        'C6': 'dist-C6.mp3'
      },
      baseUrl: '/audio/samples/distorted/notes/',
      onload: () => console.log('Distorted guitar samples loaded'),
      attack: 0.005,     // Even faster attack for distorted tone
      release: 3.0       // Longer sustain with distortion
    });
    
    // Chain through effects and store
    cleanSampler.chain(this.effects.cleanChain, Tone.Destination);
    distortedSampler.chain(this.effects.distortedChain, Tone.Destination);
    
    this.samplers.set(GuitarTimbre.CLEAN_ELECTRIC, cleanSampler);
    this.samplers.set(GuitarTimbre.DISTORTED, distortedSampler);
  }
  
  playNote(note: string, duration: string = '8n', timbre: GuitarTimbre = GuitarTimbre.CLEAN_ELECTRIC): void {
    const sampler = this.samplers.get(timbre);
    if (sampler) {
      sampler.triggerAttackRelease(note, duration);
    }
  }
  
  playChord(notes: string[], duration: string = '2n', timbre: GuitarTimbre = GuitarTimbre.CLEAN_ELECTRIC): void {
    const sampler = this.samplers.get(timbre);
    if (sampler) {
      const now = Tone.now();
      notes.forEach((note, index) => {
        // Slight stagger to emulate realistic strumming
        sampler.triggerAttackRelease(note, duration, now + (index * 0.01));
      });
    }
  }
}
```

---

## 3. Drone Generation System

### 3.1 Modal Practice Drones
```typescript
enum DroneType {
  SINE = 'sine',           // Pure tone, least distracting
  SAWTOOTH = 'sawtooth',   // Harmonic richness
  TRIANGLE = 'triangle',   // Warmer than sine
  GUITAR = 'guitar'        // Using actual guitar sample sustained
}

class DroneGenerator {
  private oscillators: Map<string, Tone.Oscillator> = new Map();
  private guitarDrones: Map<string, Tone.Player> = new Map();
  private droneGain: Tone.Gain;
  private lowpassFilter: Tone.Filter;
  private isActive: boolean = false;
  
  constructor() {
    // Create audio chain for drones
    this.droneGain = new Tone.Gain(0.3); // Start at moderate volume
    this.lowpassFilter = new Tone.Filter({
      frequency: 800,     // Remove harsh high frequencies
      type: 'lowpass',
      rolloff: -12
    });
    
    this.droneGain.chain(this.lowpassFilter, Tone.Destination);
  }
  
  async startDrone(note: string, type: DroneType = DroneType.SINE): Promise<void> {
    this.stopDrone(); // Stop any existing drone
    
    if (type === DroneType.GUITAR) {
      await this.startGuitarDrone(note);
    } else {
      this.startSynthDrone(note, type);
    }
    
    this.isActive = true;
  }
  
  private startSynthDrone(note: string, type: DroneType): void {
    const frequency = Tone.Frequency(note).toFrequency();
    const oscillator = new Tone.Oscillator({
      frequency: frequency,
      type: type as OscillatorType
    }).connect(this.droneGain);
    
    oscillator.start();
    this.oscillators.set(note, oscillator);
  }
  
  private async startGuitarDrone(note: string): Promise<void> {
    // Use looped guitar sample for more realistic drone
    const droneFile = `/audio/drones/${note}-drone.mp3`;
    
    const player = new Tone.Player({
      url: droneFile,
      loop: true,
      autostart: false,
      loopStart: 1.0,    // Skip attack transient
      loopEnd: 4.0       // Loop middle section of sample
    }).connect(this.droneGain);
    
    await Tone.loaded();
    player.start();
    this.guitarDrones.set(note, player);
  }
  
  stopDrone(): void {
    // Stop all oscillators
    this.oscillators.forEach(osc => {
      osc.stop();
      osc.dispose();
    });
    this.oscillators.clear();
    
    // Stop all guitar drones
    this.guitarDrones.forEach(player => {
      player.stop();
      player.dispose();
    });
    this.guitarDrones.clear();
    
    this.isActive = false;
  }
  
  setVolume(volume: number): void {
    // Volume from 0-1
    this.droneGain.gain.rampTo(volume, 0.1);
  }
  
  fadeIn(duration: number = 2): void {
    this.droneGain.gain.rampTo(0.3, duration);
  }
  
  fadeOut(duration: number = 2): Promise<void> {
    this.droneGain.gain.rampTo(0, duration);
    return new Promise(resolve => setTimeout(resolve, duration * 1000));
  }
}
```

### 3.2 Backing Track Generation
```typescript
interface ChordProgression {
  chords: string[];           // ["Dm7", "G7", "Cmaj7"]
  key: string;               // "C major"
  tempo: number;             // BPM
  measures: number;          // Length in measures
  style: BackingStyle;       // Musical style
  voicingType: VoicingType;  // How chords are played
}

enum BackingStyle {
  JAZZ_SWING = 'jazz_swing',
  JAZZ_BOSSA = 'jazz_bossa', 
  POP_BALLAD = 'pop_ballad',
  ROCK_STEADY = 'rock_steady',
  BLUES_SHUFFLE = 'blues_shuffle',
  LATIN_MONTUNO = 'latin_montuno'
}

class BackingTrackGenerator {
  private transport: Tone.Transport;
  private chordSequence: Tone.Sequence;
  private bassLine: Tone.Sequence;
  private drumPattern: Tone.Sequence;
  
  generateProgression(progression: ChordProgression): void {
    this.transport.bpm.value = progression.tempo;
    
    // Create chord sequence
    this.chordSequence = new Tone.Sequence((time, chord) => {
      this.playChordInStyle(chord, progression.style, time);
    }, progression.chords, '1m'); // One chord per measure
    
    // Create bass line
    const bassNotes = progression.chords.map(chord => this.extractBassNote(chord));
    this.bassLine = new Tone.Sequence((time, note) => {
      this.playBassNote(note, progression.style, time);
    }, bassNotes, '1m');
    
    // Simple drum pattern
    this.createDrumPattern(progression.style);
  }
  
  private playChordInStyle(chordSymbol: string, style: BackingStyle, time: number): void {
    const voicing = this.getChordVoicing(chordSymbol);
    
    switch (style) {
      case BackingStyle.JAZZ_SWING:
        // Comp on beats 2 and 4
        if (this.isOffbeat(time)) {
          this.guitarSampler.playChord(voicing, '8n', GuitarTimbre.CLEAN_ELECTRIC);
        }
        break;
        
      case BackingStyle.POP_BALLAD:
        // Arpeggiated pattern
        voicing.forEach((note, index) => {
          this.guitarSampler.playNote(note, '16n', GuitarTimbre.CLEAN_ELECTRIC);
        });
        break;
        
      case BackingStyle.ROCK_STEADY:
        // Strong downbeats
        this.guitarSampler.playChord(voicing, '4n', GuitarTimbre.DISTORTED);
        break;
    }
  }
  
  start(): void {
    this.chordSequence.start(0);
    this.bassLine.start(0);
    this.drumPattern?.start(0);
    this.transport.start();
  }
  
  stop(): void {
    this.transport.stop();
    this.chordSequence.stop();
    this.bassLine.stop();
    this.drumPattern?.stop();
  }
}
```

---

## 4. Metronome Engine

### 4.1 Advanced Metronome Features
```typescript
interface MetronomeConfig {
  tempo: number;              // BPM
  timeSignature: [number, number]; // [4, 4] = 4/4 time
  subdivision: Subdivision;   // What level gets the click
  accentPattern: boolean[];   // [true, false, false, false] = accent on 1
  sound: MetronomeSound;      // What type of click sound
  volume: number;             // 0-1
}

enum Subdivision {
  QUARTER = 'quarter',       // Quarter note clicks
  EIGHTH = 'eighth',         // Eighth note clicks  
  SIXTEENTH = 'sixteenth',   // Sixteenth note clicks
  TRIPLET = 'triplet'        // Eighth note triplets
}

enum MetronomeSound {
  CLASSIC_TICK = 'tick',     // Traditional metronome sound
  WOOD_BLOCK = 'wood',       // Wood block sound
  DIGITAL_BEEP = 'beep',     // Electronic beep
  DRUM_STICK = 'stick'       // Drum stick click
}

class MetronomeEngine {
  private isRunning: boolean = false;
  private sequence: Tone.Sequence | null = null;
  private clickSampler: Tone.Sampler;
  private transport: Tone.Transport;
  private currentConfig: MetronomeConfig;
  
  constructor() {
    this.transport = Tone.Transport;
    
    // Load metronome sounds
    this.clickSampler = new Tone.Sampler({
      urls: {
        'C4': 'click-accent.mp3',    // Accented click
        'C3': 'click-normal.mp3'     // Normal click
      },
      baseUrl: '/audio/metronome/',
      volume: -10  // Start quieter than main audio
    });
  }
  
  start(config: MetronomeConfig): void {
    this.stop(); // Stop any existing metronome
    this.currentConfig = config;
    
    this.transport.bpm.value = config.tempo;
    this.transport.timeSignature = config.timeSignature;
    
    const clickPattern = this.generateClickPattern(config);
    
    this.sequence = new Tone.Sequence((time, click) => {
      if (click.play) {
        const note = click.accent ? 'C4' : 'C3';
        this.clickSampler.triggerAttackRelease(note, '32n', time);
      }
    }, clickPattern, this.getSubdivisionInterval(config.subdivision));
    
    this.sequence.start(0);
    this.transport.start();
    this.isRunning = true;
  }
  
  stop(): void {
    if (this.sequence) {
      this.sequence.stop();
      this.sequence.dispose();
      this.sequence = null;
    }
    this.transport.stop();
    this.isRunning = false;
  }
  
  tap(): void {
    // Manual tap to set tempo
    const now = Tone.now();
    this.tapTimes.push(now);
    
    // Keep only last 4 taps
    if (this.tapTimes.length > 4) {
      this.tapTimes.shift();
    }
    
    if (this.tapTimes.length >= 2) {
      const tempo = this.calculateTempoFromTaps();
      this.updateTempo(tempo);
    }
  }
  
  private generateClickPattern(config: MetronomeConfig): ClickBeat[] {
    const [beatsPerMeasure, beatUnit] = config.timeSignature;
    const clicksPerMeasure = this.getClicksPerMeasure(config.subdivision, beatsPerMeasure);
    
    const pattern: ClickBeat[] = [];
    
    for (let i = 0; i < clicksPerMeasure; i++) {
      const isDownbeat = i === 0;
      const isAccented = config.accentPattern[i % config.accentPattern.length];
      
      pattern.push({
        play: true,
        accent: isDownbeat || isAccented,
        beat: Math.floor(i / this.getSubdivisionMultiplier(config.subdivision)) + 1
      });
    }
    
    return pattern;
  }
  
  changeTempo(newTempo: number): void {
    if (this.isRunning) {
      this.transport.bpm.rampTo(newTempo, 0.1); // Smooth tempo change
      this.currentConfig.tempo = newTempo;
    }
  }
  
  changeTimeSignature(numerator: number, denominator: number): void {
    if (this.isRunning) {
      this.start({
        ...this.currentConfig,
        timeSignature: [numerator, denominator]
      });
    }
  }
}

interface ClickBeat {
  play: boolean;
  accent: boolean;
  beat: number;
}
```

### 4.2 Practice Session Integration
```typescript
class PracticeSessionTimer {
  private metronome: MetronomeEngine;
  private sessionStartTime: number;
  private practiceSegments: PracticeSegment[] = [];
  
  startMetronomeSession(config: MetronomeConfig, exercise: Exercise): void {
    this.metronome.start(config);
    
    const segment: PracticeSegment = {
      exercise: exercise.type,
      startTime: Date.now(),
      tempo: config.tempo,
      timeSignature: config.timeSignature,
      responses: []
    };
    
    this.practiceSegments.push(segment);
  }
  
  recordResponse(response: ExerciseResponse): void {
    const currentSegment = this.getCurrentSegment();
    if (currentSegment) {
      currentSegment.responses.push({
        ...response,
        timingAccuracy: this.calculateTimingAccuracy(response.responseTimeMs)
      });
    }
  }
  
  private calculateTimingAccuracy(responseTimeMs: number): number {
    const tempo = this.getCurrentTempo();
    const beatDurationMs = (60 / tempo) * 1000;
    
    // Calculate how close the response was to a beat
    const offsetFromBeat = responseTimeMs % beatDurationMs;
    const accuracy = 1 - Math.abs(offsetFromBeat - beatDurationMs/2) / (beatDurationMs/2);
    
    return Math.max(0, accuracy);
  }
  
  generateSessionReport(): SessionReport {
    return {
      totalDuration: Date.now() - this.sessionStartTime,
      averageTempo: this.calculateAverageTempo(),
      timingAccuracy: this.calculateOverallTimingAccuracy(),
      tempoStability: this.calculateTempoStability(),
      segments: this.practiceSegments
    };
  }
}
```

---

## 5. Effects Processing Chain

### 5.1 Guitar Effects Implementation
```typescript
class EffectsChain {
  private reverb: Tone.Reverb;
  private chorus: Tone.Chorus;
  private distortion: Tone.Distortion;
  private equalizer: Tone.EQ3;
  private compressor: Tone.Compressor;
  
  // Separate chains for different timbres
  public cleanChain: Tone.Effect[];
  public distortedChain: Tone.Effect[];
  public acousticChain: Tone.Effect[];
  
  constructor() {
    this.initializeEffects();
    this.createEffectChains();
  }
  
  private initializeEffects(): void {
    // Reverb for spatial depth
    this.reverb = new Tone.Reverb({
      decay: 2.0,
      wet: 0.3
    });
    
    // Chorus for clean tones
    this.chorus = new Tone.Chorus({
      frequency: 1.5,
      delayTime: 3.5,
      depth: 0.7,
      type: 'sine'
    });
    
    // Distortion for rock tones
    this.distortion = new Tone.Distortion({
      distortion: 0.6,
      oversample: '4x'
    });
    
    // EQ for tone shaping
    this.equalizer = new Tone.EQ3({
      low: 0,
      mid: 0,
      high: 2 // Slight high boost for guitar presence
    });
    
    // Compression for consistent dynamics
    this.compressor = new Tone.Compressor({
      threshold: -24,
      ratio: 4,
      attack: 0.003,
      release: 0.1
    });
  }
  
  private createEffectChains(): void {
    // Clean electric chain: Chorus → EQ → Compressor → Reverb
    this.cleanChain = [
      this.chorus,
      this.equalizer,
      this.compressor,
      this.reverb
    ];
    
    // Distorted chain: Distortion → EQ → Compressor → Reverb
    this.distortedChain = [
      this.distortion,
      this.equalizer,
      this.compressor,
      this.reverb
    ];
    
    // Acoustic chain: EQ → Compressor → Reverb
    this.acousticChain = [
      this.equalizer,
      this.compressor,
      this.reverb
    ];
  }
  
  updateReverbAmount(wet: number): void {
    this.reverb.wet.value = wet;
  }
  
  updateChorusDepth(depth: number): void {
    this.chorus.depth.value = depth;
  }
  
  updateDistortionAmount(distortion: number): void {
    this.distortion.distortion = distortion;
  }
}
```

### 5.2 Dynamic Effects Control
```typescript
interface EffectsPreset {
  name: string;
  description: string;
  timbre: GuitarTimbre;
  settings: {
    reverb: { decay: number; wet: number };
    chorus?: { frequency: number; depth: number };
    distortion?: { distortion: number; wet: number };
    eq: { low: number; mid: number; high: number };
    compressor: { threshold: number; ratio: number };
  };
}

const EFFECTS_PRESETS: EffectsPreset[] = [
  {
    name: 'Clean Jazz',
    description: 'Warm, clean tone perfect for chord studies',
    timbre: GuitarTimbre.CLEAN_ELECTRIC,
    settings: {
      reverb: { decay: 1.5, wet: 0.25 },
      chorus: { frequency: 1.2, depth: 0.5 },
      eq: { low: 0, mid: 1, high: 2 },
      compressor: { threshold: -20, ratio: 3 }
    }
  },
  {
    name: 'Fusion Lead',
    description: 'Slightly driven tone for single-note practice',
    timbre: GuitarTimbre.CLEAN_ELECTRIC,
    settings: {
      reverb: { decay: 2.0, wet: 0.4 },
      chorus: { frequency: 2.0, depth: 0.3 },
      eq: { low: -1, mid: 2, high: 3 },
      compressor: { threshold: -18, ratio: 4 }
    }
  },
  {
    name: 'Acoustic Steel',
    description: 'Natural acoustic sound for fingerstyle practice',
    timbre: GuitarTimbre.ACOUSTIC_STEEL,
    settings: {
      reverb: { decay: 1.8, wet: 0.2 },
      eq: { low: 1, mid: 0, high: 2 },
      compressor: { threshold: -22, ratio: 2.5 }
    }
  }
];

class EffectsController {
  private currentPreset: EffectsPreset | null = null;
  private effects: EffectsChain;
  
  loadPreset(presetName: string): void {
    const preset = EFFECTS_PRESETS.find(p => p.name === presetName);
    if (!preset) return;
    
    this.currentPreset = preset;
    this.applySettings(preset.settings);
  }
  
  private applySettings(settings: EffectsPreset['settings']): void {
    // Apply reverb settings
    this.effects.updateReverbAmount(settings.reverb.wet);
    
    // Apply chorus if present
    if (settings.chorus) {
      this.effects.updateChorusDepth(settings.chorus.depth);
    }
    
    // Apply distortion if present
    if (settings.distortion) {
      this.effects.updateDistortionAmount(settings.distortion.distortion);
    }
    
    // EQ and compression settings applied to respective effects
  }
  
  createCustomPreset(name: string, settings: any): EffectsPreset {
    // Allow users to save their own effect combinations
    const customPreset: EffectsPreset = {
      name,
      description: 'User-created preset',
      timbre: GuitarTimbre.CLEAN_ELECTRIC,
      settings
    };
    
    // Save to local storage or user preferences
    this.saveCustomPreset(customPreset);
    return customPreset;
  }
}
```

---

## 6. Audio Performance Optimization

### 6.1 Latency Reduction
```typescript
class LowLatencyAudioManager {
  private audioContext: AudioContext;
  private bufferSize: number = 128; // Smallest buffer for lowest latency
  private sampleRate: number = 44100;
  
  async optimizeForLowLatency(): Promise<void> {
    // Request lowest latency audio context
    const constraints = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      latency: 0.01 // 10ms target latency
    };
    
    if (this.audioContext.baseLatency !== undefined) {
      console.log(`Base latency: ${this.audioContext.baseLatency * 1000}ms`);
    }
    
    if (this.audioContext.outputLatency !== undefined) {
      console.log(`Output latency: ${this.audioContext.outputLatency * 1000}ms`);
    }
    
    // Pre-generate audio buffers for instant playback
    await this.preGenerateCommonSounds();
  }
  
  private async preGenerateCommonSounds(): Promise<void> {
    // Pre-generate buffers for immediate trigger
    const commonNotes = ['C2', 'C3', 'C4', 'C5', 'C6'];
    const buffers = new Map<string, AudioBuffer>();
    
    for (const note of commonNotes) {
      const frequency = Tone.Frequency(note).toFrequency();
      const buffer = this.generateNoteBuffer(frequency, 1.0); // 1 second
      buffers.set(note, buffer);
    }
    
    this.preGeneratedBuffers = buffers;
  }
  
  private generateNoteBuffer(frequency: number, duration: number): AudioBuffer {
    const sampleCount = this.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, sampleCount, this.sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Generate simple sine wave for instant feedback
    for (let i = 0; i < sampleCount; i++) {
      const time = i / this.sampleRate;
      channelData[i] = Math.sin(2 * Math.PI * frequency * time) * 
                      Math.exp(-time * 2); // Exponential decay
    }
    
    return buffer;
  }
  
  playNoteInstant(note: string): void {
    const buffer = this.preGeneratedBuffers.get(note);
    if (buffer) {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
    }
  }
}
```

### 6.2 Memory Management
```typescript
class AudioMemoryManager {
  private loadedSamples: Map<string, AudioBuffer> = new Map();
  private maxMemoryMB: number = 50; // 50MB limit for audio samples
  private currentMemoryMB: number = 0;
  private lruCache: Map<string, number> = new Map(); // Last used times
  
  loadSample(url: string, priority: LoadingPriority): Promise<AudioBuffer> {
    // Check if already loaded
    if (this.loadedSamples.has(url)) {
      this.lruCache.set(url, Date.now());
      return Promise.resolve(this.loadedSamples.get(url)!);
    }
    
    return this.loadAndCache(url, priority);
  }
  
  private async loadAndCache(url: string, priority: LoadingPriority): Promise<AudioBuffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    
    const sizeEstimate = this.estimateBufferSize(audioBuffer);
    
    // Free memory if needed
    while (this.currentMemoryMB + sizeEstimate > this.maxMemoryMB) {
      this.freeLeastRecentlyUsed();
    }
    
    // Cache the new sample
    this.loadedSamples.set(url, audioBuffer);
    this.lruCache.set(url, Date.now());
    this.currentMemoryMB += sizeEstimate;
    
    return audioBuffer;
  }
  
  private freeLeastRecentlyUsed(): void {
    let oldestUrl = '';
    let oldestTime = Date.now();
    
    for (const [url, time] of this.lruCache.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestUrl = url;
      }
    }
    
    if (oldestUrl) {
      const buffer = this.loadedSamples.get(oldestUrl);
      if (buffer) {
        const size = this.estimateBufferSize(buffer);
        this.currentMemoryMB -= size;
        this.loadedSamples.delete(oldestUrl);
        this.lruCache.delete(oldestUrl);
      }
    }
  }
  
  private estimateBufferSize(buffer: AudioBuffer): number {
    // Estimate size: samples * channels * 4 bytes per float32
    const bytes = buffer.length * buffer.numberOfChannels * 4;
    return bytes / (1024 * 1024); // Convert to MB
  }
  
  clearCache(): void {
    this.loadedSamples.clear();
    this.lruCache.clear();
    this.currentMemoryMB = 0;
  }
  
  getMemoryStats(): { used: number; limit: number; cached: number } {
    return {
      used: this.currentMemoryMB,
      limit: this.maxMemoryMB,
      cached: this.loadedSamples.size
    };
  }
}
```

### 6.3 Progressive Loading Strategy
```typescript
class ProgressiveAudioLoader {
  private loadingQueues: Map<LoadingPriority, string[]> = new Map();
  private loadingPromises: Map<string, Promise<void>> = new Map();
  
  initialize(): void {
    // Set up loading queues by priority
    this.loadingQueues.set(LoadingPriority.IMMEDIATE, [
      '/audio/samples/clean/C3.mp3',
      '/audio/samples/clean/G3.mp3',
      '/audio/samples/clean/E4.mp3'
    ]);
    
    this.loadingQueues.set(LoadingPriority.HIGH, [
      '/audio/samples/clean/C2.mp3',
      '/audio/samples/clean/F3.mp3',
      '/audio/samples/clean/A3.mp3'
    ]);
    
    // Load immediate priority samples first
    this.startProgressiveLoad();
  }
  
  async startProgressiveLoad(): Promise<void> {
    // Load in order of priority
    for (const priority of [LoadingPriority.IMMEDIATE, LoadingPriority.HIGH, LoadingPriority.MEDIUM, LoadingPriority.LOW]) {
      const queue = this.loadingQueues.get(priority);
      if (queue) {
        await this.loadQueue(queue, priority);
      }
    }
  }
  
  private async loadQueue(urls: string[], priority: LoadingPriority): Promise<void> {
    const loadPromises = urls.map(url => this.loadSingleSample(url, priority));
    
    if (priority === LoadingPriority.IMMEDIATE) {
      // Wait for all immediate samples before proceeding
      await Promise.all(loadPromises);
    } else {
      // Load others in background
      Promise.all(loadPromises).catch(error => {
        console.warn(`Failed to load ${priority} priority samples:`, error);
      });
    }
  }
  
  private async loadSingleSample(url: string, priority: LoadingPriority): Promise<void> {
    try {
      await this.memoryManager.loadSample(url, priority);
      this.reportProgress(priority);
    } catch (error) {
      console.error(`Failed to load ${url}:`, error);
    }
  }
  
  private reportProgress(priority: LoadingPriority): void {
    const event = new CustomEvent('audioLoadProgress', {
      detail: { priority, timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }
  
  // Preload samples for specific exercise
  async preloadForExercise(exerciseType: ExerciseType): Promise<void> {
    const requiredSamples = this.getRequiredSamplesForExercise(exerciseType);
    const loadPromises = requiredSamples.map(url => 
      this.loadSingleSample(url, LoadingPriority.HIGH)
    );
    
    await Promise.all(loadPromises);
  }
}
```

---

This comprehensive audio system specification provides the foundation for a professional-quality guitar learning application with realistic guitar sounds, comprehensive practice support, and optimized performance across all devices.