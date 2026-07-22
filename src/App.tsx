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
import { Button, Card } from './components/ui'
import { MusicIcon, VolumeIcon, SettingsIcon, MenuIcon, XIcon } from './components/icons'

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
    <div className="min-h-screen bg-surface-app">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface border-b border-line">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-[var(--rad-md)] bg-accent-subtle text-accent">
                <MusicIcon size={20} />
              </span>
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
                className="text-xs px-2 py-1 rounded-l-full font-mono cursor-pointer transition-colors bg-accent text-on-accent hover:bg-accent-hover"
                title="Click to change string count"
                aria-label={`Currently ${stringCount}-string ${instrument}. Click to change.`}
              >
                {stringCount}s
              </button>
              <button
                onClick={() => setInstrument(instrument === 'guitar' ? 'bass' : 'guitar')}
                className="text-xs px-2 py-1 rounded-r-full font-mono cursor-pointer transition-colors bg-surface-hover text-fg-muted hover:bg-surface-sunken hover:text-fg"
                title={`Switch to ${instrument === 'guitar' ? 'bass' : 'guitar'}`}
              >
                {instrument === 'guitar' ? '→ Bass' : '→ Guitar'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {/* Drone toggle — desktop only */}
            <Button
              variant={sidePanel === 'audio' ? 'primary' : 'secondary'}
              onClick={() => togglePanel('audio')}
              className="hidden lg:inline-flex"
              aria-label="Toggle drone and volume controls"
              aria-expanded={sidePanel === 'audio'}
            >
              <VolumeIcon size={18} /> <span className="hidden xl:inline">Drone</span>
            </Button>
            {/* Settings toggle — desktop only */}
            <Button
              variant={sidePanel === 'settings' ? 'primary' : 'secondary'}
              onClick={() => togglePanel('settings')}
              className="hidden lg:inline-flex"
              aria-label="Toggle settings"
              aria-expanded={sidePanel === 'settings'}
            >
              <SettingsIcon size={18} /> <span className="hidden xl:inline">Settings</span>
            </Button>
            {/* Hamburger — mobile/tablet only */}
            <Button
              ref={hamburgerButtonRef}
              variant="secondary"
              iconOnly
              onClick={() => setShowDrawer(true)}
              className="lg:hidden"
              aria-label="Open menu"
              aria-haspopup="dialog"
            >
              <MenuIcon size={20} />
            </Button>
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
                <Card
                  ref={sidePanelRef}
                  className="animate-fade-in"
                  role="region"
                  aria-label="Settings"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-fg-strong">
                      Settings
                    </h2>
                    <Button
                      variant="ghost"
                      iconOnly
                      size="sm"
                      onClick={() => setSidePanel(null)}
                      aria-label="Close settings"
                    >
                      <XIcon size={18} />
                    </Button>
                  </div>
                  <SettingsPanel />
                </Card>
              )}

              {sidePanel === 'audio' && (
                <Card
                  ref={sidePanelRef}
                  className="animate-fade-in"
                  role="region"
                  aria-label="Drone and Volume Controls"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-fg-strong">
                      Drone & Volume
                    </h2>
                    <Button
                      variant="ghost"
                      iconOnly
                      size="sm"
                      onClick={() => setSidePanel(null)}
                      aria-label="Close audio controls"
                    >
                      <XIcon size={18} />
                    </Button>
                  </div>
                  <AudioControls />
                </Card>
              )}

              {/* Default right column content (when no panel open) */}
              {!sidePanel && (
                <>
                  <ProgressDashboard />

                  {currentExercise && (
                    <Card>
                      <h3 className="font-semibold mb-2 text-fg-strong">
                        Exercise Info
                      </h3>
                      <p className="text-sm text-fg">
                        {currentExercise.description}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center text-xs px-2 py-1 rounded-[var(--rad-sm)] bg-accent text-on-accent">
                          Difficulty: {currentExercise.difficulty}/5
                        </span>
                        <span className="inline-flex items-center text-xs px-2 py-1 rounded-[var(--rad-sm)] bg-success text-white">
                          {currentExercise.type}
                        </span>
                        {currentExercise.audioRequired && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-[var(--rad-sm)] bg-warning text-white">
                            <VolumeIcon size={12} /> Audio
                          </span>
                        )}
                      </div>
                    </Card>
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
