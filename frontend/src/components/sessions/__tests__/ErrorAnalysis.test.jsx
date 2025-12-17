/**
 * Tests for ErrorAnalysis component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test/utils/testUtils';
import { ErrorAnalysis } from '../ErrorAnalysis';
import { createMockTelemetryEvents } from '@test/utils/testUtils';
import * as api from '../../../services/api';

// Mock the API
vi.mock('../../../services/api', () => ({
  sessionsAPI: {
    getDetailedTelemetry: vi.fn(),
  },
}));

describe('ErrorAnalysis', () => {
  const mockEvents = createMockTelemetryEvents(50, 'DOWN');

  it('should render loading state initially', () => {
    api.sessionsAPI.getDetailedTelemetry.mockImplementation(() => new Promise(() => {}));

    render(<ErrorAnalysis sessionId={1} />);

    expect(screen.getByText('Calculating error metrics...')).toBeInTheDocument();
  });

  it('should render error analysis when events provided', async () => {
    render(<ErrorAnalysis events={mockEvents} />);

    await waitFor(() => {
      expect(screen.getByText('Color Coding Guide (Calibrated to Your Session)')).toBeInTheDocument();
    });
  });

  it('should fetch detailed telemetry when sessionId provided', async () => {
    api.sessionsAPI.getDetailedTelemetry.mockResolvedValue({
      events: mockEvents,
      count: mockEvents.length,
      truncated: false,
    });

    render(<ErrorAnalysis sessionId={1} />);

    await waitFor(() => {
      expect(api.sessionsAPI.getDetailedTelemetry).toHaveBeenCalledWith(1);
    });
  });

  it('should toggle between finger and keyboard views', async () => {
    render(<ErrorAnalysis events={mockEvents} />);

    await waitFor(() => {
      expect(screen.getByText('Finger View')).toBeInTheDocument();
    });

    const keyboardButton = screen.getByText('Keyboard View');
    fireEvent.click(keyboardButton);

    // Should switch to keyboard view
    expect(screen.getByText('Keyboard Error Distribution')).toBeInTheDocument();
  });

  it('should display total errors count', async () => {
    // Mock events with 10 errors (every 5th event)
    const eventsWithErrors = mockEvents.map((e, i) => ({
      ...e,
      is_error: i % 5 === 0,
    }));

    render(<ErrorAnalysis events={eventsWithErrors} />);

    await waitFor(() => {
      expect(screen.getByText('Total Errors')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument(); // 50 events / 5 = 10 errors
    });
  });

  it('should render finger visualization in finger view', async () => {
    render(<ErrorAnalysis events={mockEvents} />);

    await waitFor(() => {
      expect(screen.getByText('Left Hand')).toBeInTheDocument();
      expect(screen.getByText('Right Hand')).toBeInTheDocument();
    });
  });

  it('should render keyboard layout in keyboard view', async () => {
    render(<ErrorAnalysis events={mockEvents} />);

    await waitFor(() => {
      const keyboardButton = screen.getByText('Keyboard View');
      fireEvent.click(keyboardButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Keyboard Error Distribution')).toBeInTheDocument();
    });
  });

  it('should show lowest error rate keys', async () => {
    render(<ErrorAnalysis events={mockEvents} />);

    await waitFor(() => {
      const keyboardButton = screen.getByText('Keyboard View');
      fireEvent.click(keyboardButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Keys with Lowest Error Rate')).toBeInTheDocument();
    });
  });

  it('should show highest error rate keys', async () => {
    render(<ErrorAnalysis events={mockEvents} />);

    await waitFor(() => {
      const keyboardButton = screen.getByText('Keyboard View');
      fireEvent.click(keyboardButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Keys with Highest Error Rate')).toBeInTheDocument();
    });
  });

  it('should display error message on fetch failure', async () => {
    api.sessionsAPI.getDetailedTelemetry.mockRejectedValue(new Error('Network error'));

    render(<ErrorAnalysis sessionId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load error analysis data')).toBeInTheDocument();
    });
  });

  it('should warn if data was truncated', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    api.sessionsAPI.getDetailedTelemetry.mockResolvedValue({
      events: mockEvents,
      count: mockEvents.length,
      truncated: true,
    });

    render(<ErrorAnalysis sessionId={1} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('truncated')
      );
    });

    consoleSpy.mockRestore();
  });
});
