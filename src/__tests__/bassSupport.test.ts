import { describe, it, expect, beforeEach } from 'vitest';
import { STANDARD_TUNINGS, Instrument } from '../types/guitar';
import { useGuitarStore } from '../stores/guitarStore';
import { getExercises } from '../api/exercises';

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
    // CAGED (12) + chord-voicing (7) + guitar arpeggios (6) = 25 guitar-only
    expect(guitarOnly.length).toBe(25);
    expect(guitarOnly.every(ex => ex.type === 'caged-system' || ex.type === 'chord-voicing' || ex.type === 'arpeggio')).toBe(true);
  });

  it('universal exercises are available for bass', async () => {
    const exercises = await getExercises();
    const forBass = exercises.filter(ex => {
      const instruments = ex.instruments ?? (['guitar', 'bass'] as Instrument[]);
      return instruments.includes('bass');
    });
    // Total exercises minus guitar-only (25)
    expect(forBass.length).toBe(exercises.length - 25);
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
