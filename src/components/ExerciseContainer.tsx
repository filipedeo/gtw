import React, { useEffect, useState, useMemo, useRef, lazy, Suspense } from 'react';
import { useExerciseStore } from '../stores/exerciseStore';
import { useProgressStore } from '../stores/progressStore';
import { useGuitarStore } from '../stores/guitarStore';
import { getExercises, formatTypeLabel } from '../api/exercises';
import { useSwipe } from '../hooks/useSwipe';
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
const ChordProgressionExercise = lazy(() => import('./ChordProgressionExercise'));
const JamModeExercise = lazy(() => import('./JamModeExercise'));
const ArpeggioExercise = lazy(() => import('./ArpeggioExercise'));
const WalkingBassExercise = lazy(() => import('./WalkingBassExercise'));
const BassPositionExercise = lazy(() => import('./BassPositionExercise'));
const ChordScaleExercise = lazy(() => import('./ChordScaleExercise'));

const ExerciseContainer: React.FC = () => {
  const {
    exercises,
    currentExercise,
    setExercises,
    setCurrentExercise,
    selectedCategory,
    setSelectedCategory,
  } = useExerciseStore();

  const { instrument } = useGuitarStore();
  const { updateStreak } = useProgressStore();
  const [showInstructions, setShowInstructions] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter exercises by instrument first, then derive categories from that
  const instrumentExercises = useMemo(() =>
    exercises.filter(ex => {
      const instruments = ex.instruments ?? ['guitar', 'bass'];
      return instruments.includes(instrument);
    }),
    [exercises, instrument]
  );

  const categories = useMemo(() => {
    const seen = new Map<string, number>();
    for (const ex of instrumentExercises) {
      seen.set(ex.type, (seen.get(ex.type) ?? 0) + 1);
    }
    return Array.from(seen.entries()).map(([type, count]) => ({
      type,
      label: formatTypeLabel(type),
      count,
    }));
  }, [instrumentExercises]);

  const filteredExercises = useMemo(() =>
    selectedCategory === 'all'
      ? instrumentExercises
      : instrumentExercises.filter(ex => ex.type === selectedCategory),
    [instrumentExercises, selectedCategory]
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

  // When instrument changes, reset to 'all' if current category is empty for new instrument
  useEffect(() => {
    if (selectedCategory !== 'all') {
      const hasExercises = instrumentExercises.some(ex => ex.type === selectedCategory);
      if (!hasExercises) {
        setSelectedCategory('all');
      }
    }
  }, [instrument, instrumentExercises, selectedCategory, setSelectedCategory]);

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

  // Swipe navigation for mobile
  useSwipe(containerRef, {
    onSwipeLeft: goToNextFiltered,
    onSwipeRight: goToPreviousFiltered,
  });

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
      case 'chord-progression':
        return <ChordProgressionExercise exercise={currentExercise} />;
      case 'jam-mode':
        return <JamModeExercise exercise={currentExercise} />;
      case 'arpeggio':
        return <ArpeggioExercise exercise={currentExercise} />;
      case 'bass-technique':
        if (currentExercise.id.startsWith('bass-walk')) return <WalkingBassExercise exercise={currentExercise} />;
        return <BassPositionExercise exercise={currentExercise} />;
      case 'chord-scale':
        return <ChordScaleExercise exercise={currentExercise} />;
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
    <div ref={containerRef} className="card" data-exercise-container>
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
          All ({instrumentExercises.length})
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
        <ErrorBoundary key={currentExercise?.id}>
          <Suspense fallback={<LoadingSpinner message="Loading exercise..." />}>
            {renderExercise()}
          </Suspense>
        </ErrorBoundary>
      </div>

    </div>
  );
};

export default ExerciseContainer;
