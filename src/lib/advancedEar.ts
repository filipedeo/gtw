// Advanced ear training — pure question generators.
//
// Each generator is deterministic under an injected RNG (`() => number` in [0,1))
// and returns a fully-described question: the prompt text, the audio events to
// play (kept here so tests can validate note names), the correct answer, the
// multiple-choice options, and an explanation shown after answering.
//
// Audio playback itself lives in the component; nothing here touches Tone.js.
//
// Sub-modes
//   - scale    : identify a played scale/mode by ear
//   - cadence  : identify a played chord progression / cadence
//   - interval : name a two-note interval (ascending / descending / harmonic)
//   - degree   : hear a key, then identify a single scale degree by ear

import {
  NOTE_NAMES,
  NOTE_NAMES_FLAT,
  getModeNotes,
  buildProgressionChords,
  transposeNote,
} from './theoryEngine';

// ---------------------------------------------------------------------------
// RNG
// ---------------------------------------------------------------------------

/** A seeded, deterministic RNG compatible with the generators below. */
export type Rng = () => number;

/**
 * Mulberry32 — small, fast, deterministic PRNG. Given the same seed it
 * reproduces the exact same sequence, which is what the unit tests rely on.
 */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Random integer in [0, n). */
function intRng(rng: Rng, n: number): number {
  return Math.floor(rng() * n);
}

/** Pick one element from a non-empty array. */
function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[intRng(rng, arr.length)];
}

