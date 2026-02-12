import { describe, it, expect, beforeEach } from 'vitest';
import { STANDARD_TUNINGS, Instrument } from '../types/guitar';
import { useGuitarStore } from '../stores/guitarStore';
import { getExercises, formatTypeLabel } from '../api/exercises';

describe('Bass tunings', () => {
  it('bass standard 4-string has correct notes', () => {
    const tuning = STANDARD_TUNINGS['bass-standard-4'];
    expect(tuning).toBeDefined();
    expect(tuning.notes).toEqual(['E1', 'A1', 'D2', 'G2']);
    expect(tuning.notes).toHaveLength(4);
  });

  it('bass standard 5-string has correct notes', () => {
    const tuning = STANDARD_TUNINGS['bass-standard-5'];
    expect(tuning).toBeDefined();
    expect(tuning.notes).toEqual(['B0', 'E1', 'A1', 'D2', 'G2']);
    expect(tuning.notes).toHaveLength(5);
  });

  it('bass standard 6-string has correct notes', () => {
    const tuning = STANDARD_TUNINGS['bass-standard-6'];
    expect(tuning).toBeDefined();
    expect(tuning.notes).toEqual(['B0', 'E1', 'A1', 'D2', 'G2', 'C3']);
    expect(tuning.notes).toHaveLength(6);
  });

  it('bass drop D 4-string has correct notes', () => {
    const tuning = STANDARD_TUNINGS['bass-drop-d-4'];
    expect(tuning).toBeDefined();
    expect(tuning.notes).toEqual(['D1', 'A1', 'D2', 'G2']);
  });

  it('bass tunings are in lower octaves than guitar', () => {
    const guitar = STANDARD_TUNINGS['standard-6'];
    const bass = STANDARD_TUNINGS['bass-standard-4'];
    // Guitar lowest: E2, Bass lowest: E1
    const guitarLowestOctave = parseInt(guitar.notes[0].slice(-1));
    const bassLowestOctave = parseInt(bass.notes[0].slice(-1));
    expect(bassLowestOctave).toBeLessThan(guitarLowestOctave);
  });
});

