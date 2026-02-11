import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useGuitarStore } from '../stores/guitarStore';
import { useAudioStore } from '../stores/audioStore';
import { useThemeStore } from '../stores/themeStore';
import { FretPosition, NOTE_NAMES, normalizeNoteName } from '../types/guitar';
import { getNoteAtPosition } from '../utils/fretboardCalculations';
import { playNote, initAudio } from '../lib/audioEngine';

interface FretboardProps {
  onNoteClick?: (position: FretPosition, note: string) => void;
  interactive?: boolean;
  hideNoteNames?: boolean; // For exercises where we don't want to show the note
  revealedPositions?: FretPosition[]; // Positions where note names should be shown
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
  
  const { 
    stringCount, 
    tuning, 
    fretCount, 
    displayMode,
    highlightedPositions, 
    rootNote,
    showAllNotes 
  } = useGuitarStore();
  
  const { masterVolume } = useAudioStore();
  const { resolvedTheme } = useThemeStore();

  // Dynamic sizing based on container
  const STRING_SPACING = 32;
  const NUT_WIDTH = 10;
  const PADDING_Y = 45;
  const PADDING_X = 50;
  const DOT_FRETS = [3, 5, 7, 9, 12, 15, 17, 19, 21];
  const DOUBLE_DOT_FRETS = [12, 24];
  const DEGREE_NAMES = ['1', '\u266d2', '2', '\u266d3', '3', '4', '\u266d5', '5', '\u266d6', '6', '\u266d7', '7'];

  // Convert between visual row (Y position) and tuning array index
  // Visual: row 0 (top) = high E, row 5 (bottom) = low E
  // Tuning array: index 0 = low E, index 5 = high E
  const visualRowToStringIndex = (visualRow: number) => stringCount - 1 - visualRow;
  const stringIndexToVisualRow = (stringIndex: number) => stringCount - 1 - stringIndex;

  // Calculate fret width based on container width
  const availableWidth = containerWidth - PADDING_X * 2 - NUT_WIDTH;
  const FRET_WIDTH = Math.max(40, Math.min(60, availableWidth / fretCount));
  
  const canvasWidth = PADDING_X * 2 + NUT_WIDTH + FRET_WIDTH * fretCount;
  const canvasHeight = PADDING_Y * 2 + STRING_SPACING * (stringCount - 1);

  // Theme colors
  const colors = resolvedTheme === 'dark' ? {
    wood: '#1a1a2e',
    woodGradient: '#16213e',
    nut: '#4a5568',
    fret: '#718096',
    string: '#a0aec0',
    dot: '#2d3748',
    text: '#e2e8f0',
    textMuted: '#718096',
    noteHighlight: '#60a5fa',
    noteRoot: '#f87171',
    noteDefault: 'rgba(100, 116, 139, 0.4)',
  } : {
    wood: '#d4a574',
    woodGradient: '#c4956a',
    nut: '#f5f5dc',
    fret: '#b8b8b8',
    string: '#3d3d3d',
    dot: '#e8e8e8',
    text: '#374151',
    textMuted: '#6b7280',
    noteHighlight: '#3b82f6',
    noteRoot: '#ef4444',
    noteDefault: 'rgba(107, 114, 128, 0.3)',
  };

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

