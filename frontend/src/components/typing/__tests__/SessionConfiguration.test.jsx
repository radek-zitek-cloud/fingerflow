/**
 * Tests for SessionConfiguration component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@test/utils/testUtils';
import { SessionConfiguration } from '../SessionConfiguration';

describe('SessionConfiguration', () => {
  const defaultProps = {
    sessionMode: 'wordcount',
    setSessionMode: vi.fn(),
    timedDuration: 30,
    setTimedDuration: vi.fn(),
    wordCount: 20,
    setWordCount: vi.fn(),
    customInput: '',
    setCustomInput: vi.fn(),
    viewMode: 'ticker',
    setViewMode: vi.fn(),
    selectedWordSetId: 1,
    setSelectedWordSetId: vi.fn(),
    wordSets: [
      { id: 1, name: 'Common Words', words: ['the', 'quick', 'brown'] },
      { id: 2, name: 'Programming', words: ['function', 'variable'] },
    ],
    isAuthenticated: true,
    onManageWordSets: vi.fn(),
  };

  it('should render mode toggle buttons', () => {
    render(<SessionConfiguration {...defaultProps} />);

    expect(screen.getByText('Word Count')).toBeInTheDocument();
    expect(screen.getByText('Timed')).toBeInTheDocument();
  });

  it('should switch to timed mode when button clicked', () => {
    render(<SessionConfiguration {...defaultProps} />);

    const timedButton = screen.getByText('Timed');
    fireEvent.click(timedButton);

    expect(defaultProps.setSessionMode).toHaveBeenCalledWith('timed');
  });

  it('should display word count presets in word count mode', () => {
    render(<SessionConfiguration {...defaultProps} sessionMode="wordcount" />);

    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('should display timed duration presets in timed mode', () => {
    render(<SessionConfiguration {...defaultProps} sessionMode="timed" />);

    expect(screen.getByText('15s')).toBeInTheDocument();
    expect(screen.getByText('30s')).toBeInTheDocument();
    expect(screen.getByText('60s')).toBeInTheDocument();
  });

  it('should update word count when preset clicked', () => {
    render(<SessionConfiguration {...defaultProps} sessionMode="wordcount" />);

    const fortyButton = screen.getByText('40');
    fireEvent.click(fortyButton);

    expect(defaultProps.setWordCount).toHaveBeenCalledWith(40);
  });

  it('should render view mode toggle', () => {
    render(<SessionConfiguration {...defaultProps} />);

    expect(screen.getByText('Ticker Tape')).toBeInTheDocument();
    expect(screen.getByText('Rolling Window')).toBeInTheDocument();
  });

  it('should switch view mode when button clicked', () => {
    render(<SessionConfiguration {...defaultProps} viewMode="ticker" />);

    const rollingButton = screen.getByText('Rolling Window');
    fireEvent.click(rollingButton);

    expect(defaultProps.setViewMode).toHaveBeenCalledWith('rolling');
  });

  it('should render word set selector', () => {
    render(<SessionConfiguration {...defaultProps} />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    // Should have options for each word set
    expect(screen.getByText(/Common Words \(3 words\)/)).toBeInTheDocument();
    expect(screen.getByText(/Programming \(2 words\)/)).toBeInTheDocument();
  });

  it('should call onManageWordSets when Manage button clicked', () => {
    render(<SessionConfiguration {...defaultProps} isAuthenticated={true} />);

    const manageButton = screen.getByText('Manage');
    fireEvent.click(manageButton);

    expect(defaultProps.onManageWordSets).toHaveBeenCalled();
  });

  it('should not show Manage button for unauthenticated users', () => {
    render(<SessionConfiguration {...defaultProps} isAuthenticated={false} />);

    expect(screen.queryByText('Manage')).not.toBeInTheDocument();
  });

  it('should handle custom word count input', () => {
    render(<SessionConfiguration {...defaultProps} sessionMode="wordcount" />);

    const customInput = screen.getByPlaceholderText('...');
    fireEvent.change(customInput, { target: { value: '75' } });

    expect(defaultProps.setCustomInput).toHaveBeenCalledWith('75');
    expect(defaultProps.setWordCount).toHaveBeenCalledWith(75);
  });

  it('should not update word count with invalid input', () => {
    render(<SessionConfiguration {...defaultProps} sessionMode="wordcount" />);

    const customInput = screen.getByPlaceholderText('...');

    // Clear previous calls
    defaultProps.setWordCount.mockClear();

    // Invalid input
    fireEvent.change(customInput, { target: { value: 'abc' } });

    // setWordCount should not be called with invalid value
    expect(defaultProps.setWordCount).not.toHaveBeenCalled();
  });

  it('should apply active styling to selected mode', () => {
    const { container } = render(<SessionConfiguration {...defaultProps} sessionMode="wordcount" />);

    const wordCountButton = screen.getByText('Word Count');
    expect(wordCountButton).toHaveClass('bg-[var(--accent-primary)]');
  });
});
