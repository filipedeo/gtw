import { describe, it, expect } from 'vitest';
import { Note, Scale } from 'tonal';

// Helper: get extension note chromas for a given key+mode vs pentatonic
function getExtensionChromas(key: string, scaleType: 'minor' | 'major', modeName: string): number[] {
  const pentName = scaleType === 'minor' ? 'minor pentatonic' : 'major pentatonic';
  const pentChromas = Scale.get(`${key} ${pentName}`).notes.map(n => Note.get(n).chroma!);
  const fullChromas = Scale.get(`${key} ${modeName}`).notes.map(n => Note.get(n).chroma!);
  return fullChromas.filter(c => !pentChromas.includes(c)).sort((a, b) => a - b);
}

// Helper: get pentatonic notes NOT in the target scale (conflict notes)
function getConflictChromas(key: string, scaleType: 'minor' | 'major', modeName: string): number[] {
  const pentName = scaleType === 'minor' ? 'minor pentatonic' : 'major pentatonic';
  const pentChromas = Scale.get(`${key} ${pentName}`).notes.map(n => Note.get(n).chroma!);
  const fullChromas = Scale.get(`${key} ${modeName}`).notes.map(n => Note.get(n).chroma!);
  return pentChromas.filter(c => !fullChromas.includes(c)).sort((a, b) => a - b);
}

// Helper: get extension note names for a given key+mode vs pentatonic
function getExtensionNoteNames(key: string, scaleType: 'minor' | 'major', modeName: string): string[] {
  const pentName = scaleType === 'minor' ? 'minor pentatonic' : 'major pentatonic';
  const pentChromas = Scale.get(`${key} ${pentName}`).notes.map(n => Note.get(n).chroma!);
  const fullNotes = Scale.get(`${key} ${modeName}`).notes;
  return fullNotes
    .filter(n => {
      const ch = Note.get(n).chroma;
      return ch !== undefined && !pentChromas.includes(ch);
    })
    .map(n => Note.simplify(n) || n);
}

// Test that exercises.ts has all expected pentatonic exercises
describe('Pentatonic exercise definitions', () => {
  it('has individual minor pentatonic shapes 1-5', async () => {
    const { getExercisesByType } = await import('../api/exercises');
    const exercises = await getExercisesByType('pentatonic');

    expect(exercises.find(e => e.id === 'pentatonic-1')).toBeDefined();
    expect(exercises.find(e => e.id === 'pentatonic-minor-2')).toBeDefined();
    expect(exercises.find(e => e.id === 'pentatonic-minor-3')).toBeDefined();
    expect(exercises.find(e => e.id === 'pentatonic-minor-4')).toBeDefined();
    expect(exercises.find(e => e.id === 'pentatonic-minor-5')).toBeDefined();
  });

  it('has individual major pentatonic shapes 1-5', async () => {
    const { getExercisesByType } = await import('../api/exercises');
    const exercises = await getExercisesByType('pentatonic');

    expect(exercises.find(e => e.id === 'pentatonic-major-1')).toBeDefined();
    expect(exercises.find(e => e.id === 'pentatonic-major-2')).toBeDefined();
    expect(exercises.find(e => e.id === 'pentatonic-major-3')).toBeDefined();
    expect(exercises.find(e => e.id === 'pentatonic-major-4')).toBeDefined();
    expect(exercises.find(e => e.id === 'pentatonic-major-5')).toBeDefined();
  });

  it('has pentatonic-to-modes exercise', async () => {
    const { getExercisesByType } = await import('../api/exercises');
    const exercises = await getExercisesByType('pentatonic');
    expect(exercises.find(e => e.id === 'pentatonic-4')).toBeDefined();
  });

  it('has mode-across-all-shapes exercise (pentatonic-5)', async () => {
    const { getExercisesByType } = await import('../api/exercises');
    const exercises = await getExercisesByType('pentatonic');
    const ex = exercises.find(e => e.id === 'pentatonic-5');
    expect(ex).toBeDefined();
    expect(ex!.title).toBe('Pentatonic to Any Scale');
    expect(ex!.type).toBe('pentatonic');
    expect(ex!.fretboardRequired).toBe(true);
  });

  it('all pentatonic exercises require fretboard', async () => {
    const { getExercisesByType } = await import('../api/exercises');
    const exercises = await getExercisesByType('pentatonic');
    for (const ex of exercises) {
      expect(ex.fretboardRequired).toBe(true);
    }
  });

  it('does not have removed all-shapes exercises', async () => {
    const { getExercisesByType } = await import('../api/exercises');
    const exercises = await getExercisesByType('pentatonic');
    expect(exercises.find(e => e.id === 'pentatonic-2')).toBeUndefined();
    expect(exercises.find(e => e.id === 'pentatonic-3')).toBeUndefined();
  });

  it('has exactly 12 pentatonic exercises', async () => {
    const { getExercisesByType } = await import('../api/exercises');
    const exercises = await getExercisesByType('pentatonic');
    // 5 minor + 5 major + 1 modes progression + 1 mode across all shapes = 12
    expect(exercises).toHaveLength(12);
  });
});

