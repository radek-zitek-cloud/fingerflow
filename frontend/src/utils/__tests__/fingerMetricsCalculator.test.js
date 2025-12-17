/**
 * Tests for fingerMetricsCalculator utility
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDwellTimeMetrics,
  calculateDwellTimeThresholds,
  getSpeedColor,
  getConsistencyColor,
  getFastestKeys,
  getSlowestKeys,
} from '../fingerMetricsCalculator';

describe('fingerMetricsCalculator', () => {
  describe('calculateDwellTimeMetrics', () => {
    it('should calculate dwell time (keydown to keyup) for each key', () => {
      const events = [
        {
          event_type: 'DOWN',
          key_code: 'KeyA',
          finger_used: 'L_PINKY',
          timestamp_offset: 0,
        },
        {
          event_type: 'UP',
          key_code: 'KeyA',
          finger_used: 'L_PINKY',
          timestamp_offset: 100, // 100ms dwell time
        },
        {
          event_type: 'DOWN',
          key_code: 'KeyA',
          finger_used: 'L_PINKY',
          timestamp_offset: 200,
        },
        {
          event_type: 'UP',
          key_code: 'KeyA',
          finger_used: 'L_PINKY',
          timestamp_offset: 350, // 150ms dwell time
        },
      ];

      const metrics = calculateDwellTimeMetrics(events);

      expect(metrics.perKey.KeyA.count).toBe(2);
      expect(metrics.perKey.KeyA.avg).toBe(125); // (100 + 150) / 2
      expect(metrics.perKey.KeyA.min).toBe(100);
      expect(metrics.perKey.KeyA.max).toBe(150);

      expect(metrics.perFinger.L_PINKY.count).toBe(2);
      expect(metrics.perFinger.L_PINKY.avg).toBe(125);
    });

    it('should ignore unrealistic dwell times', () => {
      const events = [
        { event_type: 'DOWN', key_code: 'KeyA', finger_used: 'L_PINKY', timestamp_offset: 0 },
        { event_type: 'UP', key_code: 'KeyA', finger_used: 'L_PINKY', timestamp_offset: -10 }, // Negative - ignored
        { event_type: 'DOWN', key_code: 'KeyA', finger_used: 'L_PINKY', timestamp_offset: 100 },
        { event_type: 'UP', key_code: 'KeyA', finger_used: 'L_PINKY', timestamp_offset: 1200 }, // >1000ms - ignored
      ];

      const metrics = calculateDwellTimeMetrics(events);

      expect(metrics.perKey.KeyA).toBeUndefined(); // No valid measurements
    });

    it('should handle unmatched DOWN events', () => {
      const events = [
        { event_type: 'DOWN', key_code: 'KeyA', finger_used: 'L_PINKY', timestamp_offset: 0 },
        { event_type: 'DOWN', key_code: 'KeyB', finger_used: 'L_INDEX', timestamp_offset: 50 },
        // No UP events
      ];

      const metrics = calculateDwellTimeMetrics(events);

      expect(metrics.perKey).toEqual({});
      expect(metrics.perFinger).toEqual({});
    });
  });

  describe('calculateDwellTimeThresholds', () => {
    it('should calculate speed and consistency thresholds', () => {
      const metrics = {
        perFinger: {
          L_PINKY: { count: 5, avg: 100, stdDev: 10 },
          L_INDEX: { count: 5, avg: 80, stdDev: 5 },
        },
        perKey: {
          KeyA: { count: 5, avg: 120, stdDev: 15 },
        },
      };

      const thresholds = calculateDwellTimeThresholds(metrics);

      expect(thresholds.speed).toHaveLength(4);
      expect(thresholds.consistency).toHaveLength(4);
      expect(thresholds.speed[0]).toBeGreaterThan(0);
      expect(thresholds.consistency[0]).toBeGreaterThan(0);
    });

    it('should skip metrics with count 0', () => {
      const metrics = {
        perFinger: {
          L_PINKY: { count: 0, avg: 0, stdDev: 0 },
          L_INDEX: { count: 5, avg: 100, stdDev: 10 },
        },
        perKey: {},
      };

      const thresholds = calculateDwellTimeThresholds(metrics);

      expect(thresholds.speed).toBeDefined();
      expect(thresholds.consistency).toBeDefined();
    });
  });

  describe('getSpeedColor', () => {
    const thresholds = [80, 100, 120, 140];

    it('should return faster colors for lower dwell times', () => {
      expect(getSpeedColor(70, thresholds)).toBe('#10b981'); // Fastest
      expect(getSpeedColor(90, thresholds)).toBe('#eab308'); // Fast
      expect(getSpeedColor(110, thresholds)).toBe('#f59e0b'); // Medium
      expect(getSpeedColor(130, thresholds)).toBe('#ef4444'); // Slow
      expect(getSpeedColor(150, thresholds)).toBe('#9333ea'); // Slowest
    });
  });

  describe('getConsistencyColor', () => {
    const thresholds = [5, 10, 15, 20];

    it('should return consistent colors for lower std dev', () => {
      expect(getConsistencyColor(3, thresholds)).toBe('#10b981'); // Most consistent
      expect(getConsistencyColor(7, thresholds)).toBe('#eab308'); // Consistent
      expect(getConsistencyColor(12, thresholds)).toBe('#f59e0b'); // Variable
      expect(getConsistencyColor(17, thresholds)).toBe('#ef4444'); // Inconsistent
      expect(getConsistencyColor(25, thresholds)).toBe('#9333ea'); // Most inconsistent
    });
  });

  describe('getFastestKeys', () => {
    it('should return keys with lowest average dwell time', () => {
      const keyMetrics = {
        KeyA: { count: 5, avg: 100 },
        KeyB: { count: 5, avg: 80 },
        KeyC: { count: 2, avg: 70 }, // Will be excluded (count < 3)
        KeyD: { count: 5, avg: 120 },
      };

      const result = getFastestKeys(keyMetrics, 2);

      expect(result).toHaveLength(2);
      expect(result[0][0]).toBe('KeyB'); // Fastest with count >= 3
      expect(result[1][0]).toBe('KeyA');
    });
  });

  describe('getSlowestKeys', () => {
    it('should return keys with highest average dwell time', () => {
      const keyMetrics = {
        KeyA: { count: 5, avg: 100 },
        KeyB: { count: 5, avg: 80 },
        KeyC: { count: 5, avg: 120 },
      };

      const result = getSlowestKeys(keyMetrics, 2);

      expect(result).toHaveLength(2);
      expect(result[0][0]).toBe('KeyC'); // Slowest
      expect(result[1][0]).toBe('KeyA');
    });
  });
});
