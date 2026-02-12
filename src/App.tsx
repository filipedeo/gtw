import { useState, useEffect, useCallback, useRef } from 'react'
import Fretboard from './components/Fretboard'
import ExerciseContainer from './components/ExerciseContainer'
import ErrorBoundary from './components/ErrorBoundary'
import AudioControls from './components/AudioControls'
import ProgressDashboard from './components/ProgressDashboard'
import SettingsPanel from './components/SettingsPanel'
import ThemeToggle from './components/ThemeToggle'
import PracticeTimer from './components/PracticeTimer'
import ToolsToolbar from './components/ToolsToolbar'
import type { ActiveToolTab } from './components/ToolsToolbar'
import MetronomeIndicator from './components/MetronomeIndicator'
import MobileDrawer from './components/MobileDrawer'
import { useBreakpoint } from './hooks/useBreakpoint'
import { useGuitarStore } from './stores/guitarStore'
import { useExerciseStore } from './stores/exerciseStore'
import { useThemeStore } from './stores/themeStore'

type SidePanel = 'settings' | 'audio' | null

function App() {
  const [sidePanel, setSidePanel] = useState<SidePanel>(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [activeToolsTab, setActiveToolsTab] = useState<ActiveToolTab>(null)
  const { instrument, stringCount, setStringCount, setInstrument } = useGuitarStore()
  const { currentExercise } = useExerciseStore()
  const { setTheme, theme } = useThemeStore()
  const { isDesktop } = useBreakpoint()

  const hamburgerButtonRef = useRef<HTMLButtonElement>(null)
  const sidePanelRef = useRef<HTMLDivElement>(null)

  // Initialize theme on mount
  useEffect(() => {
    setTheme(theme)
  }, [])

  // Handle Escape key to close panels
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (showDrawer) { setShowDrawer(false); return }
      if (sidePanel) setSidePanel(null)
    }
  }, [showDrawer, sidePanel])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Return focus when drawer closes
  useEffect(() => {
    if (!showDrawer && hamburgerButtonRef.current) {
      hamburgerButtonRef.current.focus()
    }
  }, [showDrawer])

  const togglePanel = (panel: 'settings' | 'audio') => {
    setSidePanel(prev => prev === panel ? null : panel)
  }

  // Handle tool selection from mobile drawer
  const handleSelectTool = useCallback((tool: 'tuner' | 'metronome') => {
    setActiveToolsTab(tool)
    setShowDrawer(false)
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }} className="sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎸</span>
              <h1 className="hidden md:block text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Guitar Theory
              </h1>
            </div>
            <PracticeTimer />
            <MetronomeIndicator />
            {/* Instrument badge — desktop only */}
            <div className="hidden lg:flex items-center gap-1">
              <button
                onClick={() => {
                  if (instrument === 'guitar') {
                    setStringCount(stringCount === 6 ? 7 : 6);
                  } else {
                    const bassOptions = [4, 5, 6] as const;
                    const idx = bassOptions.indexOf(stringCount as 4 | 5 | 6);
                    setStringCount(bassOptions[(idx + 1) % bassOptions.length]);
                  }
                }}
                className="text-xs px-2 py-1 rounded-l-full font-mono cursor-pointer transition-all hover:brightness-110"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'white', opacity: 0.85 }}
                title="Click to change string count"
                aria-label={`Currently ${stringCount}-string ${instrument}. Click to change.`}
              >
                {stringCount}s
              </button>
              <button
                onClick={() => setInstrument(instrument === 'guitar' ? 'bass' : 'guitar')}
                className="text-xs px-2 py-1 rounded-r-full font-mono cursor-pointer transition-all hover:brightness-110"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                title={`Switch to ${instrument === 'guitar' ? 'bass' : 'guitar'}`}
              >
                {instrument === 'guitar' ? '→ Bass' : '→ Guitar'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {/* Drone toggle — desktop only */}
            <button
              onClick={() => togglePanel('audio')}
              className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                sidePanel === 'audio' ? 'ring-2 ring-offset-1' : ''
              }`}
              style={{
                backgroundColor: sidePanel === 'audio' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: sidePanel === 'audio' ? 'white' : 'var(--text-secondary)',
              }}
              aria-label="Toggle drone and volume controls"
              aria-expanded={sidePanel === 'audio'}
            >
              🔊 <span className="hidden xl:inline">Drone</span>
            </button>
            {/* Settings toggle — desktop only */}
            <button
              onClick={() => togglePanel('settings')}
              className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                sidePanel === 'settings' ? 'ring-2 ring-offset-1' : ''
              }`}
              style={{
                backgroundColor: sidePanel === 'settings' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: sidePanel === 'settings' ? 'white' : 'var(--text-secondary)',
              }}
              aria-label="Toggle settings"
              aria-expanded={sidePanel === 'settings'}
            >
              ⚙️ <span className="hidden xl:inline">Settings</span>
            </button>
            {/* Hamburger — mobile/tablet only */}
            <button
              ref={hamburgerButtonRef}
              onClick={() => setShowDrawer(true)}
              className="lg:hidden btn-secondary flex items-center justify-center"
              aria-label="Open menu"
              aria-haspopup="dialog"
              style={{ width: '44px', height: '44px', padding: 0 }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Tools Toolbar — always mounted so tuner mic + metronome survive */}
      <ToolsToolbar
        activeTab={!isDesktop ? activeToolsTab : undefined}
        onTabChange={!isDesktop ? setActiveToolsTab : undefined}
        hideTabButtons={!isDesktop}
      />

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-4 py-6">
        {/* Fretboard - Full Width — desktop only */}
        {isDesktop && (
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Fretboard
              </h2>
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                <span>Click any note to hear it</span>
              </div>
            </div>
            <ErrorBoundary>
              <Fretboard />
            </ErrorBoundary>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Exercise */}
          <div className="lg:col-span-2 space-y-6">
            <ExerciseContainer />
          </div>

          {/* Right Column — desktop only */}
          {isDesktop && (
            <div className="space-y-6">
              {/* Side Panel: Settings or Audio (replaces right column content when open) */}
              {sidePanel === 'settings' && (
                <div
                  ref={sidePanelRef}
                  className="card animate-fade-in"
                  role="region"
                  aria-label="Settings"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                      Settings
                    </h2>
                    <button
                      onClick={() => setSidePanel(null)}
                      className="p-1.5 rounded-lg transition-colors hover:opacity-70"
                      style={{ color: 'var(--text-muted)' }}
                      aria-label="Close settings"
                    >
                      ✕
                    </button>
                  </div>
                  <SettingsPanel />
                </div>
              )}

              {sidePanel === 'audio' && (
                <div
                  ref={sidePanelRef}
                  className="card animate-fade-in"
                  role="region"
                  aria-label="Drone and Volume Controls"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                      Drone & Volume
                    </h2>
                    <button
                      onClick={() => setSidePanel(null)}
                      className="p-1.5 rounded-lg transition-colors hover:opacity-70"
                      style={{ color: 'var(--text-muted)' }}
                      aria-label="Close audio controls"
                    >
                      ✕
                    </button>
                  </div>
                  <AudioControls />
                </div>
              )}

              {/* Default right column content (when no panel open) */}
              {!sidePanel && (
                <>
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
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Mobile Drawer */}
      {!isDesktop && (
        <MobileDrawer
          isOpen={showDrawer}
          onClose={() => setShowDrawer(false)}
          onSelectTool={handleSelectTool}
        />
      )}
    </div>
  )
}

export default App
