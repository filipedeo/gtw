import React from 'react';
import { Exercise } from '../types/exercise';

interface ExerciseContainerProps {
    exercise: Exercise;
}

const ExerciseContainer: React.FC<ExerciseContainerProps> = ({ exercise }) => {
    return (
        <div className='exercise-container'>
            <h1>{exercise.content.description}</h1>
            {/* Exercise specific content goes here */}
        </div>
    );
};

export default ExerciseContainer;