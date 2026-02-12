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

export type ExerciseResult = {
  exerciseId: string;
  score: number;
  timeSpent: number;
  attempts: number;
  completedAt: Date;
};
