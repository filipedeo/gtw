import { detectPitch, PitchResult } from './pitchDetection';

export class MicrophoneManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private buffer: Float32Array<ArrayBuffer> | null = null;

  public onPitchDetected: ((result: PitchResult | null) => void) | null = null;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;

    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);
    // NOT connected to destination — don't echo mic back

    this.buffer = new Float32Array(this.analyser.fftSize) as Float32Array<ArrayBuffer>;
    this.loop();
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.buffer = null;
  }

  private loop = (): void => {
    if (!this.analyser || !this.buffer || !this.audioContext) return;

    this.analyser.getFloatTimeDomainData(this.buffer);
    const result = detectPitch(this.buffer, this.audioContext.sampleRate);
    this.onPitchDetected?.(result);

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}
