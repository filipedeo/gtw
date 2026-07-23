/**
 * Windowed fretboard coordinate transform (visual-overhaul plan §3).
 *
 * The fretboard used to hardcode a fret-0 origin: the nut sat at the left edge
 * and every X was expressed from there. To zoom to the active region we thread a
 * visible window `[startFret..endFret]` through the geometry instead.
 *
 * The transform is deliberately expressed in "wire units" so that it reduces
 * EXACTLY to the legacy fret-0 formulas when `startFret === 0`:
 *   leftPos  = 0,  nutWidth = NUT_WIDTH,  originX = PADDING_X + NUT_WIDTH
 *   xAtPos(p) = originX + p * FRET_WIDTH
 * which matches the original wire / inlay / note / reverse-map math. This keeps
 * the existing fretboardClick tests (which mirror the fret-0 math) green and
 * leaves the explore / reference board pixel-identical.
 */

export const FB_CONST = {
  STRING_SPACING: 32,
  NUT_WIDTH: 10,
  PADDING_X: 50,
  PADDING_Y: 45,
  FW_MIN: 40,
  FW_MAX_FULL: 60, // full board (startFret === 0)
  FW_MAX_ZOOM: 92, // zoomed in (fewer columns) — lets circles grow
} as const;

/** Minimum comfortable window width (columns) so a 2-fret shape isn't absurdly zoomed. */
export const MIN_WINDOW = 5;

export interface FretWindowGeometry {
  startFret: number;
  endFret: number;
  /** Wire-unit position of the left visible edge (0 when startFret === 0). */
  leftPos: number;
  /** Nut bar width — NUT_WIDTH when fret 0 is in view, else 0 (left edge is a wire). */
  nutWidth: number;
  /** X of the left edge of the fretted area = PADDING_X + nutWidth. */
  originX: number;
  /** Number of fret-width columns drawn = endFret - leftPos. */
  visibleCols: number;
  fretWidth: number;
  canvasWidth: number;
  canvasHeight: number;
  /** Base note-circle radius for this window (clicked/hover add a +2 bump). */
  noteRadius: number;
}

export interface ComputeWindowInput {
  startFret: number;
  endFret: number;
  containerWidth: number;
  stringCount: number;
  isMobile: boolean;
}

/**
 * Resolve the geometric window from a visible fret range + container size.
 * Pure: no canvas, no DOM — unit-testable.
 */
export function computeWindow({
  startFret,
  endFret,
  containerWidth,
  stringCount,
  isMobile,
}: ComputeWindowInput): FretWindowGeometry {
  const leftPos = startFret === 0 ? 0 : startFret - 1;
  const nutWidth = startFret === 0 ? FB_CONST.NUT_WIDTH : 0;
  const originX = FB_CONST.PADDING_X + nutWidth;
  const visibleCols = Math.max(1, endFret - leftPos);

  // Full board keeps the legacy 60px cap; zoomed views let frets (and circles)
  // grow up to ~92px so a tight region reads clearly, especially on phone.
  const fwMax = startFret === 0
    ? FB_CONST.FW_MAX_FULL
    : Math.min(FB_CONST.FW_MAX_ZOOM, FB_CONST.FW_MAX_FULL + (12 - visibleCols) * 4);
  const available = containerWidth - FB_CONST.PADDING_X * 2 - nutWidth;
  const fretWidth = Math.max(FB_CONST.FW_MIN, Math.min(fwMax, available / visibleCols));

  const canvasWidth = FB_CONST.PADDING_X * 2 + nutWidth + visibleCols * fretWidth;
  const canvasHeight = FB_CONST.PADDING_Y * 2 + FB_CONST.STRING_SPACING * (stringCount - 1);

  // Note radius: identical to the legacy 13px on the full board (startFret === 0)
  // so the explore board is pixel-identical; scales with fretWidth when zoomed,
  // bumped on phone for easier reading.
  let noteRadius: number;
  if (startFret === 0) {
    noteRadius = 13;
  } else {
    const lo = isMobile ? 15 : 13;
    noteRadius = Math.max(lo, Math.min(22, fretWidth * 0.34));
  }

  return {
    startFret,
    endFret,
    leftPos,
    nutWidth,
    originX,
    visibleCols,
    fretWidth,
    canvasWidth,
    canvasHeight,
    noteRadius,
  };
}