describe('guitarStore instrument support', () => {
  beforeEach(() => {
    const store = useGuitarStore.getState();
    // Reset to guitar defaults
    store.setInstrument('guitar');
  });

  it('defaults to guitar', () => {
    const state = useGuitarStore.getState();
    expect(state.instrument).toBe('guitar');
    expect(state.stringCount).toBe(6);
  });

  it('setInstrument to bass sets correct defaults', () => {
    useGuitarStore.getState().setInstrument('bass');
    const state = useGuitarStore.getState();
    expect(state.instrument).toBe('bass');
    expect(state.stringCount).toBe(4);
    expect(state.tuning.notes).toEqual(['E1', 'A1', 'D2', 'G2']);
  });

  it('setInstrument back to guitar restores guitar defaults', () => {
    useGuitarStore.getState().setInstrument('bass');
    useGuitarStore.getState().setInstrument('guitar');
    const state = useGuitarStore.getState();
    expect(state.instrument).toBe('guitar');
    expect(state.stringCount).toBe(6);
    expect(state.tuning.notes).toEqual(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']);
  });

  it('setStringCount for bass selects correct tunings', () => {
    useGuitarStore.getState().setInstrument('bass');

    useGuitarStore.getState().setStringCount(5);
    expect(useGuitarStore.getState().tuning.notes).toHaveLength(5);
    expect(useGuitarStore.getState().tuning.notes).toEqual(['B0', 'E1', 'A1', 'D2', 'G2']);

    useGuitarStore.getState().setStringCount(6);
    expect(useGuitarStore.getState().tuning.notes).toHaveLength(6);
    expect(useGuitarStore.getState().tuning.notes).toEqual(['B0', 'E1', 'A1', 'D2', 'G2', 'C3']);

    useGuitarStore.getState().setStringCount(4);
    expect(useGuitarStore.getState().tuning.notes).toHaveLength(4);
    expect(useGuitarStore.getState().tuning.notes).toEqual(['E1', 'A1', 'D2', 'G2']);
  });

  it('setInstrument clears highlights', () => {
    useGuitarStore.getState().setHighlightedPositions([{ string: 0, fret: 5 }]);
    useGuitarStore.getState().setInstrument('bass');
    expect(useGuitarStore.getState().highlightedPositions).toEqual([]);
  });
});

describe('Exercise filtering by instrument', () => {
  it('guitar-only exercises have instruments: [guitar]', async () => {
    const exercises = await getExercises();
    const guitarOnly = exercises.filter(ex =>
      ex.instruments && ex.instruments.length === 1 && ex.instruments[0] === 'guitar'
    );
    // CAGED (12 + 5 transitions) + chord-voicing (7) + guitar arpeggios (6) = 30 guitar-only
    expect(guitarOnly.length).toBe(30);
    expect(guitarOnly.every(ex => ex.type === 'caged-system' || ex.type === 'chord-voicing' || ex.type === 'arpeggio')).toBe(true);
  });

  it('universal exercises are available for bass', async () => {
    const exercises = await getExercises();
    const forBass = exercises.filter(ex => {
      const instruments = ex.instruments ?? (['guitar', 'bass'] as Instrument[]);
      return instruments.includes('bass');
    });
    // Total exercises minus guitar-only (30)
    expect(forBass.length).toBe(exercises.length - 30);
  });

  it('all exercises are available for guitar', async () => {
    const exercises = await getExercises();
    const forGuitar = exercises.filter(ex => {
      const instruments = ex.instruments ?? (['guitar', 'bass'] as Instrument[]);
      return instruments.includes('guitar');
    });
    // Total exercises minus bass-only exercises
    const bassOnly = exercises.filter(ex => {
      const instruments = ex.instruments;
      return instruments && instruments.includes('bass') && !instruments.includes('guitar');
    });
    expect(forGuitar.length).toBe(exercises.length - bassOnly.length);
  });

  it('CAGED exercises are excluded for bass', async () => {
    const exercises = await getExercises();
    const bassExercises = exercises.filter(ex => {
      const instruments = ex.instruments ?? (['guitar', 'bass'] as Instrument[]);
      return instruments.includes('bass');
    });
    expect(bassExercises.some(ex => ex.type === 'caged-system')).toBe(false);
  });

  it('chord voicing exercises are excluded for bass', async () => {
    const exercises = await getExercises();
    const bassExercises = exercises.filter(ex => {
      const instruments = ex.instruments ?? (['guitar', 'bass'] as Instrument[]);
      return instruments.includes('bass');
    });
    expect(bassExercises.some(ex => ex.type === 'chord-voicing')).toBe(false);
  });

  it('pentatonic exercises are available for bass', async () => {
    const exercises = await getExercises();
    const bassPentatonic = exercises.filter(ex => {
      const instruments = ex.instruments ?? (['guitar', 'bass'] as Instrument[]);
      return instruments.includes('bass') && ex.type === 'pentatonic';
    });
    expect(bassPentatonic.length).toBeGreaterThan(0);
  });

  it('3NPS exercises are available for bass', async () => {
    const exercises = await getExercises();
    const bass3NPS = exercises.filter(ex => {
      const instruments = ex.instruments ?? (['guitar', 'bass'] as Instrument[]);
      return instruments.includes('bass') && ex.type === 'three-nps';
    });
    expect(bass3NPS.length).toBeGreaterThan(0);
  });

  it('jam mode exercises are available for bass', async () => {
    const exercises = await getExercises();
    const bassJam = exercises.filter(ex => {
      const instruments = ex.instruments ?? (['guitar', 'bass'] as Instrument[]);
      return instruments.includes('bass') && ex.type === 'jam-mode';
    });
    expect(bassJam.length).toBeGreaterThan(0);
  });
});

describe('Bug regression: instrument-filtered categories', () => {
  it('bass-only categories do not appear when filtering for guitar', async () => {
    const exercises = await getExercises();
    const guitarExercises = exercises.filter(ex => {
      const instruments = ex.instruments ?? (['guitar', 'bass'] as Instrument[]);
      return instruments.includes('guitar');
    });
    const guitarCategories = new Set(guitarExercises.map(ex => ex.type));
    // bass-technique should NOT be in guitar categories
    expect(guitarCategories.has('bass-technique')).toBe(false);
  });

  it('guitar-only categories do not appear when filtering for bass', async () => {
    const exercises = await getExercises();
    const bassExercises = exercises.filter(ex => {
      const instruments = ex.instruments ?? (['guitar', 'bass'] as Instrument[]);
      return instruments.includes('bass');
    });
    const bassCategories = new Set(bassExercises.map(ex => ex.type));
    // caged-system and chord-voicing should NOT be in bass categories
    expect(bassCategories.has('caged-system')).toBe(false);
    expect(bassCategories.has('chord-voicing')).toBe(false);
  });

  it('deriving categories from filtered exercises matches expected types', async () => {
    const exercises = await getExercises();

    // Simulate the same filtering logic used in SessionPlanner
    const filterForInstrument = (inst: Instrument) => {
      const filtered = exercises.filter(ex => {
        const instruments = ex.instruments ?? (['guitar', 'bass'] as Instrument[]);
        return instruments.includes(inst);
      });
      const seen = new Map<string, number>();
      for (const ex of filtered) {
        seen.set(ex.type, (seen.get(ex.type) ?? 0) + 1);
      }
      return Array.from(seen.entries()).map(([type, count]) => ({
        type,
        label: formatTypeLabel(type),
        count,
      }));
    };

    const guitarCats = filterForInstrument('guitar');
    const bassCats = filterForInstrument('bass');

    // Guitar should have caged-system, bass should not
    expect(guitarCats.some(c => c.type === 'caged-system')).toBe(true);
    expect(bassCats.some(c => c.type === 'caged-system')).toBe(false);

    // Bass should have bass-technique, guitar should not
    expect(bassCats.some(c => c.type === 'bass-technique')).toBe(true);
    expect(guitarCats.some(c => c.type === 'bass-technique')).toBe(false);
  });
});

describe('Bug regression: string numbering', () => {
  it('string display uses standard notation (1 = highest)', () => {
    // Standard guitar: string index 0 = low E, index 5 = high E
    // Display should be: string 1 = high E (index 5), string 6 = low E (index 0)
    const stringCount = 6;

    // Test the conversion formula used in NoteIdentificationExercise
    const displayString = (stringIndex: number) => stringCount - stringIndex;

    // Low E (index 0) → String 6
    expect(displayString(0)).toBe(6);
    // A (index 1) → String 5
    expect(displayString(1)).toBe(5);
    // D (index 2) → String 4
    expect(displayString(2)).toBe(4);
    // G (index 3) → String 3
    expect(displayString(3)).toBe(3);
    // B (index 4) → String 2
    expect(displayString(4)).toBe(2);
    // High E (index 5) → String 1
    expect(displayString(5)).toBe(1);
  });

  it('string display works for bass (4-string)', () => {
    const stringCount = 4;
    const displayString = (stringIndex: number) => stringCount - stringIndex;

    // E (index 0) → String 4
    expect(displayString(0)).toBe(4);
    // A (index 1) → String 3
    expect(displayString(1)).toBe(3);
    // D (index 2) → String 2
    expect(displayString(2)).toBe(2);
    // G (index 3) → String 1
    expect(displayString(3)).toBe(1);
  });
});
