import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Tuning, DisplayMode, FretPosition, STANDARD_TUNINGS } from '../types/guitar';

interface GuitarState {
  // Config
  stringCount: 6 | 7;
  tuning: Tuning;
  fretCount: number;
  displayMode: DisplayMode;
  
  // Fretboard state
  highlightedPositions: FretPosition[];
  rootNote: string | null;
  showAllNotes: boolean;
  
  // Actions
  setStringCount: (count: 6 | 7) => void;
  setTuning: (tuning: Tuning) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setHighlightedPositions: (positions: FretPosition[]) => void;
  setRootNote: (note: string | null) => void;
  toggleShowAllNotes: () => void;
  clearHighlights: () => void;
}

export const useGuitarStore = create<GuitarState>()(
  persist(
    (set) => ({
      // Default config
      stringCount: 6,
      tuning: STANDARD_TUNINGS['standard-6'],
      fretCount: 22,
      displayMode: 'notes',
      
      // Default fretboard state
      highlightedPositions: [],
      rootNote: null,
      showAllNotes: false,
      
      // Actions
      setStringCount: (count) => set(() => ({
        stringCount: count,
        tuning: count === 7 ? STANDARD_TUNINGS['standard-7'] : STANDARD_TUNINGS['standard-6'],
        highlightedPositions: [],
        rootNote: null,
      })),
      
      setTuning: (tuning) => set({ tuning }),
      
      setDisplayMode: (mode) => set({ displayMode: mode }),
      
      setHighlightedPositions: (positions) => set({ highlightedPositions: positions }),
      
      setRootNote: (note) => set({ rootNote: note }),
      
      toggleShowAllNotes: () => set((state) => ({ showAllNotes: !state.showAllNotes })),
      
      clearHighlights: () => set({ highlightedPositions: [], rootNote: null }),
    }),
    {
      name: 'guitar-config',
      partialize: (state) => ({
        stringCount: state.stringCount,
        tuning: state.tuning,
        fretCount: state.fretCount,
        displayMode: state.displayMode,
      }),
    }
  )
);