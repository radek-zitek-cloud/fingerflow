/**
 * Flight Time Calculator
 *
 * Calculates inter-keystroke interval metrics from telemetry events.
 * Flight time = time between consecutive keydown events.
 */

import { calculateStats, calculateQuintiles } from './statsCalculator';

/**
 * Calculate flight time metrics from detailed telemetry events
 * Flight time is the interval between consecutive DOWN events
 * @param {Array} events - Array of telemetry events
 * @returns {Object} Metrics object with perKey and perFinger
 */
export function calculateFlightTimeMetrics(events) {
  const flightTimes = {}; // Map of key_code -> array of flight times
  const fingerFlightTimes = {}; // Map of finger -> array of flight times

  // Get only DOWN events
  const downEvents = events.filter(event => event.event_type === 'DOWN');

  // Calculate flight time between consecutive DOWN events
  for (let i = 1; i < downEvents.length; i++) {
    const prevEvent = downEvents[i - 1];
    const currEvent = downEvents[i];

    const flightTime = currEvent.timestamp_offset - prevEvent.timestamp_offset;

    // Skip unrealistic values (negative or extremely large)
    // Also skip very long pauses (>2 seconds likely means user paused)
    if (flightTime >= 0 && flightTime < 2000) {
      // Store by key (current key being pressed)
      if (!flightTimes[currEvent.key_code]) {
        flightTimes[currEvent.key_code] = [];
      }
      flightTimes[currEvent.key_code].push(flightTime);

      // Store by finger (current finger being used)
      if (!fingerFlightTimes[currEvent.finger_used]) {
        fingerFlightTimes[currEvent.finger_used] = [];
      }
      fingerFlightTimes[currEvent.finger_used].push(flightTime);
    }
  }

  // Calculate statistics for each key
  const perKey = {};
  for (const [keyCode, times] of Object.entries(flightTimes)) {
    perKey[keyCode] = calculateStats(times);
  }

  // Calculate statistics for each finger
  const perFinger = {};
  for (const [finger, times] of Object.entries(fingerFlightTimes)) {
    perFinger[finger] = calculateStats(times);
  }

  return { perKey, perFinger };
}

/**
 * Calculate dynamic thresholds from flight time metrics
 * @param {Object} metrics - Metrics from calculateFlightTimeMetrics
 * @returns {Object} Object with speed and consistency threshold arrays
 */
export function calculateFlightTimeThresholds(metrics) {
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
 * Get color based on flight time speed (average)
 * @param {number} avgFlightTime - Average flight time in milliseconds
 * @param {number[]} thresholds - Array of 4 threshold values
 * @returns {string} Hex color code
 */
export function getFlightSpeedColor(avgFlightTime, thresholds) {
  if (avgFlightTime < thresholds[0]) return '#10b981'; // Green - fastest
  if (avgFlightTime < thresholds[1]) return '#eab308'; // Yellow - fast
  if (avgFlightTime < thresholds[2]) return '#f59e0b'; // Orange - medium
  if (avgFlightTime < thresholds[3]) return '#ef4444'; // Red - slow
  return '#9333ea'; // Purple - slowest
}

/**
 * Get color based on flight time consistency (standard deviation)
 * @param {number} stdDev - Standard deviation in milliseconds
 * @param {number[]} thresholds - Array of 4 threshold values
 * @returns {string} Hex color code
 */
export function getFlightConsistencyColor(stdDev, thresholds) {
  if (stdDev < thresholds[0]) return '#10b981'; // Green - most consistent
  if (stdDev < thresholds[1]) return '#eab308'; // Yellow - consistent
  if (stdDev < thresholds[2]) return '#f59e0b'; // Orange - variable
  if (stdDev < thresholds[3]) return '#ef4444'; // Red - inconsistent
  return '#9333ea'; // Purple - most inconsistent
}

/**
 * Get fastest keys sorted by average flight time
 * @param {Object} keyMetrics - Key metrics from calculateFlightTimeMetrics
 * @param {number} limit - Number of keys to return
 * @returns {Array} Array of [keyCode, metric] tuples
 */
export function getFastestKeys(keyMetrics, limit) {
  return Object.entries(keyMetrics)
    .filter(([_, metric]) => metric.count >= 3) // Only keys with at least 3 transitions
    .sort((a, b) => a[1].avg - b[1].avg)
    .slice(0, limit);
}

/**
 * Get slowest keys sorted by average flight time
 * @param {Object} keyMetrics - Key metrics from calculateFlightTimeMetrics
 * @param {number} limit - Number of keys to return
 * @returns {Array} Array of [keyCode, metric] tuples
 */
export function getSlowestKeys(keyMetrics, limit) {
  return Object.entries(keyMetrics)
    .filter(([_, metric]) => metric.count >= 3) // Only keys with at least 3 transitions
    .sort((a, b) => b[1].avg - a[1].avg)
    .slice(0, limit);
}
