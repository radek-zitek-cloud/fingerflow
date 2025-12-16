/**
 * Finger Analysis Component
 *
 * Displays biomechanical analysis of typing performance:
 * - Dwell time metrics per finger (average and consistency)
 * - Visual representation of both hands with color-coded fingers
 * - Keyboard layout with per-key metrics
 * - Color coding based on speed (fast vs slow) and consistency (low vs high variance)
 */

import { useState, useEffect, useMemo } from 'react';
import { sessionsAPI } from '../../services/api';
import { Hand, Keyboard, TrendingDown, TrendingUp } from 'lucide-react';

export function FingerAnalysis({ sessionId, events }) {
  const [detailedTelemetry, setDetailedTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('fingers'); // 'fingers' or 'keyboard'

  // Load detailed telemetry data (only if events not provided directly)
  useEffect(() => {
    // If events are provided directly, use them
    if (events) {
      setDetailedTelemetry({ events });
      setLoading(false);
      return;
    }

    // Otherwise, fetch from API using sessionId
    const loadDetailedTelemetry = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await sessionsAPI.getDetailedTelemetry(sessionId);

        // Warn if data was truncated
        if (data.truncated) {
          console.warn(
            `Session ${sessionId} detailed data was truncated. Showing ${data.count} events. ` +
            `Analysis may be incomplete.`
          );
        }
        setDetailedTelemetry(data);
      } catch (err) {
        console.error('Failed to load detailed telemetry:', err);
        setError('Failed to load finger analysis data');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      loadDetailedTelemetry();
    }
  }, [sessionId, events]);

  // Calculate dwell time metrics and thresholds
  const { metrics, thresholds } = useMemo(() => {
    if (!detailedTelemetry || !detailedTelemetry.events) return { metrics: null, thresholds: null };

    const metricsData = calculateDwellTimeMetrics(detailedTelemetry.events);
    const thresholdsData = calculateThresholds(metricsData);

    return { metrics: metricsData, thresholds: thresholdsData };
  }, [detailedTelemetry]);

  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-xl">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm" style={{ color: 'var(--text-dim)' }}>
            Calculating finger metrics...
          </p>
        </div>
      </div>
    );
  }

  if (error || !metrics || !thresholds) {
    return (
      <div className="glass-panel p-6 rounded-xl">
        <p className="text-center" style={{ color: 'var(--status-error)' }}>
          {error || 'Unable to calculate finger metrics'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setViewMode('fingers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            viewMode === 'fingers' ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-input)]'
          }`}
          style={viewMode === 'fingers' ? {} : { color: 'var(--text-dim)' }}
        >
          <Hand className="w-4 h-4" />
          Finger View
        </button>
        <button
          onClick={() => setViewMode('keyboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            viewMode === 'keyboard' ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-input)]'
          }`}
          style={viewMode === 'keyboard' ? {} : { color: 'var(--text-dim)' }}
        >
          <Keyboard className="w-4 h-4" />
          Keyboard View
        </button>
      </div>

      {/* Legend */}
      <div className="glass-panel p-4 rounded-xl mb-6">
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-main)' }}>
          Color Coding Guide (Calibrated to Your Session)
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold mb-2" style={{ color: 'var(--text-dim)' }}>Speed (Average Dwell Time)</p>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
              <span style={{ color: 'var(--text-dim)' }}>Fastest (&lt; {thresholds.speed[0].toFixed(0)}ms)</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }}></div>
              <span style={{ color: 'var(--text-dim)' }}>Fast ({thresholds.speed[0].toFixed(0)}-{thresholds.speed[1].toFixed(0)}ms)</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
              <span style={{ color: 'var(--text-dim)' }}>Medium ({thresholds.speed[1].toFixed(0)}-{thresholds.speed[2].toFixed(0)}ms)</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
              <span style={{ color: 'var(--text-dim)' }}>Slow ({thresholds.speed[2].toFixed(0)}-{thresholds.speed[3].toFixed(0)}ms)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#9333ea' }}></div>
              <span style={{ color: 'var(--text-dim)' }}>Slowest (&gt; {thresholds.speed[3].toFixed(0)}ms)</span>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2" style={{ color: 'var(--text-dim)' }}>Consistency (Std Dev)</p>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 rounded border-2" style={{ borderColor: '#10b981' }}></div>
              <span style={{ color: 'var(--text-dim)' }}>Most Consistent (&lt; {thresholds.consistency[0].toFixed(0)}ms)</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 rounded border-2" style={{ borderColor: '#eab308' }}></div>
              <span style={{ color: 'var(--text-dim)' }}>Consistent ({thresholds.consistency[0].toFixed(0)}-{thresholds.consistency[1].toFixed(0)}ms)</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 rounded border-2" style={{ borderColor: '#f59e0b' }}></div>
              <span style={{ color: 'var(--text-dim)' }}>Variable ({thresholds.consistency[1].toFixed(0)}-{thresholds.consistency[2].toFixed(0)}ms)</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 rounded border-2" style={{ borderColor: '#ef4444' }}></div>
              <span style={{ color: 'var(--text-dim)' }}>Inconsistent ({thresholds.consistency[2].toFixed(0)}-{thresholds.consistency[3].toFixed(0)}ms)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2" style={{ borderColor: '#9333ea' }}></div>
              <span style={{ color: 'var(--text-dim)' }}>Most Inconsistent (&gt; {thresholds.consistency[3].toFixed(0)}ms)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'fingers' ? (
        <FingerView fingerMetrics={metrics.perFinger} thresholds={thresholds} />
      ) : (
        <KeyboardView keyMetrics={metrics.perKey} thresholds={thresholds} />
      )}
    </div>
  );
}

