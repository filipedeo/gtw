import React, { useEffect, useState } from 'react';
import { useExerciseStore } from '../stores/exerciseStore';
import { useProgressStore } from '../stores/progressStore';
import NoteIdentificationExercise from './NoteIdentificationExercise';
import ModalPracticeExercise from './ModalPracticeExercise';
import CAGEDExercise from './CAGEDExercise';
import { getExercises, getExerciseCategories } from '../api/exercises';

const ExerciseContainer: React.FC = () => {
  const { 
    exercises, 
    currentExercise, 
    exerciseIndex,
    isActive,
    setExercises, 
    setCurrentExercise,
    nextExercise,
    previousExercise,
    goToExercise,
    startExercise,
  } = useExerciseStore();
  
  const { updateStreak } = useProgressStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showInstructions, setShowInstructions] = useState(true);

  const categories = getExerciseCategories();
  
  const filteredExercises = selectedCategory === 'all' 
    ? exercises 
    : exercises.filter(ex => ex.type === selectedCategory);

  // Load exercises on mount
  useEffect(() => {
    const loadExercises = async () => {
      const data = await getExercises();
      setExercises(data);
      if (data.length > 0) {
        setCurrentExercise(data[0]);
      }
    };
    loadExercises();
    updateStreak();
  }, [setExercises, setCurrentExercise, updateStreak]);

  const renderExercise = () => {
    if (!currentExercise) {
      return (
        <div className="text-center py-12">
          <p style={{ color: 'var(--text-muted)' }}>Select an exercise to begin</p>
        </div>
      );
    }

    switch (currentExercise.type) {
      case 'note-identification':
        return <NoteIdentificationExercise exercise={currentExercise} />;
      case 'modal-practice':
        return <ModalPracticeExercise exercise={currentExercise} />;
      case 'caged-system':
        return <CAGEDExercise exercise={currentExercise} />;
      default:
        return (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🚧</div>
            <p style={{ color: 'var(--text-secondary)' }}>
              Exercise type "{currentExercise.type}" coming soon!
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              This exercise is being developed. Try Note Identification or Modal Practice for now.
            </p>
          </div>
        );
    }
  };

  const currentFilteredIndex = filteredExercises.findIndex(ex => ex.id === currentExercise?.id);

  return (
    <div className="card">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-4 pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            selectedCategory === 'all' ? 'btn-primary' : ''
          }`}
          style={selectedCategory !== 'all' ? { 
            backgroundColor: 'var(--bg-tertiary)', 
            color: 'var(--text-secondary)' 
          } : {}}
        >
          All ({exercises.length})
        </button>
        {categories.map(cat => (
          <button
            key={cat.type}
            onClick={() => setSelectedCategory(cat.type)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedCategory === cat.type ? 'btn-primary' : ''
            }`}
            style={selectedCategory !== cat.type ? { 
              backgroundColor: 'var(--bg-tertiary)', 
              color: 'var(--text-secondary)' 
            } : {}}
          >
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>

      {/* Exercise Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={previousExercise}
            disabled={exerciseIndex === 0}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-sm px-4" style={{ color: 'var(--text-muted)' }}>
            {exerciseIndex + 1} / {exercises.length}
          </span>
          <button
            onClick={nextExercise}
            disabled={exerciseIndex === exercises.length - 1}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
        
        {/* Exercise Selector Dropdown */}
        <select
          value={exerciseIndex}
          onChange={(e) => goToExercise(parseInt(e.target.value))}
          className="px-3 py-2 rounded-lg text-sm max-w-[200px] sm:max-w-[300px]"
          style={{ 
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}
        >
          {exercises.map((ex, idx) => (
            <option key={ex.id} value={idx}>
              {ex.title}
            </option>
          ))}
        </select>
      </div>

      {/* Current Exercise Header */}
      {currentExercise && (
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {currentExercise.title}
              </h2>
              <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                {currentExercise.description}
              </p>
            </div>
            <div className="flex gap-2 ml-4">
              {[1, 2, 3, 4, 5].map(level => (
                <span
                  key={level}
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: level <= currentExercise.difficulty 
                      ? 'var(--accent-primary)' 
                      : 'var(--bg-tertiary)'
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Instructions (collapsible) */}
          {currentExercise.instructions && currentExercise.instructions.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="flex items-center gap-2 text-sm font-medium"
                style={{ color: 'var(--accent-primary)' }}
              >
                <span>{showInstructions ? '▼' : '▶'}</span>
                <span>Instructions</span>
              </button>
              
              {showInstructions && (
                <div 
                  className="mt-2 p-4 rounded-lg animate-fade-in"
                  style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                >
                  <ul className="list-disc list-inside text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                    {currentExercise.instructions.map((instruction, idx) => (
                      <li key={idx}>{instruction}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Exercise Content */}
      <div className="min-h-[200px]">
        {renderExercise()}
      </div>

      {/* Start/Reset Button */}
      {currentExercise && !isActive && (
        <div className="mt-6 text-center">
          <button
            onClick={startExercise}
            className="btn-primary px-8 py-3 text-lg"
          >
            ▶ Start Exercise
          </button>
        </div>
      )}
    </div>
  );
};

export default ExerciseContainer;