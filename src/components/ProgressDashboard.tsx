import React from 'react';
import { useProgressStore } from '../stores/progressStore';

const ProgressDashboard: React.FC = () => {
    const { userProgress } = useProgressStore();

    return (
        <div className='progress-dashboard'>
            <h1>Progress Dashboard</h1>
            <p>Exercises Completed: {userProgress.exercisesCompleted}</p>
            <p>Last Session Date: {userProgress.lastSessionDate.toDateString()}</p>
        </div>
    );
};

export default ProgressDashboard;