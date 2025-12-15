/**
 * Telemetry Manager Hook
 *
 * CRITICAL PERFORMANCE REQUIREMENTS:
 * - Never send API request on every keystroke
 * - Buffer events and flush when: buffer.length > 50 OR time > 5000ms
 * - Use navigator.sendBeacon for flush-on-unload reliability
 * - Cache locally (localStorage) and retry if backend is offline
 */

import { useEffect, useRef, useCallback } from 'react';
import { telemetryAPI } from '../services/api';
import { systemAPI } from '../services/api';

const BUFFER_SIZE_THRESHOLD = 50;
const TIME_THRESHOLD_MS = 5000;
const STORAGE_KEY = 'fingerflow_telemetry_buffer';

/**
 * Map key code to finger position
 * This is a simplified mapping - production version should be more comprehensive
 */
function mapKeyToFinger(keyCode) {
  // Left hand
  const leftPinky = ['KeyQ', 'KeyA', 'KeyZ', 'Digit1', 'Tab', 'CapsLock', 'ShiftLeft'];
  const leftRing = ['KeyW', 'KeyS', 'KeyX', 'Digit2'];
  const leftMiddle = ['KeyE', 'KeyD', 'KeyC', 'Digit3'];
  const leftIndex = ['KeyR', 'KeyF', 'KeyV', 'KeyT', 'KeyG', 'KeyB', 'Digit4', 'Digit5'];
  const leftThumb = ['Space'];

  // Right hand
  const rightIndex = ['KeyY', 'KeyH', 'KeyN', 'KeyU', 'KeyJ', 'KeyM', 'Digit6', 'Digit7'];
  const rightMiddle = ['KeyI', 'KeyK', 'Comma', 'Digit8'];
  const rightRing = ['KeyO', 'KeyL', 'Period', 'Digit9'];
  const rightPinky = ['KeyP', 'Semicolon', 'Slash', 'Digit0', 'BracketLeft', 'BracketRight', 'Quote', 'Enter', 'Backspace'];
  const rightThumb = []; // Space is typically left thumb

  if (leftPinky.includes(keyCode)) return 'L_PINKY';
  if (leftRing.includes(keyCode)) return 'L_RING';
  if (leftMiddle.includes(keyCode)) return 'L_MIDDLE';
  if (leftIndex.includes(keyCode)) return 'L_INDEX';
  if (leftThumb.includes(keyCode)) return 'L_THUMB';
  if (rightThumb.includes(keyCode)) return 'R_THUMB';
  if (rightIndex.includes(keyCode)) return 'R_INDEX';
  if (rightMiddle.includes(keyCode)) return 'R_MIDDLE';
  if (rightRing.includes(keyCode)) return 'R_RING';
  if (rightPinky.includes(keyCode)) return 'R_PINKY';

  return 'L_INDEX'; // Default fallback
}

export function useTelemetry(sessionId, sessionStartTime) {
  const bufferRef = useRef([]);
  const flushTimerRef = useRef(null);
  const sessionStartRef = useRef(sessionStartTime);

  /**
   * Flush buffered events to the backend
   */
  const flush = useCallback(async () => {
    if (!sessionId || bufferRef.current.length === 0) {
      return;
    }

    const eventsToSend = [...bufferRef.current];
    bufferRef.current = [];

    // Clear flush timer
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    try {
      await telemetryAPI.ingest(sessionId, eventsToSend);
      systemAPI.log('debug', 'Telemetry batch sent', {
        component: 'TelemetryManager',
        event_count: eventsToSend.length,
        session_id: sessionId,
      });

      // Clear localStorage backup on successful send
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to send telemetry batch:', error);

      // Cache failed events in localStorage for retry
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...cached, ...eventsToSend]));

      systemAPI.log('error', 'Telemetry ingestion failed', {
        component: 'TelemetryManager',
        error: error.message,
        cached_count: cached.length + eventsToSend.length,
      });
    }
  }, [sessionId]);

  /**
   * Add event to buffer and check if flush is needed
   */
  const addEvent = useCallback((eventType, keyCode, isError = false) => {
    if (!sessionId) return;

    const timestampOffset = Date.now() - sessionStartRef.current;
    const fingerUsed = mapKeyToFinger(keyCode);

    const event = {
      event_type: eventType,
      key_code: keyCode,
      timestamp_offset: timestampOffset,
      finger_used: fingerUsed,
      is_error: isError,
    };

    bufferRef.current.push(event);

    // Check if we need to flush
    if (bufferRef.current.length >= BUFFER_SIZE_THRESHOLD) {
      flush();
    } else {
      // Reset timer
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }

      // Set new timer
      flushTimerRef.current = setTimeout(() => {
        flush();
      }, TIME_THRESHOLD_MS);
    }
  }, [sessionId, flush]);

  /**
   * Setup event listeners for keydown/keyup
   */
  useEffect(() => {
    if (!sessionId) return;

    const handleKeyDown = (e) => {
      // Don't capture browser shortcuts or non-character keys
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      addEvent('DOWN', e.code);
    };

    const handleKeyUp = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      addEvent('UP', e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [sessionId, addEvent]);

  /**
   * Flush on component unmount or page unload
   */
  useEffect(() => {
    if (!sessionId) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable flush on page close
      if (bufferRef.current.length > 0 && navigator.sendBeacon) {
        const token = localStorage.getItem('auth_token');
        const blob = new Blob(
          [JSON.stringify({ events: bufferRef.current })],
          { type: 'application/json' }
        );

        navigator.sendBeacon(
          `/api/sessions/${sessionId}/telemetry`,
          blob
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flush(); // Flush on component unmount
    };
  }, [sessionId, flush]);

  return {
    addEvent,
    flush,
  };
}