// Finger visualization component
function FingerView({ fingerMetrics, thresholds }) {
  // Define finger layout for visual representation
  const leftHand = [
    { finger: 'L_PINKY', label: 'Pinky', row: 1 },
    { finger: 'L_RING', label: 'Ring', row: 0 },
    { finger: 'L_MIDDLE', label: 'Middle', row: 0 },
    { finger: 'L_INDEX', label: 'Index', row: 1 },
    { finger: 'L_THUMB', label: 'Thumb', row: 2 },
  ];

  const rightHand = [
    { finger: 'R_THUMB', label: 'Thumb', row: 2 },
    { finger: 'R_INDEX', label: 'Index', row: 1 },
    { finger: 'R_MIDDLE', label: 'Middle', row: 0 },
    { finger: 'R_RING', label: 'Ring', row: 0 },
    { finger: 'R_PINKY', label: 'Pinky', row: 1 },
  ];

  return (
    <div className="glass-panel p-8 rounded-xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Hand */}
        <div>
          <h3 className="text-lg font-semibold mb-6 text-center" style={{ color: 'var(--text-main)' }}>
            Left Hand
          </h3>
          <div className="flex justify-center items-end gap-3" style={{ height: '300px' }}>
            {leftHand.map(({ finger, label, row }) => {
              const metric = fingerMetrics[finger];
              return (
                <FingerColumn
                  key={finger}
                  label={label}
                  metric={metric}
                  row={row}
                  thresholds={thresholds}
                />
              );
            })}
          </div>
        </div>

        {/* Right Hand */}
        <div>
          <h3 className="text-lg font-semibold mb-6 text-center" style={{ color: 'var(--text-main)' }}>
            Right Hand
          </h3>
          <div className="flex justify-center items-end gap-3" style={{ height: '300px' }}>
            {rightHand.map(({ finger, label, row }) => {
              const metric = fingerMetrics[finger];
              return (
                <FingerColumn
                  key={finger}
                  label={label}
                  metric={metric}
                  row={row}
                  thresholds={thresholds}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Stats Table */}
      <div className="mt-12">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-main)' }}>
          Detailed Finger Statistics
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--key-border)' }}>
                <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>Finger</th>
                <th className="text-right py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>Keystrokes</th>
                <th className="text-right py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>Avg Dwell (ms)</th>
                <th className="text-right py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>Std Dev (ms)</th>
                <th className="text-right py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>Min (ms)</th>
                <th className="text-right py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>Max (ms)</th>
              </tr>
            </thead>
            <tbody>
              {[...leftHand, ...rightHand].map(({ finger, label }) => {
                const metric = fingerMetrics[finger];
                if (!metric) return null;

                return (
                  <tr key={finger} className="border-b" style={{ borderColor: 'var(--key-border)' }}>
                    <td className="py-3 px-4" style={{ color: 'var(--text-main)' }}>{label} ({finger.split('_')[0]})</td>
                    <td className="text-right py-3 px-4" style={{ color: 'var(--text-main)' }}>{metric.count}</td>
                    <td className="text-right py-3 px-4 font-semibold" style={{ color: getSpeedColor(metric.avg, thresholds.speed) }}>{metric.avg.toFixed(1)}</td>
                    <td className="text-right py-3 px-4 font-semibold" style={{ color: getConsistencyColor(metric.stdDev, thresholds.consistency) }}>{metric.stdDev.toFixed(1)}</td>
                    <td className="text-right py-3 px-4" style={{ color: 'var(--text-dim)' }}>{metric.min.toFixed(1)}</td>
                    <td className="text-right py-3 px-4" style={{ color: 'var(--text-dim)' }}>{metric.max.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Finger column visualization
function FingerColumn({ label, metric, row, thresholds }) {
  if (!metric) {
    return (
      <div className="flex flex-col items-center" style={{ marginBottom: `${row * 30}px` }}>
        <div
          className="w-16 rounded-t-full"
          style={{
            height: '50px',
            backgroundColor: 'var(--bg-input)',
            opacity: 0.3,
          }}
        />
        <p className="text-xs mt-2" style={{ color: 'var(--text-dim)' }}>{label}</p>
        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>-</p>
      </div>
    );
  }

  const speedColor = getSpeedColor(metric.avg, thresholds.speed);
  const consistencyColor = getConsistencyColor(metric.stdDev, thresholds.consistency);

  // Height based on average dwell time (inverted - shorter is better)
  const maxHeight = 200;
  const minHeight = 80;
  const normalizedHeight = Math.max(minHeight, Math.min(maxHeight, maxHeight - (metric.avg - 50)));

  return (
    <div className="flex flex-col items-center" style={{ marginBottom: `${row * 30}px` }}>
      <div
        className="w-16 rounded-t-full transition-all duration-300 hover:opacity-80"
        style={{
          height: `${normalizedHeight}px`,
          backgroundColor: speedColor,
          border: `3px solid ${consistencyColor}`,
        }}
        title={`${label}: ${metric.avg.toFixed(1)}ms avg, ${metric.stdDev.toFixed(1)}ms std dev`}
      />
      <p className="text-xs mt-2 font-semibold" style={{ color: 'var(--text-main)' }}>{label}</p>
      <p className="text-xs" style={{ color: speedColor }}>{metric.avg.toFixed(0)}ms</p>
      <p className="text-xs" style={{ color: 'var(--text-dim)' }}>±{metric.stdDev.toFixed(0)}</p>
    </div>
  );
}

// Keyboard visualization component
function KeyboardView({ keyMetrics, thresholds }) {
  // Complete ANSI keyboard layout
  const keyboardLayout = [
    // Number row with Backspace
    [
      { code: 'Backquote', width: 1 },
      { code: 'Digit1', width: 1 },
      { code: 'Digit2', width: 1 },
      { code: 'Digit3', width: 1 },
      { code: 'Digit4', width: 1 },
      { code: 'Digit5', width: 1 },
      { code: 'Digit6', width: 1 },
      { code: 'Digit7', width: 1 },
      { code: 'Digit8', width: 1 },
      { code: 'Digit9', width: 1 },
      { code: 'Digit0', width: 1 },
      { code: 'Minus', width: 1 },
      { code: 'Equal', width: 1 },
      { code: 'Backspace', width: 2 },
    ],
    // Tab + QWERTY row
    [
      { code: 'Tab', width: 1.5 },
      { code: 'KeyQ', width: 1 },
      { code: 'KeyW', width: 1 },
      { code: 'KeyE', width: 1 },
      { code: 'KeyR', width: 1 },
      { code: 'KeyT', width: 1 },
      { code: 'KeyY', width: 1 },
      { code: 'KeyU', width: 1 },
      { code: 'KeyI', width: 1 },
      { code: 'KeyO', width: 1 },
      { code: 'KeyP', width: 1 },
      { code: 'BracketLeft', width: 1 },
      { code: 'BracketRight', width: 1 },
      { code: 'Backslash', width: 1.5 },
    ],
    // Caps Lock + ASDF row
    [
      { code: 'CapsLock', width: 1.75 },
      { code: 'KeyA', width: 1 },
      { code: 'KeyS', width: 1 },
      { code: 'KeyD', width: 1 },
      { code: 'KeyF', width: 1 },
      { code: 'KeyG', width: 1 },
      { code: 'KeyH', width: 1 },
      { code: 'KeyJ', width: 1 },
      { code: 'KeyK', width: 1 },
      { code: 'KeyL', width: 1 },
      { code: 'Semicolon', width: 1 },
      { code: 'Quote', width: 1 },
      { code: 'Enter', width: 2.25 },
    ],
    // Shift + ZXCV row
    [
      { code: 'ShiftLeft', width: 2.25 },
      { code: 'KeyZ', width: 1 },
      { code: 'KeyX', width: 1 },
      { code: 'KeyC', width: 1 },
      { code: 'KeyV', width: 1 },
      { code: 'KeyB', width: 1 },
      { code: 'KeyN', width: 1 },
      { code: 'KeyM', width: 1 },
      { code: 'Comma', width: 1 },
      { code: 'Period', width: 1 },
      { code: 'Slash', width: 1 },
      { code: 'ShiftRight', width: 2.75 },
    ],
    // Bottom row (modifiers and space)
    [
      { code: 'ControlLeft', width: 1.25 },
      { code: 'MetaLeft', width: 1.25 },
      { code: 'AltLeft', width: 1.25 },
      { code: 'Space', width: 6.25 },
      { code: 'AltRight', width: 1.25 },
      { code: 'MetaRight', width: 1.25 },
      { code: 'ContextMenu', width: 1.25 },
      { code: 'ControlRight', width: 1.25 },
    ],
  ];

  const keyLabels = {
    // Numbers and symbols
    'Backquote': '`', 'Digit1': '1', 'Digit2': '2', 'Digit3': '3', 'Digit4': '4',
    'Digit5': '5', 'Digit6': '6', 'Digit7': '7', 'Digit8': '8', 'Digit9': '9', 'Digit0': '0',
    'Minus': '-', 'Equal': '=', 'BracketLeft': '[', 'BracketRight': ']', 'Backslash': '\\',
    'Semicolon': ';', 'Quote': "'", 'Comma': ',', 'Period': '.', 'Slash': '/',
    // Modifiers and special keys
    'Space': 'Space',
    'Backspace': 'Backspace',
    'Tab': 'Tab',
    'CapsLock': 'Caps',
    'Enter': 'Enter',
    'ShiftLeft': 'Shift',
    'ShiftRight': 'Shift',
    'ControlLeft': 'Ctrl',
    'ControlRight': 'Ctrl',
    'AltLeft': 'Alt',
    'AltRight': 'Alt',
    'MetaLeft': 'Win',
    'MetaRight': 'Win',
    'ContextMenu': 'Menu',
  };

  return (
    <div className="glass-panel p-8 rounded-xl">
      <h3 className="text-lg font-semibold mb-6 text-center" style={{ color: 'var(--text-main)' }}>
        Keyboard Dwell Time Analysis
      </h3>

      {/* Keyboard Layout */}
      <div className="flex flex-col gap-2 items-center mb-8">
        {keyboardLayout.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-2">
            {row.map((key) => {
              const keyCode = key.code;
              const metric = keyMetrics[keyCode];
              const label = keyLabels[keyCode] || keyCode.replace('Key', '');

              return (
                <KeyButton
                  key={keyCode}
                  keyCode={keyCode}
                  label={label}
                  metric={metric}
                  width={key.width}
                  thresholds={thresholds}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Top/Bottom Keys by Speed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--status-correct)' }}>
            <TrendingDown className="w-4 h-4" />
            Fastest Keys
          </h4>
          <div className="space-y-2">
            {getFastestKeys(keyMetrics, 5).map(([keyCode, metric]) => (
              <div key={keyCode} className="flex justify-between items-center text-sm">
                <span style={{ color: 'var(--text-main)' }}>
                  {keyLabels[keyCode] || keyCode.replace('Key', '')}
                </span>
                <span style={{ color: getSpeedColor(metric.avg, thresholds.speed) }} className="font-semibold">
                  {metric.avg.toFixed(1)}ms
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--status-error)' }}>
            <TrendingUp className="w-4 h-4" />
            Slowest Keys
          </h4>
          <div className="space-y-2">
            {getSlowestKeys(keyMetrics, 5).map(([keyCode, metric]) => (
              <div key={keyCode} className="flex justify-between items-center text-sm">
                <span style={{ color: 'var(--text-main)' }}>
                  {keyLabels[keyCode] || keyCode.replace('Key', '')}
                </span>
                <span style={{ color: getSpeedColor(metric.avg, thresholds.speed) }} className="font-semibold">
                  {metric.avg.toFixed(1)}ms
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Key button visualization
function KeyButton({ label, metric, width = 1, thresholds }) {
  const speedColor = metric ? getSpeedColor(metric.avg, thresholds.speed) : 'var(--bg-input)';
  const consistencyColor = metric ? getConsistencyColor(metric.stdDev, thresholds.consistency) : 'var(--key-border)';

  // Base unit is 50px, multiply by width factor
  // Subtract gap contribution for multi-unit keys
  const baseUnit = 50;
  const gap = 8; // 8px gap between keys
  const keyWidth = `${baseUnit * width + gap * (width - 1)}px`;
  const keyHeight = '50px';

  // Adjust font size for smaller keys
  const fontSize = width < 1.5 ? '0.65rem' : '0.75rem';

  return (
    <div
      className="rounded-lg flex flex-col items-center justify-center transition-all duration-200 hover:scale-105"
      style={{
        width: keyWidth,
        height: keyHeight,
        backgroundColor: speedColor,
        border: `2px solid ${consistencyColor}`,
        opacity: metric ? 1 : 0.2,
        fontSize: fontSize,
      }}
      title={metric ? `${label}: ${metric.avg.toFixed(1)}ms avg, ${metric.stdDev.toFixed(1)}ms std dev (${metric.count} times)` : `${label}: No data`}
    >
      <span className="font-semibold text-white">{label}</span>
      {metric && (
        <span className="text-white opacity-90">{metric.avg.toFixed(0)}</span>
      )}
    </div>
  );
}

// Algorithm: Calculate dwell time metrics from detailed telemetry
function calculateDwellTimeMetrics(events) {
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

// Calculate statistics (avg, std dev, min, max) for an array of values
function calculateStats(values) {
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

// Calculate dynamic thresholds from metrics
function calculateThresholds(metrics) {
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

  // Calculate quintiles (5 equal portions)
  const speedMin = Math.min(...allAvgs);
  const speedMax = Math.max(...allAvgs);
  const speedRange = speedMax - speedMin;
  const speedStep = speedRange / 5;

  const consistencyMin = Math.min(...allStdDevs);
  const consistencyMax = Math.max(...allStdDevs);
  const consistencyRange = consistencyMax - consistencyMin;
  const consistencyStep = consistencyRange / 5;

  return {
    speed: [
      speedMin + speedStep * 1,
      speedMin + speedStep * 2,
      speedMin + speedStep * 3,
      speedMin + speedStep * 4,
    ],
    consistency: [
      consistencyMin + consistencyStep * 1,
      consistencyMin + consistencyStep * 2,
      consistencyMin + consistencyStep * 3,
      consistencyMin + consistencyStep * 4,
    ],
  };
}

// Get color based on speed (average dwell time) with dynamic thresholds
function getSpeedColor(avgDwellTime, thresholds) {
  if (avgDwellTime < thresholds[0]) return '#10b981'; // Green - fastest
  if (avgDwellTime < thresholds[1]) return '#eab308'; // Yellow - fast
  if (avgDwellTime < thresholds[2]) return '#f59e0b'; // Orange - medium
  if (avgDwellTime < thresholds[3]) return '#ef4444'; // Red - slow
  return '#9333ea'; // Purple - slowest
}

// Get color based on consistency (standard deviation) with dynamic thresholds
function getConsistencyColor(stdDev, thresholds) {
  if (stdDev < thresholds[0]) return '#10b981'; // Green - most consistent
  if (stdDev < thresholds[1]) return '#eab308'; // Yellow - consistent
  if (stdDev < thresholds[2]) return '#f59e0b'; // Orange - variable
  if (stdDev < thresholds[3]) return '#ef4444'; // Red - inconsistent
  return '#9333ea'; // Purple - most inconsistent
}

// Get fastest keys sorted by average dwell time
function getFastestKeys(keyMetrics, limit) {
  return Object.entries(keyMetrics)
    .filter(([, metric]) => metric.count >= 3) // Only keys with at least 3 presses
    .sort((a, b) => a[1].avg - b[1].avg)
    .slice(0, limit);
}

// Get slowest keys sorted by average dwell time
function getSlowestKeys(keyMetrics, limit) {
  return Object.entries(keyMetrics)
    .filter(([, metric]) => metric.count >= 3) // Only keys with at least 3 presses
    .sort((a, b) => b[1].avg - a[1].avg)
    .slice(0, limit);
}
