import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useGuitarStore } from '../stores/guitarStore';
import { useAudioStore } from '../stores/audioStore';
import { useThemeStore } from '../stores/themeStore';
import { FretPosition, NOTE_NAMES, normalizeNoteName } from '../types/guitar';
import { getNoteAtPosition } from '../utils/fretboardCalculations';
import { playNote, initAudio } from '../lib/audioEngine';
import { FRETBOARD_THEME_COLORS } from '../constants/fretboardTheme';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { NOTE_NAMES_FLAT, getKeySpelledNotes } from '../lib/theoryEngine';

interface FretboardProps {
  onNoteClick?: (position: FretPosition, note: string) => void;
  interactive?: boolean;
  hideNoteNames?: boolean; // For exercises where we don't want to show the note
  revealedPositions?: FretPosition[]; // Positions where note names should be shown
}

/**
 * Note-name spelling helpers.
 *
 * When an active key/scale context is available (threaded via the store as
 * `scaleContext`), notes are spelled with the exact key-signature spelling for
 * that key/mode (computed in the theory engine via tonal). This yields the
 * correct accidentals for every key, including the edge cases that a fixed
 * sharp/flat table cannot represent (E#/B# in sharp keys, Fb/Cb in flat keys).
 *
 * When there is NO scale context (e.g. note-identification, or the shared board
 * with no active exercise), the helpers below provide a conservative fallback:
 * notes are spelled according to the tonic's key convention — flat keys use
 * flats, sharp keys use sharps — matching the app's historical behavior.
 */

// Chromas of the keys the app spells with flats: Db(1), Eb(3), F(5), Ab(8), Bb(10).
// The only accidental key the app spells with a sharp is F# (chroma 6).
const FLAT_KEY_CHROMAS = new Set([1, 3, 5, 8, 10]);

const LETTER_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
// Semitone offset above the tonic for each major-scale degree number (1..7).
const MAJOR_DEGREE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
// Safe chromatic fallbacks (used when a note cannot be spelled cleanly, e.g. the
// leading tone of F# major is E#, which NOTE_NAMES cannot represent).
const CHROMATIC_DEGREE_NAMES = ['1', '\u266d2', '2', '\u266d3', '3', '4', '\u266d5', '5', '\u266d6', '6', '\u266d7', '7'];
const CHROMATIC_INTERVAL_NAMES = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

/** Whether notes should be spelled with flats for the given (tonic) root note. */
function preferFlatsForRoot(rootNote: string | null): boolean {
  if (!rootNote) return false;
  const chroma = NOTE_NAMES.indexOf(normalizeNoteName(rootNote));
  return FLAT_KEY_CHROMAS.has(chroma);
}

/** Spell a chroma (0-11) using flats or sharps. */
function spellChroma(chroma: number, useFlats: boolean): string {
  return (useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES)[chroma];
}

/**
 * Derive a scale-degree / interval label from the key-aware spelling of the
 * root and the target note. The interval NUMBER comes from the letter names
 * and the accidental from the semitone distance, so the overlay label always
 * agrees with the note name shown on the fretboard (rather than being computed
 * purely chromatically, which mislabels e.g. #4 as b5 or #5 as b6).
 */
function getDegreeLabel(
  rootSpelling: string,
  noteSpelling: string,
  chromaInterval: number,
  mode: 'degrees' | 'intervals'
): string {
  const chromaticFallback = mode === 'intervals'
    ? CHROMATIC_INTERVAL_NAMES[chromaInterval]
    : CHROMATIC_DEGREE_NAMES[chromaInterval];

  const rootLetterIdx = LETTER_ORDER.indexOf(rootSpelling[0]);
  const noteLetterIdx = LETTER_ORDER.indexOf(noteSpelling[0]);
  if (rootLetterIdx === -1 || noteLetterIdx === -1) return chromaticFallback;

  const degreeNumber = ((noteLetterIdx - rootLetterIdx + 7) % 7) + 1; // 1..7
  let alteration = chromaInterval - MAJOR_DEGREE_SEMITONES[degreeNumber - 1];
  // Keep the accidental sane when the interval wraps across the octave.
  if (alteration > 6) alteration -= 12;
  if (alteration < -6) alteration += 12;

  // Guard against enharmonic gaps: NOTE_NAMES/NOTE_NAMES_FLAT cannot express
  // notes such as E#/Cb, so a mis-spelled note could yield a nonsensical label
  // (e.g. 'b1'). If the letter-derived degree is degenerate (a non-unison mapped
  // to degree 1, or a double accidental), use the plain chromatic name instead.
  if ((degreeNumber === 1 && chromaInterval !== 0) || alteration < -1 || alteration > 1) {
    return chromaticFallback;
  }

  if (mode === 'intervals') {
    if (degreeNumber === 1 && alteration === 0) return 'R';
    const acc = alteration > 0 ? '#'.repeat(alteration) : alteration < 0 ? 'b'.repeat(-alteration) : '';
    return `${acc}${degreeNumber}`;
  }
  // Degrees mode uses unicode accidentals to match prior styling.
  const acc = alteration > 0 ? '\u266f'.repeat(alteration) : alteration < 0 ? '\u266d'.repeat(-alteration) : '';
  return `${acc}${degreeNumber}`;
}

