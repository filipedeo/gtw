import React, { useEffect, useRef, useCallback } from 'react';
import { useTunerStore } from '../stores/tunerStore';
import { useGuitarStore } from '../stores/guitarStore';
import { noteToFrequency } from '../lib/pitchDetection';
import { MicrophoneManager } from '../lib/microphoneManager';
import { startTunerTone, stopTunerTone, initAudio } from '../lib/audioEngine';

// SVG arc gauge constants
const GAUGE_SIZE = 260;
const GAUGE_CX = GAUGE_SIZE / 2;
const GAUGE_CY = GAUGE_SIZE / 2 + 20;
const GAUGE_R = 100;
const ARC_START_ANGLE = Math.PI; // 180 degrees (left)
const ARC_END_ANGLE = 0;        // 0 degrees (right)

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy - r * Math.sin(angleRad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  return `M ${start.x} ${start.y} A ${r} ${r} 0 0 0 ${end.x} ${end.y}`;
}

// Map cents (-50 to +50) to angle (PI to 0)
function centsToAngle(cents: number): number {
  const clamped = Math.max(-50, Math.min(50, cents));
  const t = (clamped + 50) / 100; // 0 to 1
  return ARC_START_ANGLE + t * (ARC_END_ANGLE - ARC_START_ANGLE);
}

