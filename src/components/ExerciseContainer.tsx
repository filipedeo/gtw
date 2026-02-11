import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useExerciseStore } from '../stores/exerciseStore';
import { useProgressStore } from '../stores/progressStore';
import { getExercises, getExerciseCategories } from '../api/exercises';
import LoadingSpinner from './LoadingSpinner';
import ErrorBoundary from './ErrorBoundary';

// Lazy load exercise components for code splitting
const NoteIdentificationExercise = lazy(() => import('./NoteIdentificationExercise'));
const ModalPracticeExercise = lazy(() => import('./ModalPracticeExercise'));
const CAGEDExercise = lazy(() => import('./CAGEDExercise'));
const IntervalRecognitionExercise = lazy(() => import('./IntervalRecognitionExercise'));
const ChordVoicingExercise = lazy(() => import('./ChordVoicingExercise'));
const EarTrainingExercise = lazy(() => import('./EarTrainingExercise'));
const ThreeNPSExercise = lazy(() => import('./ThreeNPSExercise'));
const PentatonicExercise = lazy(() => import('./PentatonicExercise'));

const ExerciseContainer: React.FC = () => {
  const { 
    exercises, 
    currentExercise, 
    isActive,
    setExercises, 
    setCurrentExercise,
    startExercise,
  } = useExerciseStore();
  
  const { updateStreak } = useProgressStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showInstructions, setShowInstructions] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const categories = getExerciseCategories();
  
  const filteredExercises = useMemo(() => 
    selectedCategory === 'all' 
      ? exercises 
      : exercises.filter(ex => ex.type === selectedCategory),
    [exercises, selectedCategory]
  );

  // Calculate the current index within the filtered list
  const filteredIndex = useMemo(() => {
    if (!currentExercise) return -1;
    return filteredExercises.findIndex(ex => ex.id === currentExercise.id);
  }, [filteredExercises, currentExercise]);

  // Load exercises on mount
  useEffect(() => {
    const loadExercises = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await getExercises();
        setExercises(data);
        if (data.length > 0) {
          setCurrentExercise(data[0]);
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Failed to load exercises');
      } finally {
        setIsLoading(false);
      }
    };
    loadExercises();
    updateStreak();
  }, [setExercises, setCurrentExercise, updateStreak]);

  // Retry loading exercises
  const handleRetryLoad = () => {
    setLoadError(null);
    setIsLoading(true);
    getExercises()
      .then((data) => {
        setExercises(data);
        if (data.length > 0) {
          setCurrentExercise(data[0]);
        }
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : 'Failed to load exercises');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // When category changes, if current exercise is not in filtered list, select first filtered exercise
  useEffect(() => {
    if (filteredExercises.length > 0 && filteredIndex === -1) {
      setCurrentExercise(filteredExercises[0]);
    }
  }, [filteredExercises, filteredIndex, setCurrentExercise]);

  // Navigate to previous exercise within filtered list
  const goToPreviousFiltered = () => {
    if (filteredIndex > 0) {
      setCurrentExercise(filteredExercises[filteredIndex - 1]);
    }
  };

  // Navigate to next exercise within filtered list
  const goToNextFiltered = () => {
    if (filteredIndex < filteredExercises.length - 1) {
      setCurrentExercise(filteredExercises[filteredIndex + 1]);
    }
  };

  // Go to a specific exercise by its index in the filtered list
  const goToFilteredExercise = (index: number) => {
    if (index >= 0 && index < filteredExercises.length) {
      setCurrentExercise(filteredExercises[index]);
    }
  };

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
      case 'interval-recognition':
        return <IntervalRecognitionExercise exercise={currentExercise} />;
      case 'chord-voicing':
        return <ChordVoicingExercise exercise={currentExercise} />;
      case 'ear-training':
        return <EarTrainingExercise exercise={currentExercise} />;
      case 'three-nps':
        return <ThreeNPSExercise exercise={currentExercise} />;
      case 'pentatonic':
        return <PentatonicExercise exercise={currentExercise} />;
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

  // Show loading state while fetching exercises
  if (isLoading) {
    return (
      <div className="card">
        <LoadingSpinner message="Loading exercises..." size="lg" />
      </div>
    );
  }

  // Show error state if loading failed
  if (loadError) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div 
            className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--error)', color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}
          >
            !
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Failed to Load Exercises
          </h3>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
            {loadError}
          </p>
          <button onClick={handleRetryLoad} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
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
            onClick={goToPreviousFiltered}
            disabled={filteredIndex <= 0}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-sm px-4" style={{ color: 'var(--text-muted)' }}>
            {filteredExercises.length > 0 ? filteredIndex + 1 : 0} / {filteredExercises.length}
          </span>
          <button
            onClick={goToNextFiltered}
            disabled={filteredIndex >= filteredExercises.length - 1}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
        
        {/* Exercise Selector Dropdown */}
        <select
          value={filteredIndex >= 0 ? filteredIndex : ''}
          onChange={(e) => goToFilteredExercise(parseInt(e.target.value))}
          className="px-3 py-2 rounded-lg text-sm max-w-[200px] sm:max-w-[300px]"
          style={{ 
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}
        >
          {filteredExercises.map((ex, idx) => (
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
        <Suspense fallback={<LoadingSpinner message="Loading exercise..." />}>
          {renderExercise()}
        </Suspense>
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
    </ErrorBoundary>
  );
};

export default ExerciseContainer;
