import React from 'react';
import {
  CIRCLE_OF_FIFTHS,
  getAccidentalNotes,
  keySignatureLabel,
  type KeyInfo,
} from '../lib/circleOfFifths';

// Visual circle-of-fifths wheel (roadmap P4#6). Renders the 12 clock positions
// (enharmonic keys share a slot) and, on an answer reveal, highlights the key the
// question was about so the reveal teaches the structure, not just text.

interface CircleOfFifthsWheelProps {
  /** Major tonic to highlight (e.g. "D", "Bb"), or null for a plain reference. */
  highlightMajor: string | null;
  size?: number;
}

const slotOf = (position: number): number => ((position % 12) + 12) % 12;

// Group the 15 keys into 12 clock slots; enharmonic keys (e.g. F#/Gb) merge.
const SLOTS: { major: string; minor: string; keys: KeyInfo[] }[] = Array.from(
  { length: 12 },
  (_, slot) => {
    const keys = CIRCLE_OF_FIFTHS.filter((k) => slotOf(k.position) === slot);
    return {
      major: keys.map((k) => k.major).join('/'),
      minor: keys.map((k) => `${k.relativeMinor}m`).join('/'),
      keys,
    };
  },
);

const CircleOfFifthsWheel: React.FC<CircleOfFifthsWheelProps> = ({ highlightMajor, size = 280 }) => {
  const cx = size / 2;
  const cy = size / 2;
  const majorR = size * 0.38;
  const minorR = size * 0.24;
  const markerR = size * 0.072;

  const highlightSlot =
    highlightMajor != null
      ? SLOTS.findIndex((s) => s.keys.some((k) => k.major === highlightMajor))
      : -1;

  const notes = highlightMajor ? getAccidentalNotes(highlightMajor) : [];
  const centerLabel = highlightMajor
    ? keySignatureLabel(highlightMajor)
    : 'Circle of Fifths';

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={
          highlightMajor
            ? `Circle of fifths with ${highlightMajor} major highlighted: ${keySignatureLabel(highlightMajor)}`
            : 'Circle of fifths reference'
        }
      >
        <circle cx={cx} cy={cy} r={size * 0.46} fill="none" stroke="var(--line)" strokeWidth={1} />
        {SLOTS.map((s, slot) => {
          const angle = (slot * 30 - 90) * (Math.PI / 180);
          const mx = cx + majorR * Math.cos(angle);
          const my = cy + majorR * Math.sin(angle);
          const nx = cx + minorR * Math.cos(angle);
          const ny = cy + minorR * Math.sin(angle);
          const isHi = slot === highlightSlot;
          return (
            <g key={slot}>
              {isHi && (
                <circle cx={mx} cy={my} r={markerR} fill="var(--accent)" />
              )}
              <text
                x={mx}
                y={my}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={size * 0.052}
                fontWeight={700}
                fill={isHi ? 'var(--on-accent)' : 'var(--fg-strong)'}
              >
                {s.major}
              </text>
              <text
                x={nx}
                y={ny}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={size * 0.04}
                fill="var(--fg-muted)"
              >
                {s.minor}
              </text>
            </g>
          );
        })}
        <text
          x={cx}
          y={cy - (highlightMajor ? size * 0.03 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.05}
          fontWeight={700}
          fill="var(--fg-strong)"
        >
          {highlightMajor ? `${highlightMajor} major` : centerLabel}
        </text>
        {highlightMajor && (
          <text
            x={cx}
            y={cy + size * 0.04}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size * 0.042}
            fontWeight={600}
            fill="var(--accent)"
          >
            {centerLabel}
          </text>
        )}
      </svg>
      {highlightMajor && notes.length > 0 && (
        <p className="mt-1 text-xs text-fg-muted text-center max-w-[18rem]">
          {notes.join(' · ')}
        </p>
      )}
    </div>
  );
};

export default CircleOfFifthsWheel;
