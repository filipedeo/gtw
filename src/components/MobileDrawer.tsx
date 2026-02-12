import React, { useEffect, useRef, useCallback } from 'react';
import Fretboard from './Fretboard';
import SessionPlanner from './SessionPlanner';
import ProgressDashboard from './ProgressDashboard';
import AudioControls from './AudioControls';
import SettingsPanel from './SettingsPanel';
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
  const { stringCount, setStringCount } = useGuitarStore();
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
        className="relative w-full max-w-md h-full overflow-y-auto drawer-slide-in"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Menu
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          {/* Tools section */}
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Tools
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleToolSelect('tuner')}
                className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm"
              >
                <span>🎵</span> Tuner
              </button>
              <button
                onClick={() => handleToolSelect('metronome')}
                className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm"
              >
                <span>🥁</span> Metronome
              </button>
            </div>
          </section>

          {/* Fretboard section */}
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Fretboard
            </h3>
            <div className="card p-3">
              <Fretboard />
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
            <SessionPlanner />
          </section>

          {/* Progress */}
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Progress
            </h3>
            <ProgressDashboard showSessionPlanner={false} />
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

          {/* Guitar string toggle */}
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Guitar
            </h3>
            <button
              onClick={() => setStringCount(stringCount === 6 ? 7 : 6)}
              className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
              aria-label={`Currently ${stringCount}-string guitar. Click to switch to ${stringCount === 6 ? 7 : 6}-string`}
            >
              <span className="font-mono">{stringCount}-string</span>
              <span style={{ color: 'var(--text-muted)' }}>→</span>
              <span className="font-mono">{stringCount === 6 ? 7 : 6}-string</span>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MobileDrawer;
