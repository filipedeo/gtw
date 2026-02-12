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

function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [showAudioControls, setShowAudioControls] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [activeToolsTab, setActiveToolsTab] = useState<ActiveToolTab>(null)
  const { stringCount, setStringCount } = useGuitarStore()
  const { currentExercise } = useExerciseStore()
  const { setTheme, theme } = useThemeStore()
  const { isDesktop } = useBreakpoint()

  // Refs for focus management
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  const audioButtonRef = useRef<HTMLButtonElement>(null)
  const settingsModalRef = useRef<HTMLDivElement>(null)
  const audioModalRef = useRef<HTMLDivElement>(null)
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null)

  // Initialize theme on mount
  useEffect(() => {
    setTheme(theme)
  }, [])

  // Handle Escape key to close modals — drawer first in cascade
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (showDrawer) { setShowDrawer(false); return }
      if (showSettings) setShowSettings(false)
      if (showAudioControls) setShowAudioControls(false)
    }
  }, [showDrawer, showSettings, showAudioControls])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Focus first element when settings modal opens
  useEffect(() => {
    if (showSettings && settingsModalRef.current) {
      const focusable = settingsModalRef.current.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length > 0) {
        focusable[0].focus()
      }
    }
  }, [showSettings])

  // Focus first element when audio modal opens
  useEffect(() => {
    if (showAudioControls && audioModalRef.current) {
      const focusable = audioModalRef.current.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length > 0) {
        focusable[0].focus()
      }
    }
  }, [showAudioControls])

  // Return focus when settings modal closes
  useEffect(() => {
    if (!showSettings && settingsButtonRef.current) {
      settingsButtonRef.current.focus()
    }
  }, [showSettings])

  // Return focus when audio modal closes
  useEffect(() => {
    if (!showAudioControls && audioButtonRef.current) {
      audioButtonRef.current.focus()
    }
  }, [showAudioControls])

  // Return focus when drawer closes
  useEffect(() => {
    if (!showDrawer && hamburgerButtonRef.current) {
      hamburgerButtonRef.current.focus()
    }
  }, [showDrawer])

  // Handle focus trapping within modals
  const handleModalKeyDown = (e: React.KeyboardEvent, modalRef: React.RefObject<HTMLDivElement | null>) => {
    if (e.key !== 'Tab' || !modalRef.current) return

    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  // Close modal when clicking backdrop
  const handleBackdropClick = (e: React.MouseEvent, closeModal: () => void) => {
    if (e.target === e.currentTarget) {
      closeModal()
    }
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
            {/* 6-string toggle — desktop only */}
            <button
              onClick={() => setStringCount(stringCount === 6 ? 7 : 6)}
              className="hidden lg:inline-flex text-xs px-2 py-1 rounded-full font-mono cursor-pointer transition-all hover:scale-105"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              title={`Click to switch to ${stringCount === 6 ? 7 : 6}-string guitar`}
              aria-label={`Currently ${stringCount}-string guitar. Click to switch to ${stringCount === 6 ? 7 : 6}-string`}
            >
              {stringCount}-string
            </button>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* Drone button — desktop only */}
            <button
              ref={audioButtonRef}
              onClick={() => setShowAudioControls(!showAudioControls)}
              className="hidden lg:inline-flex btn-secondary items-center gap-2"
              aria-label="Toggle drone and volume controls"
              aria-expanded={showAudioControls}
              aria-haspopup="dialog"
            >
              <span>🔊</span>
              <span className="hidden sm:inline">Drone</span>
            </button>
            {/* Settings button — desktop only */}
            <button
              ref={settingsButtonRef}
              onClick={() => setShowSettings(!showSettings)}
              className="hidden lg:inline-flex btn-secondary items-center gap-2"
              aria-label="Toggle settings"
              aria-expanded={showSettings}
              aria-haspopup="dialog"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Settings</span>
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

          {/* Right Column - Progress & Info — desktop only */}
          {isDesktop && (
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

      {/* Audio Controls Slide-out — desktop only */}
      {isDesktop && showAudioControls && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Drone and Volume Controls"
          onKeyDown={(e) => handleModalKeyDown(e, audioModalRef)}
        >
          <div
            className="absolute inset-0 bg-black/50 cursor-pointer"
            aria-hidden="true"
            onClick={() => setShowAudioControls(false)}
          />
          <div
            ref={audioModalRef}
            className="relative w-full max-w-md h-full overflow-y-auto animate-fade-in"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Drone & Volume
                </h2>
                <button
                  onClick={() => setShowAudioControls(false)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="Close audio controls"
                >
                  ✕
                </button>
              </div>
              <AudioControls />
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal — desktop only */}
      {isDesktop && showSettings && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => handleBackdropClick(e, () => setShowSettings(false))}
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
          onKeyDown={(e) => handleModalKeyDown(e, settingsModalRef)}
        >
          <div
            ref={settingsModalRef}
            className="rounded-xl p-4 md:p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto animate-fade-in"
            style={{ backgroundColor: 'var(--bg-primary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close settings"
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
