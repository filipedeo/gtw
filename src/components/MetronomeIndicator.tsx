import React from 'react';
import { useAudioStore } from '../stores/audioStore';
import { stopMetronome } from '../lib/audioEngine';

const MetronomeIndicator: React.FC = React.memo(() => {
  const { isMetronomeActive, metronomeConfig, setMetronomeActive } = useAudioStore();

  if (!isMetronomeActive) return null;

  const handleStop = () => {
    stopMetronome();
    setMetronomeActive(false);
  };

  const tsLabel = `${metronomeConfig.timeSignature[0]}/${metronomeConfig.timeSignature[1]}`;

  return (
    <button
      onClick={handleStop}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--rad-md)] text-sm font-mono cursor-pointer transition-colors hover:opacity-80 min-h-[44px] bg-accent-subtle text-accent border border-accent"
      title="Click to stop metronome"
      aria-label={`Metronome active: ${metronomeConfig.bpm} BPM, ${tsLabel}. Click to stop.`}
    >
      <span
        className="inline-block w-2 h-2 rounded-full bg-accent"
        style={{ animation: `metronome-pulse ${60 / metronomeConfig.bpm}s ease-in-out infinite` }}
      />
      <span className="font-bold tabular-nums">{metronomeConfig.bpm}</span>
      <span className="text-xs opacity-70">{tsLabel}</span>
    </button>
  );
});

export default MetronomeIndicator;
