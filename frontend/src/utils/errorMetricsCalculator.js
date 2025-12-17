/**
 * Error Metrics Calculator
 *
 * Calculates error rates and statistics from telemetry events.
 * Separated from UI components for easier testing and reuse.
 */

import { calculateQuintiles } from './statsCalculator';

/**
 * Calculate error metrics from detailed telemetry events
 * Returns error rate (%) and absolute count for normalization
 * @param {Array} events - Array of telemetry events
 * @returns {Object} Metrics object with perFinger, perKey, totalErrors, totalKeystrokes
 */
export function calculateErrorMetrics(events) {
  const errorsByFinger = {}; // Map of finger -> error count
  const errorsByKey = {}; // Map of key_code -> error count
  const totalByFinger = {}; // Map of finger -> total keystrokes
  const totalByKey = {}; // Map of key_code -> total keystrokes
  let totalErrors = 0;
  let totalKeystrokes = 0;

  // Count errors and totals per finger and per key
  for (const event of events) {
    if (event.event_type === 'DOWN') {
      totalKeystrokes++;

      const finger = event.finger_used;
      const keyCode = event.key_code;

      // Count total keystrokes
      totalByFinger[finger] = (totalByFinger[finger] || 0) + 1;
      totalByKey[keyCode] = (totalByKey[keyCode] || 0) + 1;

      // Count errors
      if (event.is_error) {
        totalErrors++;
        errorsByFinger[finger] = (errorsByFinger[finger] || 0) + 1;
        errorsByKey[keyCode] = (errorsByKey[keyCode] || 0) + 1;
      }
    }
  }

  // Calculate error rates (percentage) for fingers
  const fingerMetrics = {};
  for (const finger in totalByFinger) {
    const errors = errorsByFinger[finger] || 0;
    const total = totalByFinger[finger];
    fingerMetrics[finger] = {
      errorRate: (errors / total) * 100,
      errorCount: errors,
      totalKeystrokes: total,
    };
  }

  // Calculate error rates (percentage) for keys
  const keyMetrics = {};
  for (const keyCode in totalByKey) {
    const errors = errorsByKey[keyCode] || 0;
    const total = totalByKey[keyCode];
    keyMetrics[keyCode] = {
      errorRate: (errors / total) * 100,
      errorCount: errors,
      totalKeystrokes: total,
    };
  }

  return {
    perFinger: fingerMetrics,
    perKey: keyMetrics,
    totalErrors: totalErrors,
    totalKeystrokes: totalKeystrokes,
  };
}

/**
 * Calculate dynamic thresholds based on error rates (percentages)
 * @param {Object} metrics - Error metrics from calculateErrorMetrics
 * @returns {number[]} Array of 4 threshold values
 */
export function calculateErrorThresholds(metrics) {
  // Collect all error rates
  const allRates = [
    ...Object.values(metrics.perFinger).map(m => m.errorRate),
    ...Object.values(metrics.perKey).map(m => m.errorRate),
  ];

  return calculateQuintiles(allRates);
}

/**
 * Get color based on error rate (percentage) with dynamic thresholds
 * @param {number} errorRate - Error rate as percentage
 * @param {number[]} thresholds - Array of 4 threshold values
 * @returns {string} Hex color code
 */
export function getErrorColor(errorRate, thresholds) {
  if (errorRate === 0) return '#10b981'; // Green - no errors
  if (errorRate <= thresholds[0]) return '#10b981'; // Green - lowest rate
  if (errorRate <= thresholds[1]) return '#eab308'; // Yellow - low rate
  if (errorRate <= thresholds[2]) return '#f59e0b'; // Orange - medium rate
  if (errorRate <= thresholds[3]) return '#ef4444'; // Red - high rate
  return '#9333ea'; // Purple - highest rate
}

/**
 * Get keys with lowest error rates
 * @param {Object} keyMetrics - Key metrics from calculateErrorMetrics
 * @param {number} limit - Number of keys to return
 * @returns {Array} Array of [keyCode, metric] tuples sorted by error rate (ascending)
 */
export function getKeysWithFewestErrors(keyMetrics, limit) {
  return Object.entries(keyMetrics)
    .sort((a, b) => a[1].errorRate - b[1].errorRate)
    .slice(0, limit);
}

/**
 * Get keys with highest error rates
 * @param {Object} keyMetrics - Key metrics from calculateErrorMetrics
 * @param {number} limit - Number of keys to return
 * @returns {Array} Array of [keyCode, metric] tuples sorted by error rate (descending)
 */
export function getKeysWithMostErrors(keyMetrics, limit) {
  return Object.entries(keyMetrics)
    .sort((a, b) => b[1].errorRate - a[1].errorRate)
    .slice(0, limit);
}