/**
 * X coordinate for a wire-unit position `p`:
 *   fret wire  -> p = fret
 *   inlay/number/note-center -> p = fret - 0.5
 */
export function xAtPos(win: FretWindowGeometry, p: number): number {
  return win.originX + (p - win.leftPos) * win.fretWidth;
}

/**
 * Reverse map: logical canvas X -> fret number.
 * Returns the fret (0 for the nut zone, only reachable when startFret === 0) or
 * -1 when the click falls outside the visible board (label gutter or past the
 * last visible fret).
 *
 * Identity at startFret === 0:
 *   x < PADDING_X -> -1;  x <= PADDING_X + NUT_WIDTH -> 0;
 *   else floor((x - PADDING_X - NUT_WIDTH) / FRET_WIDTH) + 1
 */
export function fretAtX(win: FretWindowGeometry, x: number): number {
  if (x < FB_CONST.PADDING_X) return -1;
  if (x <= win.originX) return 0; // nut zone (only when startFret === 0)
  const col = (x - win.originX) / win.fretWidth;
  const fret = Math.floor(col) + 1 + win.leftPos;
  if (fret > win.endFret) return -1;
  return fret;
}

export interface ComputeFretWindowInput {
  /** All fret positions in play (highlights + secondary + masked). */
  positions: { fret: number }[];
  /** Full fretboard length (e.g. 22). */
  fretCount: number;
  /** Mobile-clamped full-board length (isMobile ? min(fretCount, 12) : fretCount). */
  effectiveFretCount: number;
  /** "Show all notes" / explore mode -> full board. */
  showAllNotes: boolean;
  /** Minimum visible columns (default MIN_WINDOW). */
  minWindow?: number;
}

export interface FretWindowRange {
  startFret: number;
  endFret: number;
}

/**
 * Decide which fret region to show. The full board (explore / show-all / no
 * highlights) keeps startFret = 0 so the nut + whole neck render unchanged.
 * Otherwise zoom to the used frets with one fret of breathing room on each side,
 * expanded to a minimum comfortable width. Open-string shapes keep startFret = 0
 * so the nut stays visible. endFret may exceed effectiveFretCount on phone so a
 * high-fret shape (e.g. frets 12-15) is shown rather than skipped — but a note is
 * never dropped: the window always contains every position.
 */
export function computeFretWindow({
  positions,
  fretCount,
  effectiveFretCount,
  showAllNotes,
  minWindow = MIN_WINDOW,
}: ComputeFretWindowInput): FretWindowRange {
  if (showAllNotes || positions.length === 0) {
    return { startFret: 0, endFret: effectiveFretCount };
  }

  let minF = Infinity;
  let maxF = -Infinity;
  for (const pos of positions) {
    if (pos.fret < minF) minF = pos.fret;
    if (pos.fret > maxF) maxF = pos.fret;
  }

  let startFret: number;
  if (minF === 0) {
    startFret = 0; // uses open strings -> keep the nut
  } else {
    startFret = Math.max(0, minF - 1); // one fret of left breathing room
  }
  let endFret = Math.min(fretCount, maxF + 1); // one fret of right breathing room

  // Enforce a minimum comfortable width so a 2-fret shape isn't absurdly zoomed.
  if (endFret - startFret < minWindow) {
    const deficit = minWindow - (endFret - startFret);
    // Expand right first (toward higher frets), then left, within [0..fretCount].
    const roomRight = fretCount - endFret;
    const addRight = Math.min(roomRight, deficit);
    endFret += addRight;
    const remaining = deficit - addRight;
    if (remaining > 0) {
      const roomLeft = startFret - 0;
      startFret = Math.max(0, startFret - Math.min(roomLeft, remaining));
    }
  }

  return { startFret, endFret };
}
