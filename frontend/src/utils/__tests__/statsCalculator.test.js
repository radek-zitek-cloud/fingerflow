/**
 * Tests for statsCalculator utility
 */

import { describe, it, expect } from 'vitest';
import { calculateStats, calculateQuintiles, getColorFromThresholds } from '../statsCalculator';

describe('statsCalculator', () => {
  describe('calculateStats', () => {
    it('should calculate basic statistics for an array of values', () => {
      const values = [10, 20, 30, 40, 50];
      const result = calculateStats(values);

      expect(result.count).toBe(5);
      expect(result.avg).toBe(30);
      expect(result.min).toBe(10);
      expect(result.max).toBe(50);
      expect(result.stdDev).toBeCloseTo(14.142, 2); // Standard deviation
    });

    it('should handle empty array', () => {
      const result = calculateStats([]);

      expect(result).toEqual({
        count: 0,
        avg: 0,
        stdDev: 0,
        min: 0,
        max: 0,
      });
    });

    it('should handle single value', () => {
      const result = calculateStats([42]);

      expect(result.count).toBe(1);
      expect(result.avg).toBe(42);
      expect(result.stdDev).toBe(0);
      expect(result.min).toBe(42);
      expect(result.max).toBe(42);
    });

    it('should handle negative values', () => {
      const values = [-10, -5, 0, 5, 10];
      const result = calculateStats(values);

      expect(result.avg).toBe(0);
      expect(result.min).toBe(-10);
      expect(result.max).toBe(10);
    });
  });

  describe('calculateQuintiles', () => {
    it('should calculate quintile thresholds', () => {
      const values = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const thresholds = calculateQuintiles(values);

      expect(thresholds).toHaveLength(4);
      expect(thresholds[0]).toBe(20); // First quintile
      expect(thresholds[1]).toBe(40); // Second quintile
      expect(thresholds[2]).toBe(60); // Third quintile
      expect(thresholds[3]).toBe(80); // Fourth quintile
    });

    it('should handle empty array', () => {
      const thresholds = calculateQuintiles([]);

      expect(thresholds).toEqual([0, 0, 0, 0]);
    });

    it('should handle uniform values', () => {
      const values = [50, 50, 50, 50, 50];
      const thresholds = calculateQuintiles(values);

      // All thresholds should be 50 (no variation)
      expect(thresholds).toEqual([50, 50, 50, 50]);
    });
  });

  describe('getColorFromThresholds', () => {
    const thresholds = [20, 40, 60, 80];

    it('should return green for values below first threshold', () => {
      expect(getColorFromThresholds(10, thresholds)).toBe('#10b981');
      expect(getColorFromThresholds(19, thresholds)).toBe('#10b981');
    });

    it('should return yellow for values between first and second threshold', () => {
      expect(getColorFromThresholds(25, thresholds)).toBe('#eab308');
      expect(getColorFromThresholds(39, thresholds)).toBe('#eab308');
    });

    it('should return orange for values between second and third threshold', () => {
      expect(getColorFromThresholds(45, thresholds)).toBe('#f59e0b');
      expect(getColorFromThresholds(59, thresholds)).toBe('#f59e0b');
    });

    it('should return red for values between third and fourth threshold', () => {
      expect(getColorFromThresholds(65, thresholds)).toBe('#ef4444');
      expect(getColorFromThresholds(79, thresholds)).toBe('#ef4444');
    });

    it('should return purple for values above fourth threshold', () => {
      expect(getColorFromThresholds(85, thresholds)).toBe('#9333ea');
      expect(getColorFromThresholds(100, thresholds)).toBe('#9333ea');
    });

    it('should handle inverted mode (not currently used)', () => {
      // Higher is better
      expect(getColorFromThresholds(90, thresholds, true)).toBe('#10b981');
      expect(getColorFromThresholds(10, thresholds, true)).toBe('#9333ea');
    });
  });
});
