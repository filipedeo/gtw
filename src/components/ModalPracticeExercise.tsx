import React from 'react';
import { ExerciseContent } from '../types/exercise';

interface ModalPracticeExerciseProps {
    exerciseContent: ExerciseContent;
}

const ModalPracticeExercise: React.FC<ModalPracticeExerciseProps> = ({ exerciseContent }) => {
    return (
        <div className='modal-practice-exercise'>
            <h1>Modal Practice</h1>
            <p>{exerciseContent.description}</p>
            {/* Interactive modal practice logic here */}
        </div>
    );
};

export default ModalPracticeExercise;