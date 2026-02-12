import { describe, it, expect, beforeEach } from 'vitest';
import { useGuitarStore } from '../stores/guitarStore';
import { STANDARD_TUNINGS } from '../types/guitar';

const initialState = {
  stringCount: 6 as const,
  tuning: STANDARD_TUNINGS['standard-6'],
  fretCount: 22,
  displayMode: 'notes' as const,
  highlightedPositions: [],
  secondaryHighlightedPositions: [],
  rootNote: null,
  showAllNotes: false,
};

describe('guitarStore', () => {
  beforeEach(() => {
    useGuitarStore.setState(initialState);
  });

  it('setStringCount(7) switches tuning to standard-7', () => {
    useGuitarStore.getState().setStringCount(7);
    const state = useGuitarStore.getState();
    expect(state.stringCount).toBe(7);
    expect(state.tuning).toEqual(STANDARD_TUNINGS['standard-7']);
  });

  it('setStringCount(6) switches tuning to standard-6', () => {
    useGuitarStore.setState({ stringCount: 7, tuning: STANDARD_TUNINGS['standard-7'] });
    useGuitarStore.getState().setStringCount(6);
    const state = useGuitarStore.getState();
    expect(state.stringCount).toBe(6);
    expect(state.tuning).toEqual(STANDARD_TUNINGS['standard-6']);
  });

  it('setStringCount clears highlights and rootNote', () => {
    useGuitarStore.setState({
      highlightedPositions: [{ string: 1, fret: 3 }],
      secondaryHighlightedPositions: [{ string: 2, fret: 5 }],
      rootNote: 'A',
    });
    useGuitarStore.getState().setStringCount(7);
    const state = useGuitarStore.getState();
    expect(state.highlightedPositions).toEqual([]);
    expect(state.secondaryHighlightedPositions).toEqual([]);
    expect(state.rootNote).toBeNull();
  });

  it('setDisplayMode updates displayMode', () => {
    useGuitarStore.getState().setDisplayMode('intervals');
    expect(useGuitarStore.getState().displayMode).toBe('intervals');
    useGuitarStore.getState().setDisplayMode('degrees');
    expect(useGuitarStore.getState().displayMode).toBe('degrees');
  });

  it('toggleShowAllNotes toggles boolean', () => {
    expect(useGuitarStore.getState().showAllNotes).toBe(false);
    useGuitarStore.getState().toggleShowAllNotes();
    expect(useGuitarStore.getState().showAllNotes).toBe(true);
    useGuitarStore.getState().toggleShowAllNotes();
    expect(useGuitarStore.getState().showAllNotes).toBe(false);
  });

  it('clearHighlights resets positions and rootNote', () => {
    useGuitarStore.setState({
      highlightedPositions: [{ string: 1, fret: 5 }],
      secondaryHighlightedPositions: [{ string: 2, fret: 7 }],
      rootNote: 'E',
    });
    useGuitarStore.getState().clearHighlights();
    const state = useGuitarStore.getState();
    expect(state.highlightedPositions).toEqual([]);
    expect(state.secondaryHighlightedPositions).toEqual([]);
    expect(state.rootNote).toBeNull();
  });

  it('setHighlightedPositions stores array', () => {
    const positions = [{ string: 1, fret: 3 }, { string: 2, fret: 5 }];
    useGuitarStore.getState().setHighlightedPositions(positions);
    expect(useGuitarStore.getState().highlightedPositions).toEqual(positions);
  });
});
