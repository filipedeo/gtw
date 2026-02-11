import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useGuitarStore } from '../stores/guitarStore';
import { useAudioStore } from '../stores/audioStore';
import { useThemeStore } from '../stores/themeStore';
import { FretPosition, NOTE_NAMES } from '../types/guitar';
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
  const [containerWidth, setContainerWidth] = useState(1200);
  
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
    for (let string = 0; string < stringCount; string++) {
      const y = PADDING_Y + string * STRING_SPACING;
      const thickness = 1 + (stringCount - 1 - string) * 0.4;
      
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
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (let fret = 1; fret <= fretCount; fret++) {
      const x = PADDING_X + NUT_WIDTH + (fret - 0.5) * FRET_WIDTH;
      ctx.fillText(fret.toString(), x, height - 12);
    }
    
    // Draw string labels (tuning)
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 13px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    for (let string = 0; string < stringCount; string++) {
      const y = PADDING_Y + string * STRING_SPACING + 4;
      const noteName = tuning.notes[stringCount - 1 - string] || '';
      ctx.fillText(noteName.replace(/\d/, ''), PADDING_X - 12, y);
    }
    
    // Draw highlighted notes
    highlightedPositions.forEach(pos => {
      const shouldShowName = !hideNoteNames || isPositionRevealed(pos);
      drawNote(ctx, pos, true, shouldShowName);
    });
    
    // Draw all notes if enabled
    if (showAllNotes) {
      for (let string = 0; string < stringCount; string++) {
        for (let fret = 0; fret <= Math.min(fretCount, 12); fret++) {
          const pos = { string, fret };
          if (!highlightedPositions.some(p => p.string === string && p.fret === fret)) {
            drawNote(ctx, pos, false, !hideNoteNames);
          }
        }
      }
    }
  }, [stringCount, tuning, fretCount, highlightedPositions, showAllNotes, canvasWidth, canvasHeight, colors, hideNoteNames, revealedPositions, resolvedTheme]);

  const drawNote = (
    ctx: CanvasRenderingContext2D, 
    position: FretPosition, 
    highlighted: boolean,
    showName: boolean = true
  ) => {
    const { string, fret } = position;
    const x = fret === 0 
      ? PADDING_X + NUT_WIDTH / 2 
      : PADDING_X + NUT_WIDTH + (fret - 0.5) * FRET_WIDTH;
    const y = PADDING_Y + (stringCount - 1 - string) * STRING_SPACING;
    
    const note = getNoteAtPosition(position, tuning, stringCount);
    const noteName = note.replace(/\d/, '');
    const isRoot = rootNote && noteName === rootNote;
    
    // Draw shadow
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    
    // Draw circle
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    
    if (isRoot) {
      ctx.fillStyle = colors.noteRoot;
    } else if (highlighted) {
      ctx.fillStyle = colors.noteHighlight;
    } else {
      ctx.fillStyle = colors.noteDefault;
    }
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    
    // Draw note name or question mark
    ctx.fillStyle = highlighted || isRoot ? '#fff' : colors.textMuted;
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (!showName && highlighted) {
      // Show question mark for hidden notes
      ctx.fillText('?', x, y);
    } else if (showName) {
      let displayText = noteName;
      if (displayMode === 'intervals' && rootNote) {
        const rootIndex = NOTE_NAMES.indexOf(rootNote as any);
        const noteIndex = NOTE_NAMES.indexOf(noteName as any);
        if (rootIndex !== -1 && noteIndex !== -1) {
          const interval = (noteIndex - rootIndex + 12) % 12;
          const intervalNames = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
          displayText = intervalNames[interval];
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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    
    // Calculate which fret was clicked
    let fret = 0;
    if (x > PADDING_X + NUT_WIDTH) {
      fret = Math.floor((x - PADDING_X - NUT_WIDTH) / FRET_WIDTH) + 1;
    }
    
    // Calculate which string was clicked
    const stringIndex = Math.round((y - PADDING_Y) / STRING_SPACING);
    const string = stringCount - 1 - stringIndex;
    
    if (string >= 0 && string < stringCount && fret >= 0 && fret <= fretCount) {
      const position: FretPosition = { string, fret };
      const note = getNoteAtPosition(position, tuning, stringCount);
      
      // Play the note
      playNote(note, { duration: 1.5, velocity: masterVolume * 0.8 });
      
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

  return (
    <div ref={containerRef} className="fretboard-container w-full">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`${interactive ? 'cursor-pointer' : ''} rounded-lg`}
        style={{ 
          width: '100%', 
          height: 'auto',
          minWidth: `${canvasWidth}px`
        }}
      />
    </div>
  );
};

export default Fretboard;