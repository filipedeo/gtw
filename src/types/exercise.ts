import { FretPosition, Note } from './guitar';

export type ExerciseType =
  | 'note-identification'
  | 'modal-practice'
  | 'interval-recognition'
  | 'chord-voicing'
  | 'ear-training'
  | 'caged-system'
  | 'three-nps'
  | 'pentatonic'
  | 'chord-progression';

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type Exercise = {
  id: string;
  type: ExerciseType;
  title: string;
  description: string;
  difficulty: Difficulty;
  instructions: string[];
  audioRequired: boolean;
  fretboardRequired: boolean;
};

export type NoteIdentificationContent = {
  targetPosition: FretPosition;
  options: string[];
  correctAnswer: string;
  timeLimit?: number;
};

export type ModalPracticeContent = {
  mode: string;
  key: string;
  characteristicNote: string;
  scaleNotes: string[];
  droneNote: string;
  positions: FretPosition[];
};

export type IntervalContent = {
  interval: string;
  rootNote: Note;
  targetNote: Note;
  positions: FretPosition[];
};

export type ChordVoicingContent = {
  chordName: string;
  voicingType: 'drop2' | 'drop3' | 'triad';
  inversion: number;
  positions: FretPosition[];
  notes: string[];
};

export type CAGEDContent = {
  shape: 'C' | 'A' | 'G' | 'E' | 'D';
  key: string;
  chordPositions: FretPosition[];
  scalePositions: FretPosition[];
  rootPositions: FretPosition[];
  thirdPositions: FretPosition[];
  fifthPositions: FretPosition[];
};

export type ExerciseContent = 
  | NoteIdentificationContent 
  | ModalPracticeContent 
  | IntervalContent 
  | ChordVoicingContent
  | CAGEDContent;

export type ExerciseState = {
  currentExercise: Exercise | null;
  currentContent: ExerciseContent | null;
  isActive: boolean;
  startTime: number | null;
  attempts: number;
  correctAnswers: number;
};

export type ExerciseResult = {
  exerciseId: string;
  score: number;
  timeSpent: number;
  attempts: number;
  completedAt: Date;
};