const Fretboard: React.FC<FretboardProps> = ({ 
  onNoteClick, 
  interactive = true,
  hideNoteNames = false,
  revealedPositions = []
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [clickedPosition, setClickedPosition] = useState<FretPosition | null>(null);
  const [hoverPosition, setHoverPosition] = useState<FretPosition | null>(null);
  
  const {
    stringCount,
    tuning,
    fretCount,
    displayMode,
    highlightedPositions,
    secondaryHighlightedPositions,
    maskedPositions,
    rootNote,
    scaleContext,
    showAllNotes
  } = useGuitarStore();
  
  const { masterVolume } = useAudioStore();
  const { resolvedTheme } = useThemeStore();
  const { isMobile } = useBreakpoint();

  // On mobile, cap fret rendering at 12 for better readability
  const effectiveFretCount = isMobile ? Math.min(fretCount, 12) : fretCount;

  // Dynamic sizing based on container
  const STRING_SPACING = 32;
  const NUT_WIDTH = 10;
  const PADDING_Y = 45;
  const PADDING_X = 50;
  const DOT_FRETS = [3, 5, 7, 9, 12, 15, 17, 19, 21];
  const DOUBLE_DOT_FRETS = [12, 24];

  // Convert between visual row (Y position) and tuning array index
  // Visual: row 0 (top) = high E, row 5 (bottom) = low E
  // Tuning array: index 0 = low E, index 5 = high E
  const visualRowToStringIndex = (visualRow: number) => stringCount - 1 - visualRow;
  const stringIndexToVisualRow = (stringIndex: number) => stringCount - 1 - stringIndex;

  // Calculate fret width based on container width
  const availableWidth = containerWidth - PADDING_X * 2 - NUT_WIDTH;
  const FRET_WIDTH = Math.max(40, Math.min(60, availableWidth / effectiveFretCount));

  const canvasWidth = PADDING_X * 2 + NUT_WIDTH + FRET_WIDTH * effectiveFretCount;
  const canvasHeight = PADDING_Y * 2 + STRING_SPACING * (stringCount - 1);

  // Theme colors
  const colors = FRETBOARD_THEME_COLORS[resolvedTheme];

  // Chroma -> note-name spelling table derived from the active key/scale context
  // (via tonal), so accidentals are spelled correctly for the key (e.g. Bb in F
  // major, E# in F# major, Cb in Gb major). Null when there is no scale context;
  // in that case drawNote falls back to spelling by the root's key signature.
  const spellingTable = useMemo(
    () => (scaleContext ? getKeySpelledNotes(scaleContext.root, scaleContext.name) : null),
    [scaleContext]
  );

  // Spell a chroma (0-11) using the active key/scale context when available,
  // otherwise the root's key-signature fallback. Shared by the visible canvas
  // labels and the screen-reader description so both announce the same names.
  const spellChromaForContext = (chroma: number, fallbackName: string): string =>
    chroma === -1
      ? fallbackName
      : (spellingTable && spellingTable[chroma]) || spellChroma(chroma, preferFlatsForRoot(rootNote));

  // Observe container width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(container);
    setContainerWidth(container.offsetWidth);

    return () => observer.disconnect();
  }, []);

  const isPositionRevealed = (pos: FretPosition): boolean => {
    return revealedPositions.some(p => p.string === pos.string && p.fret === pos.fret);
  };

  // Positions masked globally via the store (e.g. the unanswered Note ID
  // target). These render as "?" on every board — including the persistent
  // top board that does NOT pass hideNoteNames — unless locally revealed.
  const isPositionMasked = (pos: FretPosition): boolean => {
    return maskedPositions.some(p => p.string === pos.string && p.fret === pos.fret);
  };

  const drawFretboard = useCallback((ctx: CanvasRenderingContext2D) => {
    const width = canvasWidth;
    const height = canvasHeight;
    
    // Clear and draw wood background with gradient (rosewood/ebony look)
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, colors.wood);
    gradient.addColorStop(0.5, colors.woodGradient);
    gradient.addColorStop(1, colors.wood);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw wood grain lines (horizontal, with subtle curves)
    ctx.strokeStyle = colors.woodGrain;
    ctx.lineWidth = 1;
    for (let i = 0; i < height; i += 6) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      for (let xp = 0; xp < width; xp += 20) {
        ctx.lineTo(xp, i + Math.sin(xp * 0.008 + i * 0.05) * 3);
      }
      ctx.stroke();
    }
    // Vertical grain accent for depth
    ctx.strokeStyle = colors.woodGrain;
    for (let j = 0; j < width; j += 40) {
      ctx.beginPath();
      ctx.moveTo(j, 0);
      ctx.lineTo(j + Math.sin(j * 0.1) * 2, height);
      ctx.stroke();
    }

    // Draw nut with 3D bevel effect
    const nutX = PADDING_X;
    const nutTop = PADDING_Y - 8;
    const nutH = STRING_SPACING * (stringCount - 1) + 16;
    // Shadow
    ctx.shadowColor = colors.nutShadow;
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = colors.nut;
    ctx.fillRect(nutX, nutTop, NUT_WIDTH, nutH);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    // Nut highlight (left edge catch light)
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(nutX, nutTop, 2, nutH);

    // Draw frets with metallic shine
    const fretTop = PADDING_Y - 6;
    const fretBottom = PADDING_Y + STRING_SPACING * (stringCount - 1) + 6;
    for (let fret = 1; fret <= effectiveFretCount; fret++) {
      const x = PADDING_X + NUT_WIDTH + fret * FRET_WIDTH;

      // Fret shadow (right side)
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + 1, fretTop);
      ctx.lineTo(x + 1, fretBottom);
      ctx.stroke();

      // Main fret wire
      ctx.strokeStyle = colors.fret;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, fretTop);
      ctx.lineTo(x, fretBottom);
      ctx.stroke();

      // Shine highlight (left edge)
      ctx.strokeStyle = colors.fretShine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 1, fretTop);
      ctx.lineTo(x - 1, fretBottom);
      ctx.stroke();
    }

    // Draw fret marker inlays (pearl-style dots)
    for (let fret = 1; fret <= effectiveFretCount; fret++) {
      if (!DOT_FRETS.includes(fret)) continue;
      const x = PADDING_X + NUT_WIDTH + (fret - 0.5) * FRET_WIDTH;
      const centerY = PADDING_Y + STRING_SPACING * (stringCount - 1) / 2;
      const dotRadius = 7;

      const drawInlay = (cx: number, cy: number) => {
        // Outer glow
        ctx.beginPath();
        ctx.arc(cx, cy, dotRadius + 3, 0, Math.PI * 2);
        ctx.fillStyle = colors.dotGlow;
        ctx.fill();
        // Pearl body with radial gradient
        const pearlGrad = ctx.createRadialGradient(cx - 1, cy - 1, 1, cx, cy, dotRadius);
        pearlGrad.addColorStop(0, resolvedTheme === 'dark' ? '#e8dcc0' : '#fffaf0');
        pearlGrad.addColorStop(0.7, colors.dot);
        pearlGrad.addColorStop(1, resolvedTheme === 'dark' ? '#8a7d60' : '#c8c0b0');
        ctx.beginPath();
        ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = pearlGrad;
        ctx.fill();
        // Subtle border
        ctx.strokeStyle = resolvedTheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      };

      if (DOUBLE_DOT_FRETS.includes(fret)) {
        drawInlay(x, centerY - STRING_SPACING * 0.8);
        drawInlay(x, centerY + STRING_SPACING * 0.8);
      } else {
        drawInlay(x, centerY);
      }
    }

    // Draw strings with metallic sheen
    // Visual row 0 (top) = high E (thinnest), row N (bottom) = low string (thickest)
    for (let visualRow = 0; visualRow < stringCount; visualRow++) {
      const y = PADDING_Y + visualRow * STRING_SPACING;
      const thickness = 1 + visualRow * 0.4;

      // String shadow
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = thickness + 1.5;
      ctx.beginPath();
      ctx.moveTo(PADDING_X, y + 1);
      ctx.lineTo(width - PADDING_X + 10, y + 1);
      ctx.stroke();

      // Main string body
      ctx.strokeStyle = colors.string;
      ctx.lineWidth = thickness;
      ctx.beginPath();
      ctx.moveTo(PADDING_X, y);
      ctx.lineTo(width - PADDING_X + 10, y);
      ctx.stroke();

      // Metallic highlight on top edge
      ctx.strokeStyle = colors.stringShine;
      ctx.lineWidth = Math.max(0.5, thickness * 0.3);
      ctx.beginPath();
      ctx.moveTo(PADDING_X, y - thickness * 0.3);
      ctx.lineTo(width - PADDING_X + 10, y - thickness * 0.3);
      ctx.stroke();
    }

    // Draw fret numbers
    ctx.fillStyle = colors.fretNumber;
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let fret = 1; fret <= effectiveFretCount; fret++) {
      const x = PADDING_X + NUT_WIDTH + (fret - 0.5) * FRET_WIDTH;
      // Only show numbers at landmark frets to reduce clutter
      if (DOT_FRETS.includes(fret) || fret === 1) {
        ctx.fillText(fret.toString(), x, height - 18);
      }
    }
    
    // Draw string labels (tuning)
    // Visual row 0 (top) = high E (thinnest), row 5 (bottom) = low E (thickest)
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let visualRow = 0; visualRow < stringCount; visualRow++) {
      const y = PADDING_Y + visualRow * STRING_SPACING;
      const stringIndex = visualRowToStringIndex(visualRow);
      const noteName = tuning.notes[stringIndex] || '';
      ctx.fillText(noteName.replace(/\d/, ''), PADDING_X - 10, y);
    }
    
    // Helper to check if a position is currently hovered
    const isHovered = (pos: FretPosition): boolean =>
      hoverPosition !== null && hoverPosition.string === pos.string && hoverPosition.fret === pos.fret;

    // Draw highlighted notes (filter to visible fret range)
    highlightedPositions.forEach(pos => {
      if (pos.fret > effectiveFretCount) return;
      const shouldShowName = (!hideNoteNames && !isPositionMasked(pos)) || isPositionRevealed(pos);
      drawNote(ctx, pos, true, shouldShowName, false, false, isHovered(pos));
    });

    // Draw secondary highlighted notes (lighter color for scale notes outside shape)
    secondaryHighlightedPositions.forEach(pos => {
      if (pos.fret > effectiveFretCount) return;
      // Skip if already drawn as primary highlight
      if (!highlightedPositions.some(p => p.string === pos.string && p.fret === pos.fret)) {
        const shouldShowName = (!hideNoteNames && !isPositionMasked(pos)) || isPositionRevealed(pos);
        drawNote(ctx, pos, false, shouldShowName, false, true, isHovered(pos)); // isSecondary = true
      }
    });

    // Draw clicked note (temporary highlight when user clicks to hear a note)
    if (clickedPosition && clickedPosition.fret <= effectiveFretCount && !highlightedPositions.some(p => p.string === clickedPosition.string && p.fret === clickedPosition.fret)) {
      drawNote(ctx, clickedPosition, true, true, true); // isClicked = true for special styling
    }

    // Draw all notes if enabled
    if (showAllNotes) {
      for (let string = 0; string < stringCount; string++) {
        for (let fret = 0; fret <= effectiveFretCount; fret++) {
          const pos = { string, fret };
          const isClickedPos = clickedPosition && clickedPosition.string === string && clickedPosition.fret === fret;
          if (!highlightedPositions.some(p => p.string === string && p.fret === fret) && !isClickedPos) {
            drawNote(ctx, pos, false, !hideNoteNames, false, false, isHovered(pos));
          }
        }
      }
    }
  }, [stringCount, tuning, effectiveFretCount, highlightedPositions, secondaryHighlightedPositions, maskedPositions, showAllNotes, canvasWidth, canvasHeight, colors, hideNoteNames, revealedPositions, resolvedTheme, clickedPosition, displayMode, rootNote, spellingTable, hoverPosition]);

  const drawNote = (
    ctx: CanvasRenderingContext2D,
    position: FretPosition,
    highlighted: boolean,
    showName: boolean = true,
    isClicked: boolean = false,
    isSecondary: boolean = false,
    isHover: boolean = false
  ) => {
    const { string, fret } = position;
    const x = fret === 0
      ? PADDING_X + NUT_WIDTH / 2
      : PADDING_X + NUT_WIDTH + (fret - 0.5) * FRET_WIDTH;
    // Convert string index to visual row for Y position
    // string index 0 = low E = visual row at bottom
    // string index 5 = high E = visual row at top
    const visualRow = stringIndexToVisualRow(string);
    const y = PADDING_Y + visualRow * STRING_SPACING;

    const note = getNoteAtPosition(position, tuning, stringCount);
    // Normalized (sharp) pitch class — used for root comparison and interval math.
    const noteName = normalizeNoteName(note.replace(/\d/, ''));
    const chroma = NOTE_NAMES.indexOf(noteName);
    // Spell the note for display. With an active key/scale context, use its exact
    // key-signature spelling (e.g. Bb, E#, Cb); otherwise fall back to spelling by
    // the root's key signature (flats in flat keys).
    const displayNoteName = spellChromaForContext(chroma, noteName);
    const isRoot = rootNote && noteName === normalizeNoteName(rootNote);

    // Reset shadow offsets to prevent leak from nut drawing or prior draw calls
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Draw hover glow effect behind the note circle
    if (isHover) {
      ctx.save();
      ctx.shadowColor = isRoot ? 'rgba(248, 113, 113, 0.7)' : 'rgba(96, 165, 250, 0.7)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.01)'; // nearly invisible fill to trigger shadow
      ctx.fill();
      ctx.restore();
    }

    // Draw drop shadow for the note circle
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw circle with slightly larger size for clicked or hovered notes
    const radius = isClicked ? 15 : isHover ? 15 : 13;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);

    if (isClicked) {
      // Bright green/teal for clicked notes - stands out clearly
      ctx.fillStyle = '#10b981';
    } else if (isSecondary) {
      ctx.fillStyle = resolvedTheme === 'dark' ? 'rgba(96, 165, 250, 0.25)' : 'rgba(59, 130, 246, 0.2)';
    } else if (isRoot) {
      ctx.fillStyle = colors.noteRoot;
    } else if (highlighted) {
      ctx.fillStyle = colors.noteHighlight;
    } else {
      ctx.fillStyle = colors.noteDefault;
    }
    ctx.fill();

    // Reset all shadow state after drawing the circle
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw note name or question mark
    ctx.fillStyle = highlighted || isRoot || isClicked ? '#fff' : isSecondary ? (resolvedTheme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)') : colors.textMuted;
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (!showName && highlighted) {
      // Show question mark for hidden notes
      ctx.fillText('?', x, y);
    } else if (showName) {
      let displayText: string = displayNoteName;
      if ((displayMode === 'intervals' || displayMode === 'degrees') && rootNote && chroma !== -1) {
        const rootChroma = NOTE_NAMES.indexOf(normalizeNoteName(rootNote));
        if (rootChroma !== -1) {
          const rootSpelling = spellChromaForContext(rootChroma, noteName);
          const chromaInterval = (chroma - rootChroma + 12) % 12;
          displayText = getDegreeLabel(rootSpelling, displayNoteName, chromaInterval, displayMode);
        }
      }
      ctx.fillText(displayText, x, y);
    }
  };

  const handleCanvasClick = useCallback(async (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    await initAudio();
    
    const rect = canvas.getBoundingClientRect();
    // Scale click coordinates from rendered CSS size to logical canvas coordinates.
    // The canvas may be rendered smaller than canvasWidth/canvasHeight due to
    // CSS constraints (e.g., maxWidth: 100%), so we must map accordingly.
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Ignore clicks in the label region left of the nut
    if (x < PADDING_X) return;

    // Calculate which fret was clicked
    let fret = 0;
    if (x > PADDING_X + NUT_WIDTH) {
      fret = Math.floor((x - PADDING_X - NUT_WIDTH) / FRET_WIDTH) + 1;
    }
    
    // Calculate which string was clicked
    // First get the visual row (0 = top = high E), then convert to string index
    const visualRow = Math.round((y - PADDING_Y) / STRING_SPACING);
    const string = visualRowToStringIndex(visualRow);
    
    if (string >= 0 && string < stringCount && fret >= 0 && fret <= effectiveFretCount) {
      const position: FretPosition = { string, fret };
      const note = getNoteAtPosition(position, tuning, stringCount);
      
      // Show the clicked note temporarily
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      setClickedPosition(position);

      // Play the note
      playNote(note, { duration: 1.5, velocity: masterVolume * 0.8 });

      // Clear the clicked position after the note finishes playing
      clickTimeoutRef.current = setTimeout(() => {
        setClickedPosition(null);
        clickTimeoutRef.current = null;
      }, 1500);
      
      // Callback
      if (onNoteClick) {
        onNoteClick(position, note);
      }
    }
  }, [interactive, stringCount, effectiveFretCount, tuning, masterVolume, onNoteClick, FRET_WIDTH, canvasWidth, canvasHeight]);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) {
      setHoverPosition(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Ignore hover in the label region left of the nut
    if (x < PADDING_X) {
      setHoverPosition(null);
      return;
    }

    let fret = 0;
    if (x > PADDING_X + NUT_WIDTH) {
      fret = Math.floor((x - PADDING_X - NUT_WIDTH) / FRET_WIDTH) + 1;
    }

    const visualRow = Math.round((y - PADDING_Y) / STRING_SPACING);
    const string = visualRowToStringIndex(visualRow);

    if (string >= 0 && string < stringCount && fret >= 0 && fret <= effectiveFretCount) {
      const pos: FretPosition = { string, fret };
      // Only show hover effect if this position has a highlighted note
      const isHighlighted = highlightedPositions.some(p => p.string === pos.string && p.fret === pos.fret)
        || secondaryHighlightedPositions.some(p => p.string === pos.string && p.fret === pos.fret)
        || showAllNotes;
      if (isHighlighted) {
        setHoverPosition(pos);
      } else {
        setHoverPosition(null);
      }
    } else {
      setHoverPosition(null);
    }
  }, [interactive, stringCount, effectiveFretCount, highlightedPositions, secondaryHighlightedPositions, showAllNotes, FRET_WIDTH, canvasWidth, canvasHeight]);

  const handleCanvasMouseLeave = useCallback(() => {
    setHoverPosition(null);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size with device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    ctx.scale(dpr, dpr);
    
    drawFretboard(ctx);
  }, [drawFretboard, canvasWidth, canvasHeight]);

  // Generate description of highlighted notes for screen readers
  const getHighlightedNotesDescription = (): string => {
    if (highlightedPositions.length === 0 && secondaryHighlightedPositions.length === 0) {
      return 'No notes highlighted';
    }
    const describePositions = (positions: FretPosition[]) =>
      positions.map(pos => {
        const stringLabel = stringCount - pos.string;
        // Mask the note name for positions the visible renderer draws as "?"
        // (globally masked via the store and not locally revealed — e.g. the
        // unanswered Note ID target). Reuses the same predicate the canvas uses
        // so screen readers don't leak the answer that is hidden on-screen.
        if (isPositionMasked(pos) && !isPositionRevealed(pos)) {
          return `? on string ${stringLabel}, fret ${pos.fret}`;
        }
        const note = getNoteAtPosition(pos, tuning, stringCount);
        const noteName = normalizeNoteName(note.replace(/\d/, ''));
        // Use the same scale-aware spelling as the visible labels so screen
        // readers announce the correct note names (e.g. Bb, E#, Cb) instead of
        // a fixed sharp table, falling back to the key-signature spelling when
        // there is no active scale context.
        const chroma = NOTE_NAMES.indexOf(noteName);
        const spelled = spellChromaForContext(chroma, noteName);
        return `${spelled} on string ${stringLabel}, fret ${pos.fret}`;
      });
    const parts: string[] = [];
    if (highlightedPositions.length > 0) {
      parts.push(`Highlighted notes: ${describePositions(highlightedPositions).join('; ')}`);
    }
    if (secondaryHighlightedPositions.length > 0) {
      parts.push(`Additional highlighted notes: ${describePositions(secondaryHighlightedPositions).join('; ')}`);
    }
    return parts.join('. ');
  };

  return (
    <div ref={containerRef} className="fretboard-container w-full">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
        className={`${interactive ? 'cursor-pointer' : ''} rounded-lg`}
        style={{
          maxWidth: '100%',
          height: `${canvasHeight}px`,
          aspectRatio: `${canvasWidth} / ${canvasHeight}`,
        }}
        role="img"
        aria-label={`Guitar fretboard with ${stringCount} strings and ${effectiveFretCount} frets. ${getHighlightedNotesDescription()}`}
        tabIndex={interactive ? 0 : undefined}
      />
      {/* Visually hidden description for screen readers */}
      <span className="sr-only">
        {getHighlightedNotesDescription()}
      </span>
    </div>
  );
};

export default Fretboard;