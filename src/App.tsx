import { useState, useEffect } from 'react'
import Fretboard from './components/Fretboard'
import ExerciseContainer from './components/ExerciseContainer'
import AudioControls from './components/AudioControls'
import ProgressDashboard from './components/ProgressDashboard'
import SettingsPanel from './components/SettingsPanel'
import ThemeToggle from './components/ThemeToggle'
import { useGuitarStore } from './stores/guitarStore'
import { useExerciseStore } from './stores/exerciseStore'
import { useThemeStore } from './stores/themeStore'

function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [showAudioControls, setShowAudioControls] = useState(false)
  const { stringCount } = useGuitarStore()
  const { currentExercise } = useExerciseStore()
  const { resolvedTheme, setTheme, theme } = useThemeStore()

  // Initialize theme on mount
  useEffect(() => {
    setTheme(theme)
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }} className="sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎸</span>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Guitar Theory
              </h1>
            </div>
            <span 
              className="text-xs px-2 py-1 rounded-full font-mono"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              {stringCount}-string
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setShowAudioControls(!showAudioControls)}
              className="btn-secondary flex items-center gap-2"
            >
              <span>🔊</span>
              <span className="hidden sm:inline">Audio</span>
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="btn-secondary flex items-center gap-2"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-4 py-6">
        {/* Fretboard - Full Width */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Fretboard
            </h2>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              <span>Click any note to hear it</span>
            </div>
          </div>
          <Fretboard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Exercise */}
          <div className="lg:col-span-2 space-y-6">
            <ExerciseContainer />
          </div>

          {/* Right Column - Progress & Info */}
          <div className="space-y-6">
            <ProgressDashboard />
            
            {currentExercise && (
              <div className="card">
                <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Exercise Info
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {currentExercise.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span 
                    className="text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: 'var(--accent-primary)', color: 'white', opacity: 0.9 }}
                  >
                    Difficulty: {currentExercise.difficulty}/5
                  </span>
                  <span 
                    className="text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: 'var(--success)', color: 'white' }}
                  >
                    {currentExercise.type}
                  </span>
                  {currentExercise.audioRequired && (
                    <span 
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: 'var(--warning)', color: 'white' }}
                    >
                      🔊 Audio
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Audio Controls Slide-out */}
      {showAudioControls && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowAudioControls(false)}
          />
          <div 
            className="relative w-full max-w-md h-full overflow-y-auto animate-fade-in"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Audio Controls
                </h2>
                <button
                  onClick={() => setShowAudioControls(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  style={{ color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              </div>
              <AudioControls />
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div 
            className="rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-lg"
                style={{ color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>
            <SettingsPanel />
          </div>
        </div>
      )}
    </div>
  )
}

export default App