import { describe, it, expect } from 'vitest';
import {
  computeWindow,
  xAtPos,
  fretAtX,
  computeFretWindow,
  FB_CONST,
  MIN_WINDOW,
} from '../utils/fretboardWindow';

const { PADDING_X, NUT_WIDTH, PADDING_Y, STRING_SPACING } = FB_CONST;

// A representative desktop container width.
const CW = 1200;
const STRINGS = 6;

describe('fretboardWindow: startFret === 0 identity (legacy formulas)', () => {
  const win = computeWindow({ startFret: 0, endFret: 12, containerWidth: CW, stringCount: STRINGS, isMobile: false });

  it('leftPos/nutWidth/originX match the fret-0 origin', () => {
    expect(win.leftPos).toBe(0);
    expect(win.nutWidth).toBe(NUT_WIDTH);
    expect(win.originX).toBe(PADDING_X + NUT_WIDTH);
  });

  it('visibleCols === endFret', () => {
    expect(win.visibleCols).toBe(12);
  });

  it('fret wire x matches PADDING_X + NUT_WIDTH + fret*FRET_WIDTH', () => {
    for (let fret = 1; fret <= 12; fret++) {
      expect(xAtPos(win, fret)).toBe(PADDING_X + NUT_WIDTH + fret * win.fretWidth);
    }
  });

  it('inlay/note x matches PADDING_X + NUT_WIDTH + (fret-0.5)*FRET_WIDTH', () => {
    for (let fret = 1; fret <= 12; fret++) {
      expect(xAtPos(win, fret - 0.5)).toBe(PADDING_X + NUT_WIDTH + (fret - 0.5) * win.fretWidth);
    }
  });

  it('canvasWidth matches PADDING_X*2 + NUT_WIDTH + visibleCols*FRET_WIDTH', () => {
    expect(win.canvasWidth).toBe(PADDING_X * 2 + NUT_WIDTH + 12 * win.fretWidth);
  });

  it('noteRadius is the legacy 13px on the full board', () => {
    expect(win.noteRadius).toBe(13);
  });

  it('reverse map matches the legacy click formula', () => {
    // x in label gutter -> reject
    expect(fretAtX(win, PADDING_X - 5)).toBe(-1);
    // nut zone -> fret 0
    expect(fretAtX(win, PADDING_X + 4)).toBe(0);
    // middle of fret 1
    const x1 = PADDING_X + NUT_WIDTH + 0.5 * win.fretWidth;
    expect(fretAtX(win, x1)).toBe(1);
    // middle of fret 5
    const x5 = PADDING_X + NUT_WIDTH + 4.5 * win.fretWidth;
    expect(fretAtX(win, x5)).toBe(5);
  });
});

describe('fretboardWindow: zoomed window [5..8]', () => {
  // startFret 5 -> leftPos 4 (wire before fret 5), no nut.
  const win = computeWindow({ startFret: 5, endFret: 8, containerWidth: 390, stringCount: STRINGS, isMobile: true });

  it('left edge is the wire before the first shown fret; no nut', () => {
    expect(win.leftPos).toBe(4);
    expect(win.nutWidth).toBe(0);
    expect(win.originX).toBe(PADDING_X);
    expect(win.visibleCols).toBe(8 - 4);
  });

  it('fret 5 wire is the left-most column', () => {
    // xAtPos(fret=5) = originX + (5 - 4)*FW = originX + FW (one column in)
    expect(xAtPos(win, 5)).toBe(win.originX + win.fretWidth);
  });

  it('xAtPos / reverse-map round-trip for every fret in window', () => {
    for (let fret = 5; fret <= 8; fret++) {
      const x = xAtPos(win, fret - 0.5); // note center for this fret
      expect(fretAtX(win, x)).toBe(fret);
    }
  });

  it('inlay position inside bounds', () => {
    // fret 5 single-dot inlay center
    const x = xAtPos(win, 5 - 0.5);
    expect(x).toBeGreaterThan(win.originX);
    expect(x).toBeLessThan(win.canvasWidth - PADDING_X);
  });

  it('canvasWidth matches visibleCols', () => {
    expect(win.canvasWidth).toBe(PADDING_X * 2 + 0 + win.visibleCols * win.fretWidth);
  });

  it('a click at the left edge (nut zone absent) returns fret 5, not 0', () => {
    // Just right of originX -> first column -> fret 5
    expect(fretAtX(win, win.originX + 1)).toBe(5);
  });

  it('a click past the right edge is rejected', () => {
    expect(fretAtX(win, win.canvasWidth - PADDING_X + 30)).toBe(-1);
  });

  it('note radius grows beyond the 13px full-board baseline', () => {
    expect(win.noteRadius).toBeGreaterThan(13);
  });
});

