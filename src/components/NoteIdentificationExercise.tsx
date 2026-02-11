import React from 'react';
import { ExerciseContent } from '../types/exercise';

interface NoteIdentificationExerciseProps {
    exerciseContent: ExerciseContent;
}

const NoteIdentificationExercise: React.FC<NoteIdentificationExerciseProps> = ({ exerciseContent }) => {
    return (
        <div className='note-identification-exercise'>
            <h1>Note Identification</h1>
            <p>{exerciseContent.description}</p>
            {/* Interactive note identification logic here */}
        </div>
    );
};

export default NoteIdentificationExercise;