describe('Mode extension notes', () => {
  it('A Dorian extension notes differ from A Aeolian', () => {
    const dorianExts = getExtensionNoteNames('A', 'minor', 'dorian');
    const aeolianExts = getExtensionNoteNames('A', 'minor', 'aeolian');

    // A Dorian adds B and F# (natural 2 and natural 6)
    expect(dorianExts).toContain('B');
    expect(dorianExts).toContain('F#');
    expect(dorianExts).toHaveLength(2);

    // A Aeolian adds B and F (natural 2 and b6)
    expect(aeolianExts).toContain('B');
    expect(aeolianExts).toContain('F');
    expect(aeolianExts).toHaveLength(2);

    // They differ: F# vs F
    expect(dorianExts).not.toEqual(aeolianExts);
  });

  it('C Ionian extension notes differ from C Mixolydian', () => {
    const ionianExts = getExtensionNoteNames('C', 'major', 'major');
    const mixolydianExts = getExtensionNoteNames('C', 'major', 'mixolydian');

    // C Ionian adds F and B (natural 4 and major 7)
    expect(ionianExts).toContain('F');
    expect(ionianExts).toContain('B');
    expect(ionianExts).toHaveLength(2);

    // C Mixolydian adds F and Bb (natural 4 and b7)
    expect(mixolydianExts).toContain('F');
    expect(mixolydianExts).toContain('Bb');
    expect(mixolydianExts).toHaveLength(2);

    // They differ: B vs Bb
    expect(ionianExts).not.toEqual(mixolydianExts);
  });

  it('extension notes are consistent: same 2 pitch classes regardless of box', () => {
    // For A Dorian, the 2 extension chromas should be the same regardless of box
    const dorianChromas = getExtensionChromas('A', 'minor', 'dorian');
    expect(dorianChromas).toHaveLength(2);

    // The extension chromas are derived from key+mode vs key+pentatonic,
    // not from any box-specific calculation, so they are inherently the same.
    // Verify multiple keys/modes produce exactly 2 extensions.
    for (const mode of ['aeolian', 'dorian', 'phrygian']) {
      const exts = getExtensionChromas('A', 'minor', mode);
      expect(exts).toHaveLength(2);
    }
    for (const mode of ['major', 'lydian', 'mixolydian']) {
      const exts = getExtensionChromas('C', 'major', mode);
      expect(exts).toHaveLength(2);
    }
  });

  it('A Phrygian has correct extension notes (Bb and F)', () => {
    const phrygianExts = getExtensionNoteNames('A', 'minor', 'phrygian');
    // A Phrygian adds Bb (b2) and F (b6)
    expect(phrygianExts).toHaveLength(2);
    expect(phrygianExts).toContain('Bb');
    expect(phrygianExts).toContain('F');
  });

  it('C Lydian has correct extension notes (F# and B)', () => {
    const lydianExts = getExtensionNoteNames('C', 'major', 'lydian');
    // C Lydian adds F# (#4) and B (major 7)
    expect(lydianExts).toHaveLength(2);
    expect(lydianExts).toContain('F#');
    expect(lydianExts).toContain('B');
  });
});

