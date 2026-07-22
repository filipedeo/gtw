import React, { useEffect, useRef, useCallback } from 'react';
import Fretboard from './Fretboard';
import SessionPlanner from './SessionPlanner';
import ProgressDashboard from './ProgressDashboard';
import AudioControls from './AudioControls';
import SettingsPanel from './SettingsPanel';
import ErrorBoundary from './ErrorBoundary';
import { Button } from './ui';
import { XIcon, TargetIcon, MusicIcon, VolumeIcon, ChevronRightIcon } from './icons';
import { useGuitarStore } from '../stores/guitarStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { useBreakpoint } from '../hooks/useBreakpoint';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: 'tuner' | 'metronome') => void;
}

const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose, onSelectTool }) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const { instrument, stringCount, setStringCount, setInstrument } = useGuitarStore();
  const { currentExercise } = useExerciseStore();
  const { isMobile } = useBreakpoint();

  // Focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !drawerRef.current) return;

    const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, [onClose]);

  // Focus first element when opened
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }
  }, [isOpen]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToolSelect = (tool: 'tuner' | 'metronome') => {
    onSelectTool(tool);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 cursor-pointer"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="relative w-full max-w-md h-full overflow-y-auto drawer-slide-in bg-surface"
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Menu
            </h2>
            <Button
              variant="ghost"
              iconOnly
              onClick={onClose}
              aria-label="Close menu"
            >
              <XIcon size={20} />
            </Button>
          </div>

          {/* Tools section */}
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Tools
            </h3>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => handleToolSelect('tuner')}
                className="flex-1"
              >
                <TargetIcon size={18} /> Tuner
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleToolSelect('metronome')}
                className="flex-1"
              >
                <MusicIcon size={18} /> Metronome
              </Button>
            </div>
          </section>

          {/* Fretboard section */}
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Fretboard
            </h3>
            <div className="card p-3">
              <ErrorBoundary>
                <Fretboard />
              </ErrorBoundary>
              {isMobile && (
                <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
                  Rotate to landscape for a larger view
                </p>
              )}
            </div>
          </section>

          {/* Session Planner */}
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Session Planner
            </h3>
            <ErrorBoundary>
              <SessionPlanner />
            </ErrorBoundary>
          </section>

          {/* Progress */}
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Progress
            </h3>
            <ErrorBoundary>
              <ProgressDashboard showSessionPlanner={false} />
            </ErrorBoundary>
          </section>

          {/* Exercise Info */}
          {currentExercise && (
            <section className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Exercise Info
              </h3>
              <div className="card p-3">
                <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                  {currentExercise.title}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {currentExercise.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center text-[length:var(--fs-2xs)] px-2 py-1 rounded-[var(--rad-sm)] bg-accent text-on-accent">
                    Difficulty: {currentExercise.difficulty}/5
                  </span>
                  <span className="inline-flex items-center text-[length:var(--fs-2xs)] px-2 py-1 rounded-[var(--rad-sm)] bg-success text-white">
                    {currentExercise.type}
                  </span>
                  {currentExercise.audioRequired && (
                    <span className="inline-flex items-center gap-1 text-[length:var(--fs-2xs)] px-2 py-1 rounded-[var(--rad-sm)] bg-warning text-white">
                      <VolumeIcon size={12} /> Audio
                    </span>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Audio Controls */}
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Drone & Volume
            </h3>
            <div className="card p-3">
              <AudioControls />
            </div>
          </section>

          {/* Settings */}
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Settings
            </h3>
            <div className="card p-3">
              <SettingsPanel />
            </div>
          </section>

          {/* Instrument & string toggle */}
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Instrument
            </h3>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  if (instrument === 'guitar') {
                    setStringCount(stringCount === 6 ? 7 : 6);
                  } else {
                    const bassOptions = [4, 5, 6] as const;
                    const idx = bassOptions.indexOf(stringCount as 4 | 5 | 6);
                    setStringCount(bassOptions[(idx + 1) % bassOptions.length]);
                  }
                }}
                className="flex-1 font-mono"
                aria-label={`Currently ${stringCount}-string ${instrument}. Click to change string count.`}
              >
                {stringCount}s {instrument}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setInstrument(instrument === 'guitar' ? 'bass' : 'guitar')}
                className="flex-1"
              >
                <ChevronRightIcon size={16} className="text-fg-muted" />
                {instrument === 'guitar' ? 'Bass' : 'Guitar'}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MobileDrawer;