describe('fretboardWindow: window computation', () => {
  const fc = 22;
  const eff = 12;

  it('showAllNotes -> full board', () => {
    const r = computeFretWindow({ positions: [{ fret: 5 }, { fret: 7 }], fretCount: fc, effectiveFretCount: eff, showAllNotes: true });
    expect(r).toEqual({ startFret: 0, endFret: eff });
  });

  it('empty positions -> full board', () => {
    const r = computeFretWindow({ positions: [], fretCount: fc, effectiveFretCount: eff, showAllNotes: false });
    expect(r).toEqual({ startFret: 0, endFret: eff });
  });

  it('open-string shape keeps startFret = 0 (nut visible)', () => {
    const r = computeFretWindow({ positions: [{ fret: 0 }, { fret: 2 }, { fret: 3 }], fretCount: fc, effectiveFretCount: eff, showAllNotes: false });
    expect(r.startFret).toBe(0);
    expect(r.endFret).toBeGreaterThanOrEqual(4);
  });

  it('frets 5-8 shape -> [4..9] with one-fret padding', () => {
    const r = computeFretWindow({ positions: [{ fret: 5 }, { fret: 6 }, { fret: 7 }, { fret: 8 }], fretCount: fc, effectiveFretCount: eff, showAllNotes: false });
    expect(r.startFret).toBe(4);
    expect(r.endFret).toBe(9);
  });

  it('MIN_WINDOW expansion for a tiny shape', () => {
    // A single fret at 10 -> raw window [9..11] (2 cols) -> expanded to MIN_WINDOW.
    const r = computeFretWindow({ positions: [{ fret: 10 }], fretCount: fc, effectiveFretCount: eff, showAllNotes: false });
    expect(r.endFret - r.startFret).toBeGreaterThanOrEqual(MIN_WINDOW);
    // The note itself stays inside the window.
    expect(r.startFret).toBeLessThanOrEqual(10);
    expect(r.endFret).toBeGreaterThanOrEqual(10);
  });

  it('never drops a note: a high-fret shape on phone extends endFret past effectiveFretCount', () => {
    // Phone effectiveFretCount would be 12, but a shape at frets 13-15 must show.
    const r = computeFretWindow({ positions: [{ fret: 13 }, { fret: 14 }, { fret: 15 }], fretCount: fc, effectiveFretCount: 12, showAllNotes: false });
    expect(r.startFret).toBeLessThanOrEqual(13);
    expect(r.endFret).toBeGreaterThanOrEqual(15);
  });

  it('clamps to [0..fretCount]', () => {
    const r = computeFretWindow({ positions: [{ fret: 21 }], fretCount: fc, effectiveFretCount: eff, showAllNotes: false });
    expect(r.startFret).toBeGreaterThanOrEqual(0);
    expect(r.endFret).toBeLessThanOrEqual(fc);
  });
});

describe('fretboardWindow: geometry sanity', () => {
  it('full board keeps the legacy 32px spacing and 13px radius', () => {
    const full = computeWindow({ startFret: 0, endFret: 12, containerWidth: CW, stringCount: STRINGS, isMobile: false });
    expect(full.stringSpacing).toBe(STRING_SPACING);
    expect(full.noteRadius).toBe(13);
    expect(full.canvasHeight).toBe(PADDING_Y * 2 + STRING_SPACING * (STRINGS - 1));
  });

  it('a zoomed board grows taller (more string spacing) than the full board', () => {
    const full = computeWindow({ startFret: 0, endFret: 12, containerWidth: CW, stringCount: STRINGS, isMobile: false });
    const zoom = computeWindow({ startFret: 5, endFret: 9, containerWidth: CW, stringCount: STRINGS, isMobile: false });
    expect(zoom.stringSpacing).toBeGreaterThan(full.stringSpacing);
    expect(zoom.canvasHeight).toBeGreaterThan(full.canvasHeight);
  });

  it('note circles never collide vertically: 2*noteRadius <= stringSpacing at every zoom', () => {
    const cases = [
      computeWindow({ startFret: 0, endFret: 12, containerWidth: CW, stringCount: STRINGS, isMobile: false }),
      computeWindow({ startFret: 5, endFret: 9, containerWidth: CW, stringCount: STRINGS, isMobile: false }),
      computeWindow({ startFret: 5, endFret: 7, containerWidth: 390, stringCount: STRINGS, isMobile: true }),
      computeWindow({ startFret: 3, endFret: 8, containerWidth: CW, stringCount: 8, isMobile: false }),
    ];
    for (const win of cases) {
      expect(win.noteRadius * 2).toBeLessThanOrEqual(win.stringSpacing);
    }
  });
});
