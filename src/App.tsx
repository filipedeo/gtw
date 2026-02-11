import { useState } from 'react'
import Fretboard from './components/Fretboard'
import ExerciseContainer from './components/ExerciseContainer'
import AudioControls from './components/AudioControls'
import ProgressDashboard from './components/ProgressDashboard'
import SettingsPanel from './components/SettingsPanel'
import { useGuitarStore } from './stores/guitarStore'
import { useExerciseStore } from './stores/exerciseStore'

function App() {
  const [showSettings, setShowSettings] = useState(false)
  const { stringCount } = useGuitarStore()
  const { currentExercise } = useExerciseStore()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Guitar Theory Practice</h1>
            <span className="text-sm text-gray-500 font-mono">{stringCount}-string</span>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn-secondary"
          >
            Settings
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Exercise */}
          <div className="lg:col-span-2 space-y-6">
            <ExerciseContainer />
            
            {/* Fretboard Visualization */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Fretboard</h2>
              <Fretboard />
            </div>

            {/* Audio Controls */}
            <AudioControls />
          </div>

          {/* Right Column - Progress & Info */}
          <div className="space-y-6">
            <ProgressDashboard />
            
            {currentExercise && (
              <div className="card">
                <h3 className="font-semibold mb-2">Exercise Info</h3>
                <p className="text-sm text-gray-600">{currentExercise.description}</p>
                <div className="mt-4 flex gap-2">
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    Difficulty: {currentExercise.difficulty}/5
                  </span>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                    {currentExercise.type}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700"
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