import * as Tone from 'tone';
import { DroneConfig, ChordProgression } from '../types/audio';

export class AudioEngine {
    private synth: Tone.PolySynth;

    constructor() {
        this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
    }

    playDrone(droneConfig: DroneConfig): void {
        this.synth.triggerAttackRelease(droneConfig.note.name + droneConfig.note.octave, droneConfig.duration);
    }

    playChordProgression(chordProgression: ChordProgression): void {
        chordProgression.chords.forEach((chord, index) => {
            setTimeout(() => {
                this.synth.triggerAttackRelease(chord.map(note => note.name + note.octave).join(','), '4n', Tone.now() + index * (60 / chordProgression.tempo));
            }, index * (60000 / chordProgression.tempo));
        });
    }
}