// ---------------------------------------------------------------------------
// Extended scales (harmonic minor, melodic minor, blues)
// ---------------------------------------------------------------------------
describe('Extended scale extensions (non-clean subsets)', () => {
  it('blues is a clean extension of minor pentatonic (adds 1 note, no conflicts)', () => {
    const exts = getExtensionChromas('A', 'minor', 'blues');
    const conflicts = getConflictChromas('A', 'minor', 'blues');
    // Blues adds just Eb (b5 / blue note)
    expect(exts).toHaveLength(1);
    expect(conflicts).toHaveLength(0);
    const extNames = getExtensionNoteNames('A', 'minor', 'blues');
    expect(extNames).toContain('Eb');
  });

  it('harmonic minor has conflict with minor pentatonic (b7 vs natural 7)', () => {
    const exts = getExtensionChromas('A', 'minor', 'harmonic minor');
    const conflicts = getConflictChromas('A', 'minor', 'harmonic minor');
    // Minor pent has G (b7), harmonic minor has G# (natural 7) → 1 conflict
    expect(conflicts).toHaveLength(1);
    // G = chroma 7
    expect(conflicts[0]).toBe(7);
    // Extension notes: B (2), F (b6), G# (natural 7) = 3 notes
    expect(exts).toHaveLength(3);
    const extNames = getExtensionNoteNames('A', 'minor', 'harmonic minor');
    expect(extNames).toContain('B');
    expect(extNames).toContain('F');
    expect(extNames).toContain('G#');
  });

  it('melodic minor has conflict with minor pentatonic (b7 vs natural 7)', () => {
    const exts = getExtensionChromas('A', 'minor', 'melodic minor');
    const conflicts = getConflictChromas('A', 'minor', 'melodic minor');
    // Minor pent has G (b7), melodic minor has G# (natural 7) → 1 conflict
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toBe(7);
    // Extension notes: B (2), F# (natural 6), G# (natural 7) = 3 notes
    expect(exts).toHaveLength(3);
    const extNames = getExtensionNoteNames('A', 'minor', 'melodic minor');
    expect(extNames).toContain('B');
    expect(extNames).toContain('F#');
    expect(extNames).toContain('G#');
  });

  it('C harmonic minor extensions are correct', () => {
    const conflicts = getConflictChromas('C', 'minor', 'harmonic minor');
    const extNames = getExtensionNoteNames('C', 'minor', 'harmonic minor');
    // C minor pent: C Eb F G Bb — harmonic minor: C D Eb F G Ab B
    // Conflict: Bb (chroma 10) not in harmonic minor
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toBe(10);
    // Extensions: D, Ab, B
    expect(extNames).toHaveLength(3);
    expect(extNames).toContain('D');
    expect(extNames).toContain('Ab');
    expect(extNames).toContain('B');
  });

  it('C melodic minor extensions are correct', () => {
    const conflicts = getConflictChromas('C', 'minor', 'melodic minor');
    const extNames = getExtensionNoteNames('C', 'minor', 'melodic minor');
    // C minor pent: C Eb F G Bb — melodic minor: C D Eb F G A B
    // Conflict: Bb (chroma 10) not in melodic minor
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toBe(10);
    // Extensions: D, A, B
    expect(extNames).toHaveLength(3);
    expect(extNames).toContain('D');
    expect(extNames).toContain('A');
    expect(extNames).toContain('B');
  });

  it('diatonic modes have zero conflict notes (clean subsets)', () => {
    for (const mode of ['aeolian', 'dorian', 'phrygian']) {
      expect(getConflictChromas('A', 'minor', mode)).toHaveLength(0);
    }
    for (const mode of ['major', 'lydian', 'mixolydian']) {
      expect(getConflictChromas('C', 'major', mode)).toHaveLength(0);
    }
  });
});
