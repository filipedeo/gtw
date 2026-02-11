import React from 'react';
import { FretPosition, Note } from '../types/guitar';

interface FretboardProps {
    numberOfStrings: number;
    tuning: Note[];
}

const Fretboard: React.FC<FretboardProps> = ({ numberOfStrings, tuning }) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Drawing logic here
    }, [numberOfStrings, tuning]);

    return (
        <canvas ref={canvasRef} width="800" height="300"></canvas>
    );
};

export default Fretboard;