import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileDrawer from '../components/MobileDrawer';

// Mock child components to avoid deep rendering
vi.mock('../components/Fretboard', () => ({ default: () => <div data-testid="fretboard">Fretboard</div> }));
vi.mock('../components/SessionPlanner', () => ({ default: () => <div data-testid="session-planner">SessionPlanner</div> }));
vi.mock('../components/ProgressDashboard', () => ({ default: ({ showSessionPlanner }: { showSessionPlanner?: boolean }) => <div data-testid="progress-dashboard" data-show-sp={String(showSessionPlanner ?? true)}>ProgressDashboard</div> }));
vi.mock('../components/AudioControls', () => ({ default: () => <div data-testid="audio-controls">AudioControls</div> }));
vi.mock('../components/SettingsPanel', () => ({ default: () => <div data-testid="settings-panel">SettingsPanel</div> }));

// Mock stores
vi.mock('../stores/guitarStore', () => ({
  useGuitarStore: () => ({ stringCount: 6, setStringCount: vi.fn() }),
}));

vi.mock('../stores/exerciseStore', () => ({
  useExerciseStore: () => ({
    currentExercise: {
      id: 'test-1',
      title: 'Test Exercise',
      description: 'A test description',
      difficulty: 3,
      type: 'note-identification',
      audioRequired: false,
    },
  }),
}));

// Mock useBreakpoint
vi.mock('../hooks/useBreakpoint', () => ({
  useBreakpoint: () => ({ isMobile: true, isTablet: false, isDesktop: false }),
}));

describe('MobileDrawer', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectTool: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(<MobileDrawer {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<MobileDrawer {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<MobileDrawer {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close menu'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<MobileDrawer {...defaultProps} onClose={onClose} />);
    // The backdrop has aria-hidden="true"
    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectTool with "tuner" when Tuner button is clicked', () => {
    const onSelectTool = vi.fn();
    render(<MobileDrawer {...defaultProps} onSelectTool={onSelectTool} />);
    fireEvent.click(screen.getByText('Tuner'));
    expect(onSelectTool).toHaveBeenCalledWith('tuner');
  });

  it('calls onSelectTool with "metronome" when Metronome button is clicked', () => {
    const onSelectTool = vi.fn();
    render(<MobileDrawer {...defaultProps} onSelectTool={onSelectTool} />);
    fireEvent.click(screen.getByText('Metronome'));
    expect(onSelectTool).toHaveBeenCalledWith('metronome');
  });

  it('has correct ARIA attributes', () => {
    render(<MobileDrawer {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Menu');
  });

  it('renders all drawer sections', () => {
    render(<MobileDrawer {...defaultProps} />);
    expect(screen.getByTestId('fretboard')).toBeInTheDocument();
    expect(screen.getByTestId('session-planner')).toBeInTheDocument();
    expect(screen.getByTestId('progress-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('audio-controls')).toBeInTheDocument();
    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
    expect(screen.getByText('Test Exercise')).toBeInTheDocument();
  });

  it('passes showSessionPlanner={false} to ProgressDashboard', () => {
    render(<MobileDrawer {...defaultProps} />);
    const pd = screen.getByTestId('progress-dashboard');
    expect(pd).toHaveAttribute('data-show-sp', 'false');
  });
});
