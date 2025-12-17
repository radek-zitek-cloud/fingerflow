/**
 * Statistical Calculation Utilities
 *
 * Shared statistical functions used across multiple analysis components.
 * These are pure functions with no side effects.
 */

/**
 * Calculate basic statistics (avg, stdDev, min, max) for an array of values
 * @param {number[]} values - Array of numeric values
 * @returns {Object} Statistics object with count, avg, stdDev, min, max
 */
export function calculateStats(values) {
  if (values.length === 0) {
    return { count: 0, avg: 0, stdDev: 0, min: 0, max: 0 };
  }

  const count = values.length;
  const avg = values.reduce((sum, val) => sum + val, 0) / count;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / count;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return { count, avg, stdDev, min, max };
}

/**
 * Calculate quintile thresholds from a set of values
 * Returns 4 threshold values that divide the range into 5 equal portions
 * @param {number[]} values - Array of numeric values
 * @returns {number[]} Array of 4 threshold values
 */
export function calculateQuintiles(values) {
  if (values.length === 0) {
    return [0, 0, 0, 0];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const step = range / 5;

  return [
    min + step * 1,
    min + step * 2,
    min + step * 3,
    min + step * 4,
  ];
}

/**
 * Get color based on value and thresholds
 * Uses a 5-color scheme: green (best) → yellow → orange → red → purple (worst)
 * @param {number} value - The value to colorize
 * @param {number[]} thresholds - Array of 4 threshold values
 * @param {boolean} inverted - If true, lower values are worse (for consistency metrics)
 * @returns {string} Hex color code
 */
export function getColorFromThresholds(value, thresholds, inverted = false) {
  if (!inverted) {
    // Lower is better (e.g., dwell time, flight time)
    if (value < thresholds[0]) return '#10b981'; // Green - best
    if (value < thresholds[1]) return '#eab308'; // Yellow
    if (value < thresholds[2]) return '#f59e0b'; // Orange
    if (value < thresholds[3]) return '#ef4444'; // Red
    return '#9333ea'; // Purple - worst
  } else {
    // Higher is better (not currently used, but available for future metrics)
    if (value > thresholds[3]) return '#10b981'; // Green - best
    if (value > thresholds[2]) return '#eab308'; // Yellow
    if (value > thresholds[1]) return '#f59e0b'; // Orange
    if (value > thresholds[0]) return '#ef4444'; // Red
    return '#9333ea'; // Purple - worst
  }
}
