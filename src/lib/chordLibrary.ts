// Chord library — canonical chord-shape data + pure change-trainer logic.
//
// This module is the single source of truth for the chord-box dictionary and
// the one-minute chord-change trainer. All randomness-free helpers here are
// unit-tested in src/__tests__/chordLibrary.test.ts.

/** Category of a chord shape — used to group/filter the dictionary. */
export type ChordCategory =
  | 'major'
  | 'minor'
  | 'dominant-7'
  | 'maj7'
  | 'min7'
  | 'barre';

/**
 * A single guitar chord voicing rendered as a chord-box diagram.
 *
 * `frets` and `fingers` are ordered low-E → high-E (6 entries for standard
 * guitar). Fret values: `-1` = muted (headstock "x"), `0` = open string,
 * `1..` = fret number. Finger values: `0` = none/open/muted, `1..4` = finger.
 *
 * `baseFret` is the lowest fret shown on the diagram (1 for open-position
 * chords; the actual fret number for barre/chord shapes played higher up).
 * `barre`, when present, describes a barre finger drawn as a rounded cap.
 */
export interface ChordShape {
  id: string;
  name: string;
  category: ChordCategory;
  frets: number[];
  fingers: number[];
  baseFret: number;
  barre?: { fret: number; fromString: number; toString: number };
  difficulty: 1 | 2 | 3;
}

export const STRING_COUNT = 6;

// ---------------------------------------------------------------------------
// Dictionary — common open + barre chords for standard tuning.
// frets/fingers ordered low-E (index 0) → high-E (index 5).
// ---------------------------------------------------------------------------

export const CHORDS: ChordShape[] = [
  // ---- Major open chords ----
  {
    id: 'C',
    name: 'C',
    category: 'major',
    frets: [-1, 3, 2, 0, 1, 0],
    fingers: [0, 3, 2, 0, 1, 0],
    baseFret: 1,
    difficulty: 1,
  },
  {
    id: 'A',
    name: 'A',
    category: 'major',
    frets: [-1, 0, 2, 2, 2, 0],
    fingers: [0, 0, 1, 2, 3, 0],
    baseFret: 1,
    difficulty: 1,
  },
  {
    id: 'G',
    name: 'G',
    category: 'major',
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [2, 1, 0, 0, 0, 3],
    baseFret: 1,
    difficulty: 1,
  },
  {
    id: 'E',
    name: 'E',
    category: 'major',
    frets: [0, 2, 2, 1, 0, 0],
    fingers: [0, 2, 3, 1, 0, 0],
    baseFret: 1,
    difficulty: 1,
  },
  {
    id: 'D',
    name: 'D',
    category: 'major',
    frets: [-1, -1, 0, 2, 3, 2],
    fingers: [0, 0, 0, 1, 3, 2],
    baseFret: 1,
    difficulty: 1,
  },

  // ---- Minor open chords ----
  {
    id: 'Am',
    name: 'Am',
    category: 'minor',
    frets: [-1, 0, 2, 2, 1, 0],
    fingers: [0, 0, 2, 3, 1, 0],
    baseFret: 1,
    difficulty: 1,
  },
  {
    id: 'Em',
    name: 'Em',
    category: 'minor',
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [0, 2, 3, 0, 0, 0],
    baseFret: 1,
    difficulty: 1,
  },
  {
    id: 'Dm',
    name: 'Dm',
    category: 'minor',
    frets: [-1, -1, 0, 2, 3, 1],
    fingers: [0, 0, 0, 2, 3, 1],
    baseFret: 1,
    difficulty: 1,
  },

  // ---- Dominant 7th open chords ----
  {
    id: 'A7',
    name: 'A7',
    category: 'dominant-7',
    frets: [-1, 0, 2, 0, 2, 0],
    fingers: [0, 0, 2, 0, 3, 0],
    baseFret: 1,
    difficulty: 1,
  },
  {
    id: 'E7',
    name: 'E7',
    category: 'dominant-7',
    frets: [0, 2, 0, 1, 0, 0],
    fingers: [0, 2, 0, 1, 0, 0],
    baseFret: 1,
    difficulty: 1,
  },
  {
    id: 'D7',
    name: 'D7',
    category: 'dominant-7',
    frets: [-1, -1, 0, 2, 1, 2],
    fingers: [0, 0, 0, 2, 1, 3],
    baseFret: 1,
    difficulty: 1,
  },
  {
    id: 'G7',
    name: 'G7',
    category: 'dominant-7',
    frets: [3, 2, 0, 0, 0, 1],
    fingers: [3, 2, 0, 0, 0, 1],
    baseFret: 1,
    difficulty: 1,
  },

  // ---- Barre chords ----
  {
    id: 'F-barre',
    name: 'F (barre)',
    category: 'barre',
    frets: [1, 3, 3, 2, 1, 1],
    fingers: [1, 3, 4, 2, 1, 1],
    baseFret: 1,
    barre: { fret: 1, fromString: 0, toString: 5 },
    difficulty: 3,
  },
  {
    id: 'B-barre',
    name: 'B (barre)',
    category: 'barre',
    frets: [-1, 2, 4, 4, 4, 2],
    fingers: [0, 1, 2, 3, 4, 1],
    baseFret: 2,
    barre: { fret: 2, fromString: 1, toString: 5 },
    difficulty: 3,
  },

  // ---- Maj7 / min7 open chords ----
  {
    id: 'Cmaj7',
    name: 'Cmaj7',
    category: 'maj7',
    frets: [-1, 3, 2, 0, 0, 0],
    fingers: [0, 3, 2, 0, 0, 0],
    baseFret: 1,
    difficulty: 2,
  },
  {
    id: 'Am7',
    name: 'Am7',
    category: 'min7',
    frets: [-1, 0, 2, 0, 1, 0],
    fingers: [0, 0, 2, 0, 1, 0],
    baseFret: 1,
    difficulty: 2,
  },
  {
    id: 'Dm7',
    name: 'Dm7',
    category: 'min7',
    frets: [-1, -1, 0, 2, 1, 1],
    fingers: [0, 0, 0, 2, 1, 1],
    baseFret: 1,
    difficulty: 2,
  },
];

