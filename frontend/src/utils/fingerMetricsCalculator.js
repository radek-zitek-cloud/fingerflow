/**
 * Finger Metrics Calculator (Dwell Time Analysis)
 *
 * Calculates dwell time metrics from telemetry events.
 * Dwell time = time between keydown and keyup for the same key.
 */

import { calculateStats, calculateQuintiles } from './statsCalculator';

/**
 * Calculate dwell time metrics from detailed telemetry events
 * @param {Array} events - Array of telemetry events
 * @returns {Object} Metrics object with perKey and perFinger
 */
export function calculateDwellTimeMetrics(events) {
  const dwellTimes = {}; // Map of key_code -> array of dwell times
  const fingerDwellTimes = {}; // Map of finger -> array of dwell times
  const pendingDownEvents = {}; // Map of key_code -> down event (waiting for UP event)

  // Process events in order to match DOWN/UP pairs
  for (const event of events) {
    if (event.event_type === 'DOWN') {
      // Store DOWN event, waiting for matching UP
      pendingDownEvents[event.key_code] = event;
    } else if (event.event_type === 'UP') {
      // Find matching DOWN event
      const downEvent = pendingDownEvents[event.key_code];
      if (downEvent) {
        // Calculate dwell time
        const dwellTime = event.timestamp_offset - downEvent.timestamp_offset;

        // Skip unrealistic values (negative or extremely large)
        if (dwellTime >= 0 && dwellTime < 1000) {
          // Store by key
          if (!dwellTimes[event.key_code]) {
            dwellTimes[event.key_code] = [];
          }
          dwellTimes[event.key_code].push(dwellTime);

          // Store by finger
          if (!fingerDwellTimes[event.finger_used]) {
            fingerDwellTimes[event.finger_used] = [];
          }
          fingerDwellTimes[event.finger_used].push(dwellTime);
        }

        // Clear pending DOWN event
        delete pendingDownEvents[event.key_code];
      }
    }
  }

  // Calculate statistics for each key
  const perKey = {};
  for (const [keyCode, times] of Object.entries(dwellTimes)) {
    perKey[keyCode] = calculateStats(times);
  }

  // Calculate statistics for each finger
  const perFinger = {};
  for (const [finger, times] of Object.entries(fingerDwellTimes)) {
    perFinger[finger] = calculateStats(times);
  }

  return { perKey, perFinger };
}

/**
 * Calculate dynamic thresholds from dwell time metrics
 * @param {Object} metrics - Metrics from calculateDwellTimeMetrics
 * @returns {Object} Object with speed and consistency threshold arrays
 */
export function calculateDwellTimeThresholds(metrics) {
  // Collect all average and stdDev values
  const allAvgs = [];
  const allStdDevs = [];

  // Collect from perFinger
  Object.values(metrics.perFinger).forEach(metric => {
    if (metric && metric.count > 0) {
      allAvgs.push(metric.avg);
      allStdDevs.push(metric.stdDev);
    }
  });

  // Collect from perKey
  Object.values(metrics.perKey).forEach(metric => {
    if (metric && metric.count > 0) {
      allAvgs.push(metric.avg);
      allStdDevs.push(metric.stdDev);
    }
  });

  return {
    speed: calculateQuintiles(allAvgs),
    consistency: calculateQuintiles(allStdDevs),
  };
}

/**
 * Get color based on speed (average dwell time)
 * @param {number} avgDwellTime - Average dwell time in milliseconds
 * @param {number[]} thresholds - Array of 4 threshold values
 * @returns {string} Hex color code
 */
export function getSpeedColor(avgDwellTime, thresholds) {
  if (avgDwellTime < thresholds[0]) return '#10b981'; // Green - fastest
  if (avgDwellTime < thresholds[1]) return '#eab308'; // Yellow - fast
  if (avgDwellTime < thresholds[2]) return '#f59e0b'; // Orange - medium
  if (avgDwellTime < thresholds[3]) return '#ef4444'; // Red - slow
  return '#9333ea'; // Purple - slowest
}

/**
 * Get color based on consistency (standard deviation)
 * @param {number} stdDev - Standard deviation in milliseconds
 * @param {number[]} thresholds - Array of 4 threshold values
 * @returns {string} Hex color code
 */
export function getConsistencyColor(stdDev, thresholds) {
  if (stdDev < thresholds[0]) return '#10b981'; // Green - most consistent
  if (stdDev < thresholds[1]) return '#eab308'; // Yellow - consistent
  if (stdDev < thresholds[2]) return '#f59e0b'; // Orange - variable
  if (stdDev < thresholds[3]) return '#ef4444'; // Red - inconsistent
  return '#9333ea'; // Purple - most inconsistent
}

/**
 * Get fastest keys sorted by average dwell time
 * @param {Object} keyMetrics - Key metrics from calculateDwellTimeMetrics
 * @param {number} limit - Number of keys to return
 * @returns {Array} Array of [keyCode, metric] tuples
 */
export function getFastestKeys(keyMetrics, limit) {
  return Object.entries(keyMetrics)
    .filter(([, metric]) => metric.count >= 3) // Only keys with at least 3 presses
    .sort((a, b) => a[1].avg - b[1].avg)
    .slice(0, limit);
}

/**
 * Get slowest keys sorted by average dwell time
 * @param {Object} keyMetrics - Key metrics from calculateDwellTimeMetrics
 * @param {number} limit - Number of keys to return
 * @returns {Array} Array of [keyCode, metric] tuples
 */
export function getSlowestKeys(keyMetrics, limit) {
  return Object.entries(keyMetrics)
    .filter(([, metric]) => metric.count >= 3) // Only keys with at least 3 presses
    .sort((a, b) => b[1].avg - a[1].avg)
    .slice(0, limit);
}
