import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Instrument, Tuning, DisplayMode, FretPosition, STANDARD_TUNINGS } from '../types/guitar';

interface GuitarState {
  // Config
  instrument: Instrument;
  stringCount: 4 | 5 | 6 | 7;
  tuning: Tuning;
  fretCount: number;
  displayMode: DisplayMode;

  // Fretboard state
  highlightedPositions: FretPosition[];
  secondaryHighlightedPositions: FretPosition[];
  rootNote: string | null;
  showAllNotes: boolean;

  // Actions
  setInstrument: (instrument: Instrument) => void;
  setStringCount: (count: 4 | 5 | 6 | 7) => void;
  setTuning: (tuning: Tuning) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setHighlightedPositions: (positions: FretPosition[]) => void;
  setSecondaryHighlightedPositions: (positions: FretPosition[]) => void;
  setRootNote: (note: string | null) => void;
  toggleShowAllNotes: () => void;
  clearHighlights: () => void;
}

export const useGuitarStore = create<GuitarState>()(
  persist(
    (set) => ({
      // Default config
      instrument: 'guitar',
      stringCount: 6,
      tuning: STANDARD_TUNINGS['standard-6'],
      fretCount: 22,
      displayMode: 'notes',

      // Default fretboard state
      highlightedPositions: [],
      secondaryHighlightedPositions: [],
      rootNote: null,
      showAllNotes: false,

      // Actions
      setInstrument: (instrument) => set(() => {
        if (instrument === 'bass') {
          return {
            instrument,
            stringCount: 4 as const,
            tuning: STANDARD_TUNINGS['bass-standard-4'],
            highlightedPositions: [],
            secondaryHighlightedPositions: [],
            rootNote: null,
          };
        }
        return {
          instrument,
          stringCount: 6 as const,
          tuning: STANDARD_TUNINGS['standard-6'],
          highlightedPositions: [],
          secondaryHighlightedPositions: [],
          rootNote: null,
        };
      }),

      setStringCount: (count) => set((state) => {
        let tuning: Tuning;
        if (state.instrument === 'bass') {
          if (count === 5) tuning = STANDARD_TUNINGS['bass-standard-5'];
          else if (count === 6) tuning = STANDARD_TUNINGS['bass-standard-6'];
          else tuning = STANDARD_TUNINGS['bass-standard-4'];
        } else {
          tuning = count === 7 ? STANDARD_TUNINGS['standard-7'] : STANDARD_TUNINGS['standard-6'];
        }
        return {
          stringCount: count,
          tuning,
          highlightedPositions: [],
          secondaryHighlightedPositions: [],
          rootNote: null,
        };
      }),

      setTuning: (tuning) => set({ tuning }),

      setDisplayMode: (mode) => set({ displayMode: mode }),

      setHighlightedPositions: (positions) => set({ highlightedPositions: positions }),

      setSecondaryHighlightedPositions: (positions) => set({ secondaryHighlightedPositions: positions }),

      setRootNote: (note) => set({ rootNote: note }),

      toggleShowAllNotes: () => set((state) => ({ showAllNotes: !state.showAllNotes })),

      clearHighlights: () => set({ highlightedPositions: [], secondaryHighlightedPositions: [], rootNote: null }),
    }),
    {
      name: 'guitar-config',
      partialize: (state) => ({
        instrument: state.instrument,
        stringCount: state.stringCount,
        tuning: state.tuning,
        fretCount: state.fretCount,
        displayMode: state.displayMode,
        showAllNotes: state.showAllNotes,
      }),
    }
  )
);
