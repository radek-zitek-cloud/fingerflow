/**
 * Tests for useTelemetry hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTelemetry } from '../useTelemetry';
import * as api from '../../services/api';

// Mock the API
vi.mock('../../services/api', () => ({
  sessionsAPI: {
    addTelemetryBatch: vi.fn(),
  },
}));

describe('useTelemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with empty buffer', () => {
    const { result } = renderHook(() => useTelemetry(1, Date.now()));

    expect(result.current.addEvent).toBeDefined();
    expect(result.current.flush).toBeDefined();
  });

  it('should buffer events without sending immediately', () => {
    const sessionId = 1;
    const sessionStartTime = Date.now();

    const { result } = renderHook(() => useTelemetry(sessionId, sessionStartTime));

    act(() => {
      result.current.addEvent('DOWN', 'KeyA', false, Date.now());
    });

    // Should not have called API yet
    expect(api.sessionsAPI.addTelemetryBatch).not.toHaveBeenCalled();
  });

  it('should flush when buffer reaches size limit (50 events)', async () => {
    const sessionId = 1;
    const sessionStartTime = Date.now();

    api.sessionsAPI.addTelemetryBatch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useTelemetry(sessionId, sessionStartTime));

    // Add 50 events
    act(() => {
      for (let i = 0; i < 50; i++) {
        result.current.addEvent('DOWN', `Key${String.fromCharCode(65 + (i % 26))}`, false, Date.now() + i);
      }
    });

    await waitFor(() => {
      expect(api.sessionsAPI.addTelemetryBatch).toHaveBeenCalled();
    });

    const callArgs = api.sessionsAPI.addTelemetryBatch.mock.calls[0];
    expect(callArgs[0]).toBe(sessionId);
    expect(callArgs[1]).toHaveLength(50);
  });

  it('should flush after 5 seconds timeout', async () => {
    const sessionId = 1;
    const sessionStartTime = Date.now();

    api.sessionsAPI.addTelemetryBatch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useTelemetry(sessionId, sessionStartTime));

    // Add a few events (less than buffer limit)
    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.addEvent('DOWN', 'KeyA', false, Date.now());
      }
    });

    // Advance timer by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(api.sessionsAPI.addTelemetryBatch).toHaveBeenCalled();
    });
  });

  it('should manually flush events', async () => {
    const sessionId = 1;
    const sessionStartTime = Date.now();

    api.sessionsAPI.addTelemetryBatch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useTelemetry(sessionId, sessionStartTime));

    // Add a few events
    act(() => {
      result.current.addEvent('DOWN', 'KeyA', false, Date.now());
      result.current.addEvent('UP', 'KeyA', false, Date.now() + 100);
    });

    // Manually flush
    await act(async () => {
      await result.current.flush();
    });

    expect(api.sessionsAPI.addTelemetryBatch).toHaveBeenCalled();
  });

  it('should calculate correct timestamp offset', () => {
    const sessionStartTime = 1000;
    const eventTime = 1500;

    const { result } = renderHook(() => useTelemetry(1, sessionStartTime));

    act(() => {
      result.current.addEvent('DOWN', 'KeyA', false, eventTime);
    });

    // Flush to capture the event
    act(async () => {
      await result.current.flush();
    });

    if (api.sessionsAPI.addTelemetryBatch.mock.calls.length > 0) {
      const events = api.sessionsAPI.addTelemetryBatch.mock.calls[0][1];
      expect(events[0].timestamp_offset).toBe(500); // 1500 - 1000
    }
  });

  it('should not send events if no sessionId', () => {
    const { result } = renderHook(() => useTelemetry(null, Date.now()));

    act(() => {
      result.current.addEvent('DOWN', 'KeyA', false, Date.now());
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(api.sessionsAPI.addTelemetryBatch).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    api.sessionsAPI.addTelemetryBatch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTelemetry(1, Date.now()));

    act(() => {
      for (let i = 0; i < 50; i++) {
        result.current.addEvent('DOWN', 'KeyA', false, Date.now());
      }
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('should handle 404 errors gracefully without caching', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem');

    api.sessionsAPI.addTelemetryBatch.mockRejectedValue(new Error('Session not found or access denied'));

    const { result } = renderHook(() => useTelemetry(1, Date.now()));

    act(() => {
      for (let i = 0; i < 50; i++) {
        result.current.addEvent('DOWN', 'KeyA', false, Date.now());
      }
    });

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Session not found'),
        1
      );
    });

    // Should NOT cache events in localStorage for 404 errors
    expect(localStorageSpy).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
    localStorageSpy.mockRestore();
  });

  it('should clear buffer after successful flush', async () => {
    api.sessionsAPI.addTelemetryBatch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useTelemetry(1, Date.now()));

    // Add events and flush
    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.addEvent('DOWN', 'KeyA', false, Date.now());
      }
    });

    await act(async () => {
      await result.current.flush();
    });

    // Clear mock calls
    api.sessionsAPI.addTelemetryBatch.mockClear();

    // Flush again - should not send anything
    await act(async () => {
      await result.current.flush();
    });

    expect(api.sessionsAPI.addTelemetryBatch).not.toHaveBeenCalled();
  });
});
