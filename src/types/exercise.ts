export type Exercise = {
    id: string;
    type: ExerciseType;
    content: ExerciseContent;
};

export enum ExerciseType {
    NoteIdentification,
    ModalPractice
}

export type ExerciseState = {
    currentExercise: Exercise | null;
    completedExercises: Exercise[];
};

export type ExerciseContent = {
    description: string;
    data: any; // Specific to the type of exercise
};