// ---------------------------------------------------------------------------
// Dictionary lookups (pure)
// ---------------------------------------------------------------------------

/** Find a chord by id; throws if missing so callers fail loud, not silently. */
export function getChordById(id: string): ChordShape {
  const chord = CHORDS.find((c) => c.id === id);
  if (!chord) throw new Error(`Unknown chord id: ${id}`);
  return chord;
}

/** Chords filtered to a category, preserving dictionary order. */
export function chordsByCategory(category: ChordCategory): ChordShape[] {
  return CHORDS.filter((c) => c.category === category);
}

// ---------------------------------------------------------------------------
// Change-trainer pure logic
// ---------------------------------------------------------------------------

/** Trainer drill duration in seconds. */
export const DRILL_SECONDS = 60;

/**
 * Changes-per-minute rate. `elapsedSeconds` is clamped to a minimum of 1 so a
 * sub-second elapsed window never produces a divide-by-zero or absurd infinity
 * — the trainer records the final CPM from the full 60s run anyway.
 */
export function changesPerMinute(changes: number, elapsedSeconds: number): number {
  if (changes <= 0) return 0;
  const safeElapsed = Math.max(1, elapsedSeconds);
  return (changes / safeElapsed) * 60;
}

/** Format a CPM value for display (no decimals once you have a real rate). */
export function formatCpm(cpm: number): string {
  if (!Number.isFinite(cpm) || cpm <= 0) return '0';
  return cpm >= 100 ? Math.round(cpm).toString() : cpm.toFixed(1);
}

// ---------------------------------------------------------------------------
// Personal-best persistence (self-contained localStorage helper)
// ---------------------------------------------------------------------------

const PB_PREFIX = 'gtw:chordlib:pb:';

/**
 * Build a stable, order-independent storage key for a chord pair. The pair is
 * sorted by id so (C, G) and (G, C) share one best.
 */
export function pairKey(idA: string, idB: string): string {
  const [a, b] = idA < idB ? [idA, idB] : [idB, idA];
  return `${PB_PREFIX}${a}+${b}`;
}

/** A persisted personal best for a chord pair. */
export interface PersonalBest {
  pairKey: string;
  changes: number;
  cpm: number;
  achievedAt: number; // epoch ms
}

/** Read a personal best for a pair; undefined when none stored or unreadable. */
export function loadPersonalBest(idA: string, idB: string): PersonalBest | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(pairKey(idA, idB));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<PersonalBest>;
    if (
      typeof parsed.changes !== 'number' ||
      typeof parsed.cpm !== 'number' ||
      typeof parsed.achievedAt !== 'number'
    ) {
      return undefined;
    }
    return {
      pairKey: pairKey(idA, idB),
      changes: parsed.changes,
      cpm: parsed.cpm,
      achievedAt: parsed.achievedAt,
    };
  } catch {
    return undefined;
  }
}

/**
 * Persist a personal best only if it beats the stored one (more changes, or
 * equal changes with a higher CPM). Returns true when a new best was saved.
 */
export function savePersonalBest(idA: string, idB: string, changes: number, cpm: number): boolean {
  if (typeof localStorage === 'undefined') return false;
  const key = pairKey(idA, idB);
  const existing = loadPersonalBest(idA, idB);
  const isBetter =
    !existing ||
    changes > existing.changes ||
    (changes === existing.changes && cpm > existing.cpm);
  if (!isBetter) return false;
  const record: PersonalBest = { pairKey: key, changes, cpm, achievedAt: Date.now() };
  try {
    localStorage.setItem(key, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

/** Human label for a chord pair, e.g. "G ↔ Em". */
export function pairLabel(idA: string, idB: string): string {
  return `${getChordById(idA).name} ↔ ${getChordById(idB).name}`;
}