/** Fisher–Yates shuffle using the injected RNG (non-mutating). */
function shuffle<T>(rng: Rng, arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = intRng(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Resolve a pitch-class name (e.g. "Eb") to a chromatic index 0-11. */
function pitchClassIndex(note: string): number {
  let idx = NOTE_NAMES.indexOf(note);
  if (idx === -1) idx = NOTE_NAMES_FLAT.indexOf(note);
  return idx;
}

/** Build concrete note names (with octave) for a triad given root + intervals. */
function buildTriadNotes(root: string, intervals: number[], octave = 3): string[] {
  const rootIdx = pitchClassIndex(root);
  if (rootIdx === -1) return [];
  return intervals.map((iv) => {
    const idx = (rootIdx + iv) % 12;
    const oct = octave + Math.floor((rootIdx + iv) / 12);
    return `${NOTE_NAMES[idx]}${oct}`;
  });
}

/** Tonal returns scale notes without an octave; pin them to one for playback. */
function withOctave(notes: string[], octave = 4): string[] {
  return notes.map((n) => (/\d$/.test(n) ? n : `${n}${octave}`));
}

// ---------------------------------------------------------------------------
// Question shape
// ---------------------------------------------------------------------------

export type AdvancedEarSubMode = 'scale' | 'cadence' | 'interval' | 'degree';

export type IntervalDirection = 'ascending' | 'descending' | 'harmonic';

/** One playable moment: a single note (1 element) or a simultaneous chord (>1). */
export interface PlayEvent {
  notes: string[];
  duration: number;
}

export interface AdvancedEarQuestion {
  prompt: string;
  /** Ordered audio events; the component plays them one after another. */
  events: PlayEvent[];
  /** Flat ordered list of every note name across all events (for tests + simple use). */
  playSequence: string[];
  correct: string;
  options: string[];
  explanation: string;
}

// ---------------------------------------------------------------------------
// Scale / mode by ear
// ---------------------------------------------------------------------------

interface ScaleEntry {
  mode: string;
  display: string;
  minDifficulty: Difficulty;
}

const SCALE_POOL: ScaleEntry[] = [
  { mode: 'ionian', display: 'Major (Ionian)', minDifficulty: 1 },
  { mode: 'aeolian', display: 'Natural Minor (Aeolian)', minDifficulty: 1 },
  { mode: 'dorian', display: 'Dorian', minDifficulty: 2 },
  { mode: 'mixolydian', display: 'Mixolydian', minDifficulty: 2 },
  { mode: 'phrygian', display: 'Phrygian', minDifficulty: 3 },
  { mode: 'lydian', display: 'Lydian', minDifficulty: 3 },
  { mode: 'harmonic minor', display: 'Harmonic Minor', minDifficulty: 4 },
  { mode: 'melodic minor', display: 'Melodic Minor', minDifficulty: 4 },
  { mode: 'blues', display: 'Blues', minDifficulty: 5 },
  { mode: 'locrian', display: 'Locrian', minDifficulty: 5 },
];

const SCALE_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export function generateScaleQuestion(difficulty: Difficulty, rng: Rng): AdvancedEarQuestion {
  const pool = SCALE_POOL.filter((s) => s.minDifficulty <= difficulty);
  const chosen = pick(rng, pool);
  const root = pick(rng, SCALE_ROOTS);

  const notes = withOctave(getModeNotes(root, chosen.mode), 4);
  const options = shuffle(rng, pool.map((s) => s.display));

  return {
    prompt: 'Listen to the scale and identify which one it is.',
    events: notes.map((n) => ({ notes: [n], duration: 0.4 })),
    playSequence: notes,
    correct: chosen.display,
    options,
    explanation: `${root} ${chosen.display} played ascending.`,
  };
}

// ---------------------------------------------------------------------------
// Cadence / progression by ear
// ---------------------------------------------------------------------------

interface CadenceEntry {
  name: string;
  degrees: (number | string)[];
  minDifficulty: Difficulty;
  explanation: string;
}

const CADENCE_POOL: CadenceEntry[] = [
  {
    name: 'Authentic (V–I)',
    degrees: [5, 1],
    minDifficulty: 1,
    explanation: 'The dominant resolves to the tonic — the strongest cadence.',
  },
  {
    name: 'Plagal (IV–I)',
    degrees: [4, 1],
    minDifficulty: 1,
    explanation: 'The subdominant resolves to the tonic — the "Amen" cadence.',
  },
  {
    name: 'Deceptive (V–vi)',
    degrees: [5, 6],
    minDifficulty: 2,
    explanation: 'The dominant avoids the tonic and resolves to the relative minor.',
  },
  {
    name: 'Half (I–IV–V)',
    degrees: [1, 4, 5],
    minDifficulty: 3,
    explanation: 'Ends on the dominant — sounds unfinished, like a question mark.',
  },
  {
    name: 'Minor plagal (iv–i)',
    degrees: ['4m', '1m'],
    minDifficulty: 4,
    explanation: 'A minor subdominant resolving to the minor tonic — darker Amen.',
  },
  {
    name: 'Andalusian (i–bVII–bVI–V)',
    degrees: ['1m', 'b7', 'b6', '5M'],
    minDifficulty: 5,
    explanation: 'The classic flamenco descending cadence to a major V.',
  },
];

const CADENCE_KEYS = ['C', 'D', 'E', 'G', 'A'];

export function generateCadenceQuestion(difficulty: Difficulty, rng: Rng): AdvancedEarQuestion {
  const pool = CADENCE_POOL.filter((c) => c.minDifficulty <= difficulty);
  const chosen = pick(rng, pool);
  const key = pick(rng, CADENCE_KEYS);

  const chords = buildProgressionChords(key, chosen.degrees);
  const events: PlayEvent[] = chords.map(({ root, intervals }) => ({
    notes: buildTriadNotes(root, intervals, 3),
    duration: 1.1,
  }));
  const options = shuffle(rng, pool.map((c) => c.name));

  return {
    prompt: 'Listen to the chord progression and identify the cadence.',
    events,
    playSequence: events.flatMap((e) => e.notes),
    correct: chosen.name,
    options,
    explanation: chosen.explanation,
  };
}

// ---------------------------------------------------------------------------
// Interval by ear (configurable direction + interval set)
// ---------------------------------------------------------------------------

export interface IntervalDef {
  name: string;
  short: string;
  semitones: number;
  /** Tonal interval name, e.g. "5P", "m3". */
  tonal: string;
  song: string;
}

const INTERVALS: IntervalDef[] = [
  { name: 'Minor 2nd', short: 'm2', semitones: 1, tonal: 'm2', song: '"Jaws" theme' },
  { name: 'Major 2nd', short: 'M2', semitones: 2, tonal: 'M2', song: '"Happy Birthday" (first two notes)' },
  { name: 'Minor 3rd', short: 'm3', semitones: 3, tonal: 'm3', song: '"Greensleeves" (opening)' },
  { name: 'Major 3rd', short: 'M3', semitones: 4, tonal: 'M3', song: '"Kumbaya" (opening)' },
  { name: 'Perfect 4th', short: 'P4', semitones: 5, tonal: 'P4', song: '"Here Comes the Bride"' },
  { name: 'Tritone', short: 'TT', semitones: 6, tonal: 'A4', song: '"The Simpsons" theme' },
  { name: 'Perfect 5th', short: 'P5', semitones: 7, tonal: 'P5', song: '"Star Wars" theme' },
  { name: 'Minor 6th', short: 'm6', semitones: 8, tonal: 'm6', song: '"Go Down Moses"' },
  { name: 'Major 6th', short: 'M6', semitones: 9, tonal: 'M6', song: '"My Bonnie Lies Over the Ocean"' },
  { name: 'Minor 7th', short: 'm7', semitones: 10, tonal: 'm7', song: '"Somewhere" (West Side Story)' },
  { name: 'Major 7th', short: 'M7', semitones: 11, tonal: 'M7', song: '"Take On Me" (opening vocal)' },
  { name: 'Octave', short: 'P8', semitones: 12, tonal: 'P8', song: '"Somewhere Over the Rainbow"' },
];

/** Interval set available at each difficulty (widening from consonant to all). */
export function intervalsForDifficulty(difficulty: Difficulty): IntervalDef[] {
  if (difficulty <= 1) return INTERVALS.filter((i) => ['P4', 'P5'].includes(i.short));
  if (difficulty <= 2) return INTERVALS.filter((i) => ['m3', 'M3', 'P4', 'P5'].includes(i.short));
  if (difficulty <= 3)
    return INTERVALS.filter((i) => ['m2', 'M2', 'm3', 'M3', 'P4', 'P5', 'P8'].includes(i.short));
  return INTERVALS;
}

const INTERVAL_ROOTS = ['C4', 'D4', 'E4', 'F4', 'G4'];

export function generateIntervalQuestion(
  difficulty: Difficulty,
  rng: Rng,
  direction: IntervalDirection = 'ascending'
): AdvancedEarQuestion {
  const set = intervalsForDifficulty(difficulty);
  const chosen = pick(rng, set);
  const low = pick(rng, INTERVAL_ROOTS);
  const high = transposeNote(low, chosen.tonal);

  let events: PlayEvent[];
  if (direction === 'harmonic') {
    events = [{ notes: [low, high], duration: 1.6 }];
  } else if (direction === 'descending') {
    events = [{ notes: [high], duration: 0.8 }, { notes: [low], duration: 1.2 }];
  } else {
    events = [{ notes: [low], duration: 0.8 }, { notes: [high], duration: 1.2 }];
  }

  const options = shuffle(rng, set.map((i) => i.name));

  return {
    prompt:
      direction === 'harmonic'
        ? 'Listen to the two notes played together and name the interval.'
        : `Listen to the two notes played ${direction} and name the interval.`,
    events,
    playSequence: events.flatMap((e) => e.notes),
    correct: chosen.name,
    options,
    explanation: `${chosen.name} (${chosen.semitones} semitones). Song reference: ${chosen.song}.`,
  };
}

// ---------------------------------------------------------------------------
// Scale degree by ear (audio-only bridge)
// ---------------------------------------------------------------------------

interface DegreeEntry {
  degree: number; // 1-7
  label: string;
  minDifficulty: Difficulty;
  solfege: string;
  description: string;
}

const DEGREE_POOL: DegreeEntry[] = [
  { degree: 1, label: '1', minDifficulty: 1, solfege: 'Do', description: 'Tonic — home, stable.' },
  { degree: 3, label: '3', minDifficulty: 1, solfege: 'Mi', description: 'Mediant — defines major/minor.' },
  { degree: 5, label: '5', minDifficulty: 1, solfege: 'Sol', description: 'Dominant — strong, supportive.' },
  { degree: 2, label: '2', minDifficulty: 2, solfege: 'Re', description: 'Supertonic — wants to move.' },
  { degree: 4, label: '4', minDifficulty: 2, solfege: 'Fa', description: 'Subdominant — away from home.' },
  { degree: 6, label: '6', minDifficulty: 3, solfege: 'La', description: 'Submediant — relative minor root.' },
  { degree: 7, label: '7', minDifficulty: 3, solfege: 'Ti', description: 'Leading tone — pulls to 1.' },
];

const DEGREE_KEYS = ['C', 'D', 'G', 'A'];
const MAJOR_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

export function generateDegreeQuestion(difficulty: Difficulty, rng: Rng): AdvancedEarQuestion {
  const pool = DEGREE_POOL.filter((d) => d.minDifficulty <= difficulty);
  const chosen = pick(rng, pool);
  const key = pick(rng, DEGREE_KEYS);

  // Establish the key with a tonic triad, then sound the target degree.
  const keyIdx = pitchClassIndex(key);
  const tonicTriad = buildTriadNotes(key, [0, 4, 7], 3);
  const targetIdx = (keyIdx + MAJOR_SEMITONES[chosen.degree - 1]) % 12;
  const targetNote = `${NOTE_NAMES[targetIdx]}4`;

  const events: PlayEvent[] = [
    { notes: tonicTriad, duration: 1.5 },
    { notes: [targetNote], duration: 1.5 },
  ];

  const options = shuffle(rng, pool.map((d) => d.label));

  return {
    prompt: `A key is established, then a note is played. Identify its scale degree.`,
    events,
    playSequence: events.flatMap((e) => e.notes),
    correct: chosen.label,
    options,
    explanation: `Degree ${chosen.label} (${chosen.solfege}) in ${key} major. ${chosen.description}`,
  };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface GenerateOptions {
  difficulty: Difficulty;
  rng: Rng;
  direction?: IntervalDirection;
}

export function generateAdvancedEarQuestion(
  subMode: AdvancedEarSubMode,
  { difficulty, rng, direction = 'ascending' }: GenerateOptions
): AdvancedEarQuestion {
  switch (subMode) {
    case 'scale':
      return generateScaleQuestion(difficulty, rng);
    case 'cadence':
      return generateCadenceQuestion(difficulty, rng);
    case 'interval':
      return generateIntervalQuestion(difficulty, rng, direction);
    case 'degree':
      return generateDegreeQuestion(difficulty, rng);
  }
}

/** Map an exercise id to its ear-advanced sub-mode. */
export function subModeFromExerciseId(id: string): AdvancedEarSubMode {
  if (id.includes('scale')) return 'scale';
  if (id.includes('cadence')) return 'cadence';
  if (id.includes('interval')) return 'interval';
  if (id.includes('degree')) return 'degree';
  return 'scale';
}