const GuitarTuner: React.FC = () => {
  const {
    isListening,
    detectedPitch,
    selectedStringIndex,
    isPlayingReference,
    micError,
    setListening,
    setDetectedPitch,
    setSelectedStringIndex,
    setPlayingReference,
    setMicError,
    reset,
  } = useTunerStore();

  const tuning = useGuitarStore((s) => s.tuning);
  const micRef = useRef<MicrophoneManager | null>(null);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      micRef.current?.stop();
      micRef.current = null;
      setListening(false);
      setDetectedPitch(null);
      return;
    }

    let mic: MicrophoneManager | null = null;
    try {
      setMicError(null);
      mic = new MicrophoneManager();
      mic.onPitchDetected = (result) => {
        setDetectedPitch(result);
      };
      await mic.start();
      micRef.current = mic;
      setListening(true);
    } catch (e: unknown) {
      // Ensure partially-initialized mic is cleaned up on failure
      mic?.stop();
      if (e instanceof DOMException && e.name === 'NotAllowedError') {
        setMicError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else {
        setMicError('Could not access microphone. Please check your device settings.');
      }
    }
  }, [isListening, setListening, setDetectedPitch, setMicError]);

  const handleStringClick = useCallback(
    async (index: number) => {
      await initAudio();

      if (selectedStringIndex === index && isPlayingReference) {
        stopTunerTone();
        setSelectedStringIndex(null);
        setPlayingReference(false);
        return;
      }

      const note = tuning.notes[index];
      const freq = noteToFrequency(note);
      stopTunerTone();
      startTunerTone(freq);
      setSelectedStringIndex(index);
      setPlayingReference(true);
    },
    [selectedStringIndex, isPlayingReference, tuning.notes, setSelectedStringIndex, setPlayingReference],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      micRef.current?.stop();
      stopTunerTone();
      reset();
    };
  }, [reset]);

  const cents = detectedPitch?.cents ?? 0;
  const absCents = Math.abs(cents);
  const isInTune = absCents < 5;
  const centsColor = isInTune ? 'var(--success)' : absCents < 15 ? '#eab308' : 'var(--error)';
  const centsLabel = isInTune ? 'In Tune' : cents > 0 ? 'Sharp' : 'Flat';

  // Needle angle
  const needleAngle = centsToAngle(cents);
  const needleTip = polarToCartesian(GAUGE_CX, GAUGE_CY, GAUGE_R - 8, needleAngle);
  const needleBase = polarToCartesian(GAUGE_CX, GAUGE_CY, 12, needleAngle);

  // Tick marks
  const ticks = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];

  // Color zone arcs (drawn as separate arc segments)
  // Red: -50 to -15, Green: -5 to +5, Yellow: -15 to -5 and +5 to +15, Red: +15 to +50
  const zones = [
    { from: -50, to: -15, color: 'var(--error)', opacity: 0.3 },
    { from: -15, to: -5, color: '#eab308', opacity: 0.35 },
    { from: -5, to: 5, color: 'var(--success)', opacity: 0.5 },
    { from: 5, to: 15, color: '#eab308', opacity: 0.35 },
    { from: 15, to: 50, color: 'var(--error)', opacity: 0.3 },
  ];

  const hasPitch = isListening && detectedPitch;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>Tuner</h4>
        <button
          onClick={toggleListening}
          className="px-4 py-2 rounded-lg font-medium transition-colors text-white text-sm"
          style={{ backgroundColor: isListening ? 'var(--error)' : 'var(--success)' }}
        >
          {isListening ? 'Stop' : 'Start'} Listening
        </button>
      </div>

      {micError && (
        <div
          className="mb-3 p-3 rounded-lg text-sm"
          style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: 'var(--error)' }}
        >
          {micError}
        </div>
      )}

      {/* SVG Arc Gauge */}
      <div className="flex flex-col items-center">
        <svg
          width={GAUGE_SIZE}
          height={GAUGE_SIZE / 2 + 50}
          viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE / 2 + 50}`}
          className="select-none"
        >
          {/* Color zone arcs */}
          {zones.map((zone, i) => (
            <path
              key={i}
              d={describeArc(
                GAUGE_CX, GAUGE_CY, GAUGE_R,
                centsToAngle(zone.from),
                centsToAngle(zone.to)
              )}
              fill="none"
              stroke={zone.color}
              strokeWidth={10}
              opacity={zone.opacity}
              strokeLinecap="round"
            />
          ))}

          {/* Outer arc track */}
          <path
            d={describeArc(GAUGE_CX, GAUGE_CY, GAUGE_R, ARC_START_ANGLE, ARC_END_ANGLE)}
            fill="none"
            stroke="var(--border-color)"
            strokeWidth={2}
          />

          {/* Tick marks */}
          {ticks.map((t) => {
            const angle = centsToAngle(t);
            const outer = polarToCartesian(GAUGE_CX, GAUGE_CY, GAUGE_R + 8, angle);
            const inner = polarToCartesian(GAUGE_CX, GAUGE_CY, GAUGE_R - (t === 0 ? 14 : 6), angle);
            return (
              <g key={t}>
                <line
                  x1={inner.x} y1={inner.y}
                  x2={outer.x} y2={outer.y}
                  stroke="var(--text-muted)"
                  strokeWidth={t === 0 ? 2 : 1}
                  opacity={t === 0 ? 0.8 : 0.5}
                />
                {(t === -50 || t === 0 || t === 50) && (
                  <text
                    x={outer.x + (t < 0 ? -4 : t > 0 ? 4 : 0)}
                    y={outer.y + 14}
                    textAnchor="middle"
                    fontSize="10"
                    fill="var(--text-muted)"
                  >
                    {t > 0 ? '+' : ''}{t}
                  </text>
                )}
              </g>
            );
          })}

          {/* Needle */}
          {hasPitch && (
            <>
              <line
                x1={needleBase.x} y1={needleBase.y}
                x2={needleTip.x} y2={needleTip.y}
                stroke={centsColor}
                strokeWidth={3}
                strokeLinecap="round"
                style={{ transition: 'all 0.12s ease-out' }}
              />
              {/* Needle center dot */}
              <circle
                cx={GAUGE_CX} cy={GAUGE_CY}
                r={6}
                fill={centsColor}
                style={{ transition: 'fill 0.12s ease-out' }}
              />
            </>
          )}

          {/* Center "in tune" glow */}
          {hasPitch && isInTune && (
            <circle
              cx={GAUGE_CX} cy={GAUGE_CY}
              r={8}
              fill="var(--success)"
              opacity={0.4}
              className="tuner-in-tune"
            />
          )}
        </svg>

        {/* Note name display */}
        <div className="text-center -mt-2">
          {hasPitch ? (
            <>
              <div
                className={`text-5xl font-bold transition-colors ${isInTune ? 'tuner-in-tune' : ''}`}
                style={{ color: centsColor }}
              >
                {detectedPitch.noteNameWithoutOctave}
                <span className="text-2xl ml-1" style={{ color: 'var(--text-secondary)' }}>
                  {detectedPitch.octave}
                </span>
              </div>
              <div className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {detectedPitch.frequency.toFixed(1)} Hz
              </div>
              <div className="text-sm font-semibold mt-1" style={{ color: centsColor }}>
                {centsLabel} ({cents > 0 ? '+' : ''}{cents}¢)
              </div>
            </>
          ) : isListening ? (
            <div className="text-lg py-4" style={{ color: 'var(--text-muted)' }}>
              Play a note...
            </div>
          ) : (
            <div className="text-base py-4" style={{ color: 'var(--text-muted)' }}>
              Press Start Listening to tune
            </div>
          )}
        </div>
      </div>

      {/* String selector */}
      <div className="mt-4">
        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
          Reference Tones
        </label>
        <div className="flex gap-2 flex-wrap">
          {tuning.notes.map((note, index) => {
            const stringNum = tuning.notes.length - index;
            const isActive = selectedStringIndex === index && isPlayingReference;
            return (
              <button
                key={`${index}-${note}`}
                onClick={() => handleStringClick(index)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--bg-primary)',
                  color: isActive ? 'white' : 'var(--text-primary)',
                  border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                }}
              >
                {stringNum} {note.replace(/\d+$/, '')}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GuitarTuner;
