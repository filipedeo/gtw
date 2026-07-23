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
import { Button, Card, SegmentedControl } from './components/ui'
import { MusicIcon, VolumeIcon, SettingsIcon, MenuIcon, XIcon } from './components/icons'

type SidePanel = 'settings' | 'audio' | null

// Exercise types that render their own embedded <Fretboard/>. For these we
// suppress the top-level board on desktop so there is a single board instead of
// a redundant duplicate mirroring the same store state (which, for note
// identification, would also echo the exercise's own board). Types NOT listed
// here (audio-only ear-training / chord-progression, or any future/unknown
// type) keep the shared top board as a general click-to-hear reference.
const EMBEDDED_FRETBOARD_TYPES = new Set<string>([
  'note-identification',
  'modal-practice',
  'interval-recognition',
  'chord-voicing',
  'caged-system',
  'three-nps',
  'pentatonic',
  'jam-mode',
  'bass-technique',
  'arpeggio',
  'chord-scale',
])

function App() {
  const [sidePanel, setSidePanel] = useState<SidePanel>(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [activeToolsTab, setActiveToolsTab] = useState<ActiveToolTab>(null)
  const { instrument, stringCount, setStringCount, setInstrument } = useGuitarStore()
  const { currentExercise } = useExerciseStore()
  const { setTheme, theme } = useThemeStore()
  const { isDesktop, isMobile } = useBreakpoint()

  // Show the top-level board only when the active exercise does not embed its
  // own (de-dup). No current exercise or an unknown type falls back to showing
  // it so no exercise is ever left without a board.
  const showTopFretboard = !currentExercise || !EMBEDDED_FRETBOARD_TYPES.has(currentExercise.type)

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
    <div className="min-h-screen app-shell">
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b border-line backdrop-blur-md"
        style={{ backgroundColor: 'color-mix(in srgb, var(--surface) 80%, transparent)' }}
      >
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-[var(--rad-md)] bg-accent-subtle text-accent">
                <MusicIcon size={20} />
              </span>
              <div className="hidden md:flex flex-col gap-0.5 leading-none">
                <span className="eyebrow">Practice</span>
                <h1 className="text-xl font-bold tracking-tight text-fg-strong">
                  Guitar Theory
                </h1>
              </div>
            </div>
            <PracticeTimer />
            <MetronomeIndicator />
            {/* Instrument + string count — desktop only */}
            <div className="hidden lg:flex items-center gap-2">
              <SegmentedControl
                ariaLabel="Instrument"
                compact
                value={instrument}
                onChange={(v) => setInstrument(v)}
                options={[
                  { value: 'guitar', label: 'Guitar' },
                  { value: 'bass', label: 'Bass' },
                ]}
              />
              <SegmentedControl
                ariaLabel="String count"
                compact
                value={stringCount}
                onChange={(v) => setStringCount(v as 4 | 5 | 6 | 7 | 8)}
                options={instrument === 'guitar'
                  ? [{ value: 6, label: '6' }, { value: 7, label: '7' }]
                  : [{ value: 4, label: '4' }, { value: 5, label: '5' }, { value: 6, label: '6' }]}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <div className="hidden md:flex items-center gap-1.5">
            {/* Drone toggle — desktop only */}
            <Button
              variant={sidePanel === 'audio' ? 'primary' : 'secondary'}
              onClick={() => togglePanel('audio')}
              aria-label="Toggle drone and volume controls"
              aria-expanded={sidePanel === 'audio'}
            >
              <VolumeIcon size={18} /> <span className="hidden xl:inline">Drone</span>
            </Button>
            {/* Settings toggle — desktop only */}
            <Button
              variant={sidePanel === 'settings' ? 'primary' : 'secondary'}
              onClick={() => togglePanel('settings')}
              aria-label="Toggle settings"
              aria-expanded={sidePanel === 'settings'}
            >
              <SettingsIcon size={18} /> <span className="hidden xl:inline">Settings</span>
            </Button>
            </div>
            {/* Hamburger — mobile/tablet only */}
            <Button
              ref={hamburgerButtonRef}
              variant="secondary"
              iconOnly
              onClick={() => setShowDrawer(true)}
              className="md:hidden"
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
        activeTab={isMobile ? activeToolsTab : undefined}
        onTabChange={isMobile ? setActiveToolsTab : undefined}
        hideTabButtons={isMobile}
      />

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-4 py-6">
        <div className="xl:max-w-[1280px] xl:mx-auto">
        {/* Fretboard - Full Width — desktop only, and only when the active exercise doesn't embed its own */}
        {isDesktop && showTopFretboard && (
          <div className="card mb-6 sticky top-16 z-30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col gap-0.5">
                <span className="eyebrow">Reference</span>
                <h2 className="text-lg font-semibold leading-tight text-fg-strong">
                  Fretboard
                </h2>
              </div>
              <div className="flex items-center gap-2 text-sm text-fg-muted">
                <span>Click any note to hear it</span>
              </div>
            </div>
            <ErrorBoundary>
              <Fretboard />
            </ErrorBoundary>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] lg:grid-cols-3 gap-6">
          {/* Left Column - Exercise */}
          <div className="lg:col-span-2 space-y-6">
            <ExerciseContainer />
          </div>

          {/* Right Column — md+ secondary (Progress/info; side panels md+) */}
            <div className="space-y-6 hidden md:block">
              {/* Side Panel: Settings or Audio (replaces right column content when open) */}
              {sidePanel === 'settings' && (
                <Card
                  ref={sidePanelRef}
                  className="animate-fade-in"
                  role="region"
                  aria-label="Settings"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="eyebrow">Configure</span>
                      <h2 className="text-lg font-bold leading-tight text-fg-strong">
                        Settings
                      </h2>
                    </div>
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
                    <div className="flex flex-col gap-0.5">
                      <span className="eyebrow">Audio</span>
                      <h2 className="text-lg font-bold leading-tight text-fg-strong">
                        Drone & Volume
                      </h2>
                    </div>
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
                      <span className="eyebrow block mb-1">About</span>
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
        </div>
        </div>
      </main>

      {/* Mobile Drawer */}
      {isMobile && (
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
