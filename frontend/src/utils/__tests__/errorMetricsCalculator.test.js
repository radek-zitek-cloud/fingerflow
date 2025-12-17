/**
 * Tests for errorMetricsCalculator utility
 */

import { describe, it, expect } from 'vitest';
import {
  calculateErrorMetrics,
  calculateErrorThresholds,
  getErrorColor,
  getKeysWithFewestErrors,
  getKeysWithMostErrors,
} from '../errorMetricsCalculator';
import { createMockTelemetryEvents } from '@test/utils/testUtils';

describe('errorMetricsCalculator', () => {
  describe('calculateErrorMetrics', () => {
    it('should calculate error rates per finger and key', () => {
      const events = [
        {
          event_type: 'DOWN',
          key_code: 'KeyA',
          finger_used: 'L_PINKY',
          is_error: false,
        },
        {
          event_type: 'DOWN',
          key_code: 'KeyA',
          finger_used: 'L_PINKY',
          is_error: true, // 1 error out of 2 presses
        },
        {
          event_type: 'DOWN',
          key_code: 'KeyB',
          finger_used: 'L_INDEX',
          is_error: false,
        },
      ];

      const metrics = calculateErrorMetrics(events);

      expect(metrics.totalErrors).toBe(1);
      expect(metrics.totalKeystrokes).toBe(3);

      // L_PINKY has 1 error out of 2 keystrokes = 50%
      expect(metrics.perFinger.L_PINKY.errorRate).toBe(50);
      expect(metrics.perFinger.L_PINKY.errorCount).toBe(1);
      expect(metrics.perFinger.L_PINKY.totalKeystrokes).toBe(2);

      // L_INDEX has 0 errors out of 1 keystroke = 0%
      expect(metrics.perFinger.L_INDEX.errorRate).toBe(0);
      expect(metrics.perFinger.L_INDEX.errorCount).toBe(0);

      // KeyA has 1 error out of 2 presses = 50%
      expect(metrics.perKey.KeyA.errorRate).toBe(50);
      expect(metrics.perKey.KeyA.errorCount).toBe(1);
    });

    it('should only count DOWN events', () => {
      const events = [
        { event_type: 'DOWN', key_code: 'KeyA', finger_used: 'L_PINKY', is_error: true },
        { event_type: 'UP', key_code: 'KeyA', finger_used: 'L_PINKY', is_error: true },
      ];

      const metrics = calculateErrorMetrics(events);

      expect(metrics.totalErrors).toBe(1); // Only the DOWN event counted
      expect(metrics.totalKeystrokes).toBe(1);
    });

    it('should handle sessions with no errors', () => {
      const events = createMockTelemetryEvents(10, 'DOWN').map(e => ({
        ...e,
        is_error: false,
      }));

      const metrics = calculateErrorMetrics(events);

      expect(metrics.totalErrors).toBe(0);
      Object.values(metrics.perFinger).forEach(finger => {
        expect(finger.errorRate).toBe(0);
        expect(finger.errorCount).toBe(0);
      });
    });
  });

  describe('calculateErrorThresholds', () => {
    it('should calculate dynamic thresholds from metrics', () => {
      const metrics = {
        perFinger: {
          L_PINKY: { errorRate: 10 },
          L_INDEX: { errorRate: 5 },
        },
        perKey: {
          KeyA: { errorRate: 20 },
          KeyB: { errorRate: 0 },
        },
      };

      const thresholds = calculateErrorThresholds(metrics);

      expect(thresholds).toHaveLength(4);
      expect(thresholds[0]).toBeGreaterThan(0);
      expect(thresholds[3]).toBeLessThanOrEqual(20);
    });
  });

  describe('getErrorColor', () => {
    const thresholds = [5, 10, 15, 20];

    it('should return green for 0% error rate', () => {
      expect(getErrorColor(0, thresholds)).toBe('#10b981');
    });

    it('should return appropriate colors based on error rate', () => {
      expect(getErrorColor(3, thresholds)).toBe('#10b981'); // Green - lowest
      expect(getErrorColor(7, thresholds)).toBe('#eab308'); // Yellow - low
      expect(getErrorColor(12, thresholds)).toBe('#f59e0b'); // Orange - medium
      expect(getErrorColor(17, thresholds)).toBe('#ef4444'); // Red - high
      expect(getErrorColor(25, thresholds)).toBe('#9333ea'); // Purple - highest
    });
  });

  describe('getKeysWithFewestErrors', () => {
    it('should return keys sorted by error rate (ascending)', () => {
      const keyMetrics = {
        KeyA: { errorRate: 10, errorCount: 5 },
        KeyB: { errorRate: 5, errorCount: 2 },
        KeyC: { errorRate: 15, errorCount: 8 },
      };

      const result = getKeysWithFewestErrors(keyMetrics, 2);

      expect(result).toHaveLength(2);
      expect(result[0][0]).toBe('KeyB'); // Lowest error rate
      expect(result[1][0]).toBe('KeyA');
    });
  });

  describe('getKeysWithMostErrors', () => {
    it('should return keys sorted by error rate (descending)', () => {
      const keyMetrics = {
        KeyA: { errorRate: 10, errorCount: 5 },
        KeyB: { errorRate: 5, errorCount: 2 },
        KeyC: { errorRate: 15, errorCount: 8 },
      };

      const result = getKeysWithMostErrors(keyMetrics, 2);

      expect(result).toHaveLength(2);
      expect(result[0][0]).toBe('KeyC'); // Highest error rate
      expect(result[1][0]).toBe('KeyA');
    });
  });
});
