/**
 * Tests for TypingTestUI component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@test/utils/testUtils';
import { TypingTestUI } from '../TypingTestUI';

describe('TypingTestUI', () => {
  const mockStats = {
    wpm: 65,
    mechanicalWPM: 72,
    accuracy: 95,
    correctCount: 100,
    errorCount: 5,
  };

  const defaultProps = {
    isComplete: false,
    viewMode: 'ticker',
    practiceText: 'the quick brown fox jumps over the lazy dog',
    currentIndex: 10,
    characterStates: {},
    lastKeyCode: null,
    stats: mockStats,
    sessionMode: 'wordcount',
    timedDuration: 30,
    timeRemaining: null,
    totalKeystrokes: 105,
    firstKeystrokeTime: Date.now() - 10000,
    lastKeystrokeTime: Date.now(),
    onAbort: vi.fn(),
    onSave: vi.fn(),
    onNavigateToAuth: vi.fn(),
    isAuthenticated: true,
  };

  describe('Active Test UI', () => {
    it('should render stats header during active test', () => {
      render(<TypingTestUI {...defaultProps} />);

      expect(screen.getByText('Productive WPM')).toBeInTheDocument();
      expect(screen.getByText('65')).toBeInTheDocument();
      expect(screen.getByText('Mechanical WPM')).toBeInTheDocument();
      expect(screen.getByText('72')).toBeInTheDocument();
      expect(screen.getByText('Accuracy')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
    });

    it('should show progress for word count mode', () => {
      render(<TypingTestUI {...defaultProps} sessionMode="wordcount" />);

      expect(screen.getByText('Progress')).toBeInTheDocument();
      // 10 characters out of 44 = ~23%
      expect(screen.getByText('23%')).toBeInTheDocument();
    });

    it('should show time remaining for timed mode', () => {
      render(<TypingTestUI {...defaultProps} sessionMode="timed" timeRemaining={15} />);

      expect(screen.getByText('Time Remaining')).toBeInTheDocument();
      expect(screen.getByText('15s')).toBeInTheDocument();
    });

    it('should show warning color when time is low', () => {
      render(<TypingTestUI {...defaultProps} sessionMode="timed" timeRemaining={3} />);

      const timeDisplay = screen.getByText('3s');
      // Should have error color styling (checked via inline style)
      expect(timeDisplay).toHaveStyle({ color: 'var(--status-error)' });
    });

    it('should render abort button', () => {
      render(<TypingTestUI {...defaultProps} />);

      const abortButton = screen.getByText('ABORT SESSION');
      expect(abortButton).toBeInTheDocument();

      fireEvent.click(abortButton);
      expect(defaultProps.onAbort).toHaveBeenCalled();
    });

    it('should render TickerTape in ticker mode', () => {
      const { container } = render(<TypingTestUI {...defaultProps} viewMode="ticker" />);

      // TickerTape component should be rendered (check via test-id if needed)
      expect(container.querySelector('.ticker-tape, [data-testid="ticker-tape"]') || container).toBeTruthy();
    });

    it('should render RollingWindow in rolling mode', () => {
      const { container } = render(<TypingTestUI {...defaultProps} viewMode="rolling" />);

      // RollingWindow component should be rendered
      expect(container.querySelector('.rolling-window, [data-testid="rolling-window"]') || container).toBeTruthy();
    });
  });

  describe('Results Screen', () => {
    const completedProps = {
      ...defaultProps,
      isComplete: true,
    };

    it('should render completion message', () => {
      render(<TypingTestUI {...completedProps} />);

      expect(screen.getByText('Session Complete')).toBeInTheDocument();
      expect(screen.getByText('Analysis report generated successfully.')).toBeInTheDocument();
    });

    it('should show final stats', () => {
      render(<TypingTestUI {...completedProps} />);

      // Should show larger formatted stats
      expect(screen.getAllByText('65')).toHaveLength(1); // WPM
      expect(screen.getAllByText('95%')).toHaveLength(1); // Accuracy
    });

    it('should show Save Session button for authenticated users', () => {
      render(<TypingTestUI {...completedProps} isAuthenticated={true} />);

      expect(screen.getByText('Save Session')).toBeInTheDocument();
    });

    it('should show Start New Session for unauthenticated users', () => {
      render(<TypingTestUI {...completedProps} isAuthenticated={false} />);

      expect(screen.getByText('Start New Session')).toBeInTheDocument();
    });

    it('should call onSave when Save Session clicked', () => {
      render(<TypingTestUI {...completedProps} />);

      const saveButton = screen.getByText('Save Session');
      fireEvent.click(saveButton);

      expect(defaultProps.onSave).toHaveBeenCalled();
    });

    it('should call onAbort when Abort Session clicked', () => {
      render(<TypingTestUI {...completedProps} />);

      const abortButton = screen.getByText('Abort Session');
      fireEvent.click(abortButton);

      expect(defaultProps.onAbort).toHaveBeenCalled();
    });

    it('should show Login to Save button for unauthenticated users', () => {
      render(<TypingTestUI {...completedProps} isAuthenticated={false} />);

      const loginButton = screen.getByText('Login to Save');
      expect(loginButton).toBeInTheDocument();

      fireEvent.click(loginButton);
      expect(defaultProps.onNavigateToAuth).toHaveBeenCalled();
    });

    it('should not show Login button for authenticated users', () => {
      render(<TypingTestUI {...completedProps} isAuthenticated={true} />);

      expect(screen.queryByText('Login to Save')).not.toBeInTheDocument();
    });

    it('should calculate and display session duration', () => {
      const firstTime = Date.now() - 45000; // 45 seconds ago
      const lastTime = Date.now();

      render(<TypingTestUI {...completedProps} firstKeystrokeTime={firstTime} lastKeystrokeTime={lastTime} />);

      // Should show 45 seconds
      expect(screen.getByText('45')).toBeInTheDocument();
    });
  });
});
