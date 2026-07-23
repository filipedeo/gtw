import React from 'react';
import type { ChordShape } from '../lib/chordLibrary';

/**
 * Chord-box diagram rendered as inline SVG. Draws the nut (or a fret label for
 * barre shapes), 6 strings, 5 fret spaces, finger dots, an "x" for muted
 * strings and an "o" for open strings, plus an optional barre cap.
 */
export interface ChordDiagramProps {
  chord: ChordShape;
  /** Pixel width of the diagram. Height is derived. */
  width?: number;
  /** Highlighted ring colour for dots (defaults to accent token). */
  highlight?: boolean;
  className?: string;
}

const STRINGS = 6;
const FRETS = 5;

export const ChordDiagram: React.FC<ChordDiagramProps> = ({
  chord,
  width = 150,
  highlight = false,
  className,
}) => {
  // Layout metrics (derived from width so the diagram scales).
  const padX = width * 0.12;
  const padTop = width * 0.26; // room for x/o markers + name
  const padBottom = width * 0.06;
  const gridW = width - padX * 2;
  const stringGap = gridW / (STRINGS - 1);
  const fretH = stringGap * 1.25;
  const gridH = fretH * FRETS;
  const height = padTop + gridH + padBottom;

  const left = padX;
  const right = padX + gridW;
  const top = padTop;
  const bottom = padTop + gridH;

  const stringX = (i: number) => left + i * stringGap; // i=0 low-E (left)
  const fretY = (f: number) => top + f * fretH; // f=0..FRETS

  const isBarre = chord.baseFret > 1;
  const dotFill = highlight ? 'var(--accent)' : 'var(--fg-strong)';
  const stroke = 'var(--fg-muted)';
  const nutColor = 'var(--fg-strong)';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${chord.name} chord diagram`}
      className={className}
    >
      {/* Chord name */}
      <text
        x={width / 2}
        y={padTop * 0.45}
        textAnchor="middle"
        fontSize={width * 0.12}
        fontWeight={600}
        fill="var(--fg-strong)"
        fontFamily="inherit"
      >
        {chord.name}
      </text>

      {/* Fret label for barre/high positions */}
      {isBarre && (
        <text
          x={left - stringGap * 0.55}
          y={top + fretH * 0.7}
          textAnchor="middle"
          fontSize={width * 0.09}
          fill="var(--fg-muted)"
          fontFamily="inherit"
        >
          {chord.baseFret}fr
        </text>
      )}

      {/* Nut (thick) for open-position chords; thin top fret line for barre */}
      {isBarre ? (
        <line x1={left} y1={top} x2={right} y2={top} stroke={stroke} strokeWidth={1.5} />
      ) : (
        <rect
          x={left - 1}
          y={top - 3}
          width={gridW + 2}
          height={4}
          fill={nutColor}
        />
      )}

      {/* Fret lines */}
      {Array.from({ length: FRETS + 1 }).map((_, f) => (
        <line
          key={`fret-${f}`}
          x1={left}
          y1={fretY(f)}
          x2={right}
          y2={fretY(f)}
          stroke={stroke}
          strokeWidth={1}
        />
      ))}

      {/* Strings */}
      {Array.from({ length: STRINGS }).map((_, s) => (
        <line
          key={`string-${s}`}
          x1={stringX(s)}
          y1={top}
          x2={stringX(s)}
          y2={bottom}
          stroke={stroke}
          strokeWidth={1}
        />
      ))}

      {/* Open / muted markers above the nut */}
      {chord.frets.map((fret, s) => {
        const x = stringX(s);
        const y = top - width * 0.07;
        if (fret === -1) {
          // muted: x
          const r = width * 0.035;
          return (
            <g key={`mark-${s}`}>
              <line x1={x - r} y1={y - r} x2={x + r} y2={y + r} stroke={stroke} strokeWidth={1.5} />
              <line x1={x - r} y1={y + r} x2={x + r} y2={y - r} stroke={stroke} strokeWidth={1.5} />
            </g>
          );
        }
        if (fret === 0) {
          // open: o
          return (
            <circle
              key={`mark-${s}`}
              cx={x}
              cy={y}
              r={width * 0.035}
              fill="none"
              stroke={stroke}
              strokeWidth={1.5}
            />
          );
        }
        return null;
      })}

      {/* Barre cap */}
      {chord.barre && (
        <rect
          x={stringX(chord.barre.fromString) - width * 0.03}
          y={fretY(chord.barre.fret - chord.baseFret + 1) - fretH * 0.32}
          width={(chord.barre.toString - chord.barre.fromString) * stringGap + width * 0.06}
          height={fretH * 0.64}
          rx={fretH * 0.32}
          fill={dotFill}
          opacity={0.85}
        />
      )}

      {/* Finger dots */}
      {chord.frets.map((fret, s) => {
        if (fret <= 0) return null;
        const fretIndex = fret - chord.baseFret + 1; // 1-based within diagram
        if (fretIndex < 1 || fretIndex > FRETS) return null;
        const cx = stringX(s);
        const cy = fretY(fretIndex - 1) + fretH / 2;
        const r = width * 0.05;
        const finger = chord.fingers[s];
        return (
          <g key={`dot-${s}`}>
            <circle cx={cx} cy={cy} r={r} fill={dotFill} />
            {finger > 0 && (
              <text
                x={cx}
                y={cy + r * 0.35}
                textAnchor="middle"
                fontSize={r * 1.1}
                fontWeight={700}
                fill="var(--surface)"
                fontFamily="inherit"
              >
                {finger}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

export default ChordDiagram;