  const drawFretboard = useCallback((ctx: CanvasRenderingContext2D) => {
    const width = canvasWidth;
    const height = canvasHeight;
    
    // Clear and draw wood background with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, colors.wood);
    gradient.addColorStop(1, colors.woodGradient);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw subtle wood grain lines
    ctx.strokeStyle = resolvedTheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < height; i += 8) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i + Math.sin(i * 0.1) * 2);
      ctx.stroke();
    }
    
    // Draw nut with shadow
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.fillStyle = colors.nut;
    ctx.fillRect(PADDING_X, PADDING_Y - 8, NUT_WIDTH, STRING_SPACING * (stringCount - 1) + 16);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw frets with metallic effect
    for (let fret = 1; fret <= fretCount; fret++) {
      const x = PADDING_X + NUT_WIDTH + fret * FRET_WIDTH;
      
      // Fret shadow
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + 1, PADDING_Y - 6);
      ctx.lineTo(x + 1, PADDING_Y + STRING_SPACING * (stringCount - 1) + 6);
      ctx.stroke();
      
      // Fret highlight
      ctx.strokeStyle = colors.fret;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, PADDING_Y - 6);
      ctx.lineTo(x, PADDING_Y + STRING_SPACING * (stringCount - 1) + 6);
      ctx.stroke();
    }
    
    // Draw fret markers (dots)
    for (let fret = 1; fret <= fretCount; fret++) {
      if (DOT_FRETS.includes(fret)) {
        const x = PADDING_X + NUT_WIDTH + (fret - 0.5) * FRET_WIDTH;
        const y = PADDING_Y + STRING_SPACING * (stringCount - 1) / 2;
        
        ctx.fillStyle = colors.dot;
        
        if (DOUBLE_DOT_FRETS.includes(fret)) {
          ctx.beginPath();
          ctx.arc(x, y - STRING_SPACING * 0.8, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, y + STRING_SPACING * 0.8, 6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    
    // Draw strings with thickness variation
    // Visual row 0 (top) = high E (thinnest), row 5 (bottom) = low E (thickest)
    for (let visualRow = 0; visualRow < stringCount; visualRow++) {
      const y = PADDING_Y + visualRow * STRING_SPACING;
      // Thickness increases as we go down (higher visual row = thicker string)
      const thickness = 1 + visualRow * 0.4;
      
      // String shadow
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = thickness + 1;
      ctx.beginPath();
      ctx.moveTo(PADDING_X, y + 1);
      ctx.lineTo(width - PADDING_X + 10, y + 1);
      ctx.stroke();
      
      // String
      ctx.strokeStyle = colors.string;
      ctx.lineWidth = thickness;
      ctx.beginPath();
      ctx.moveTo(PADDING_X, y);
      ctx.lineTo(width - PADDING_X + 10, y);
      ctx.stroke();
    }
    
    // Draw fret numbers
    ctx.fillStyle = colors.textMuted;
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (let fret = 1; fret <= fretCount; fret++) {
      const x = PADDING_X + NUT_WIDTH + (fret - 0.5) * FRET_WIDTH;
      ctx.fillText(fret.toString(), x, height - 10);
    }
    
    // Draw string labels (tuning)
    // Visual row 0 (top) = high E (thinnest), row 5 (bottom) = low E (thickest)
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    for (let visualRow = 0; visualRow < stringCount; visualRow++) {
      const y = PADDING_Y + visualRow * STRING_SPACING + 5;
      const stringIndex = visualRowToStringIndex(visualRow);
      const noteName = tuning.notes[stringIndex] || '';
      ctx.fillText(noteName.replace(/\d/, ''), PADDING_X - 10, y);
    }
    
    // Draw highlighted notes
    highlightedPositions.forEach(pos => {
      const shouldShowName = !hideNoteNames || isPositionRevealed(pos);
      drawNote(ctx, pos, true, shouldShowName);
    });
    
    // Draw clicked note (temporary highlight when user clicks to hear a note)
    if (clickedPosition && !highlightedPositions.some(p => p.string === clickedPosition.string && p.fret === clickedPosition.fret)) {
      drawNote(ctx, clickedPosition, true, true, true); // isClicked = true for special styling
    }
    
    // Draw all notes if enabled
    if (showAllNotes) {
      for (let string = 0; string < stringCount; string++) {
        for (let fret = 0; fret <= Math.min(fretCount, 12); fret++) {
          const pos = { string, fret };
          const isClickedPos = clickedPosition && clickedPosition.string === string && clickedPosition.fret === fret;
          if (!highlightedPositions.some(p => p.string === string && p.fret === fret) && !isClickedPos) {
            drawNote(ctx, pos, false, !hideNoteNames);
          }
        }
      }
    }
  }, [stringCount, tuning, fretCount, highlightedPositions, showAllNotes, canvasWidth, canvasHeight, colors, hideNoteNames, revealedPositions, resolvedTheme, clickedPosition, displayMode, rootNote]);

  const drawNote = (
    ctx: CanvasRenderingContext2D, 
    position: FretPosition, 
    highlighted: boolean,
    showName: boolean = true,
    isClicked: boolean = false
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
    // Normalize note name to use sharps (e.g., Gb -> F#) for consistent display
    const noteName = normalizeNoteName(note.replace(/\d/, ''));
    const isRoot = rootNote && noteName === normalizeNoteName(rootNote);
    
    // Draw shadow
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    
    // Draw circle with slightly larger size for clicked notes
    const radius = isClicked ? 15 : 13;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    
    if (isClicked) {
      // Bright green/teal for clicked notes - stands out clearly
      ctx.fillStyle = '#10b981';
    } else if (isRoot) {
      ctx.fillStyle = colors.noteRoot;
    } else if (highlighted) {
      ctx.fillStyle = colors.noteHighlight;
    } else {
      ctx.fillStyle = colors.noteDefault;
    }
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    
    // Draw note name or question mark
    ctx.fillStyle = highlighted || isRoot || isClicked ? '#fff' : colors.textMuted;
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (!showName && highlighted) {
      // Show question mark for hidden notes
      ctx.fillText('?', x, y);
    } else if (showName) {
      let displayText: string = noteName;
      if ((displayMode === 'intervals' || displayMode === 'degrees') && rootNote) {
        const normalizedRoot = normalizeNoteName(rootNote);
        const rootIndex = NOTE_NAMES.indexOf(normalizedRoot);
        const noteIndex = NOTE_NAMES.indexOf(noteName);
        if (rootIndex !== -1 && noteIndex !== -1) {
          const interval = (noteIndex - rootIndex + 12) % 12;
          if (displayMode === 'degrees') {
            displayText = DEGREE_NAMES[interval];
          } else {
            const intervalNames = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
            displayText = intervalNames[interval];
          }
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
    // Use logical coordinates (CSS pixels), not physical canvas pixels
    // The canvas is scaled by DPR for sharp rendering, but ctx.scale(dpr, dpr) 
    // means all drawing uses logical coordinates. Click detection should match.
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Calculate which fret was clicked
    let fret = 0;
    if (x > PADDING_X + NUT_WIDTH) {
      fret = Math.floor((x - PADDING_X - NUT_WIDTH) / FRET_WIDTH) + 1;
    }
    
    // Calculate which string was clicked
    // First get the visual row (0 = top = high E), then convert to string index
    const visualRow = Math.round((y - PADDING_Y) / STRING_SPACING);
    const string = visualRowToStringIndex(visualRow);
    
    if (string >= 0 && string < stringCount && fret >= 0 && fret <= fretCount) {
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
  }, [interactive, stringCount, fretCount, tuning, masterVolume, onNoteClick, FRET_WIDTH]);

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
    if (highlightedPositions.length === 0) {
      return 'No notes highlighted';
    }
    const noteDescriptions = highlightedPositions.map(pos => {
      const note = getNoteAtPosition(pos, tuning, stringCount);
      const noteName = normalizeNoteName(note.replace(/\d/, ''));
      // String numbering: string index 0 = low E = String 6, index 5 = high E = String 1
      // Standard guitar string numbering: String 1 = high E, String 6 = low E
      return `${noteName} on string ${stringCount - pos.string}, fret ${pos.fret}`;
    });
    return `Highlighted notes: ${noteDescriptions.join('; ')}`;
  };

  return (
    <div ref={containerRef} className="fretboard-container w-full">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`${interactive ? 'cursor-pointer' : ''} rounded-lg`}
        style={{
          maxWidth: '100%',
          height: 'auto',
        }}
        role="img"
        aria-label={`Guitar fretboard with ${stringCount} strings and ${fretCount} frets. ${getHighlightedNotesDescription()}`}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={interactive ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            // Announce to screen reader that the fretboard is interactive
          }
        } : undefined}
      />
      {/* Visually hidden description for screen readers */}
      <span className="sr-only">
        {getHighlightedNotesDescription()}
      </span>
    </div>
  );
};

export default Fretboard;