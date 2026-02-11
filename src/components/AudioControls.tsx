import React from 'react';
import { useAudioStore } from '../stores/audioStore';

const AudioControls: React.FC = () => {
    const { audioState, setAudioState } = useAudioStore();

    const togglePlay = () => {
        setAudioState({ ...audioState, isPlaying: !audioState.isPlaying });
    };

    return (
        <div className='audio-controls'>
            <button onClick={togglePlay}>{audioState.isPlaying ? 'Pause' : 'Play'}</button>
        </div>
    );
};

export default AudioControls;