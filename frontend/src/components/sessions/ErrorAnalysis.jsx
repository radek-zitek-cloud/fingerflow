/**
 * Error Analysis Component
 *
 * Displays error count analysis:
 * - Total errors per finger
 * - Total errors per key
 * - Visual representation of both hands with color-coded error counts
 * - Keyboard layout with per-key error counts
 * - Helps identify problematic fingers and keys that cause most errors
 */

import { useState, useEffect, useMemo } from 'react';
import { sessionsAPI } from '../../services/api';
import { Hand, Keyboard, AlertTriangle, CheckCircle } from 'lucide-react';

export function ErrorAnalysis({ sessionId }) {
  const [detailedTelemetry, setDetailedTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('fingers'); // 'fingers' or 'keyboard'

  // Load detailed telemetry data
  useEffect(() => {
    const loadDetailedTelemetry = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await sessionsAPI.getDetailedTelemetry(sessionId);
        setDetailedTelemetry(data);

        // Warn if data was truncated
        if (data.truncated) {
          console.warn(
            `Session ${sessionId} detailed data was truncated. Showing ${data.count} events. ` +
            `Error analysis may be incomplete.`
          );
        }
      } catch (err) {
        console.error('Failed to load detailed telemetry:', err);
        setError('Failed to load error analysis data');
      } finally {
        setLoading(false);
      }
    };

    loadDetailedTelemetry();
  }, [sessionId]);

  // Calculate error metrics and thresholds
  const { metrics, thresholds } = useMemo(() => {
    if (!detailedTelemetry || !detailedTelemetry.events) return { metrics: null, thresholds: null };

    const metricsData = calculateErrorMetrics(detailedTelemetry.events);
    const thresholdsData = calculateThresholds(metricsData);

    return { metrics: metricsData, thresholds: thresholdsData };
  }, [detailedTelemetry]);

  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-xl">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm" style={{ color: 'var(--text-dim)' }}>
            Calculating error metrics...
          </p>
        </div>
      </div>
    );
  }

  if (error || !metrics || !thresholds) {
    return (
      <div className="glass-panel p-6 rounded-xl">
        <p className="text-center" style={{ color: 'var(--status-error)' }}>
          {error || 'Unable to calculate error metrics'}
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
        <div className="text-sm">
          <p className="font-semibold mb-2" style={{ color: 'var(--text-dim)' }}>Error Count</p>
          <div className="grid grid-cols-5 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
              <span style={{ color: 'var(--text-dim)' }}>Fewest (0-{thresholds[0]})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }}></div>
              <span style={{ color: 'var(--text-dim)' }}>Few ({thresholds[0]}-{thresholds[1]})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
              <span style={{ color: 'var(--text-dim)' }}>Some ({thresholds[1]}-{thresholds[2]})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
              <span style={{ color: 'var(--text-dim)' }}>Many ({thresholds[2]}-{thresholds[3]})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#9333ea' }}></div>
              <span style={{ color: 'var(--text-dim)' }}>Most (&gt;{thresholds[3]})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'fingers' ? (
        <FingerView fingerMetrics={metrics.perFinger} thresholds={thresholds} totalErrors={metrics.totalErrors} />
      ) : (
        <KeyboardView keyMetrics={metrics.perKey} thresholds={thresholds} totalErrors={metrics.totalErrors} />
      )}
    </div>
  );
}

// Finger visualization component
function FingerView({ fingerMetrics, thresholds, totalErrors }) {
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
      {/* Total Errors Summary */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-lg" style={{ backgroundColor: 'var(--bg-input)' }}>
          <AlertTriangle className="w-6 h-6" style={{ color: 'var(--status-error)' }} />
          <div>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Total Errors</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--status-error)' }}>{totalErrors}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Hand */}
        <div>
          <h3 className="text-lg font-semibold mb-6 text-center" style={{ color: 'var(--text-main)' }}>
            Left Hand
          </h3>
          <div className="flex justify-center items-end gap-3" style={{ height: '300px' }}>
            {leftHand.map(({ finger, label, row }) => {
              const count = fingerMetrics[finger] || 0;
              return (
                <FingerColumn
                  key={finger}
                  label={label}
                  errorCount={count}
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
              const count = fingerMetrics[finger] || 0;
              return (
                <FingerColumn
                  key={finger}
                  label={label}
                  errorCount={count}
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
                <th className="text-right py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>Errors</th>
                <th className="text-right py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>% of Total</th>
              </tr>
            </thead>
            <tbody>
              {[...leftHand, ...rightHand].map(({ finger, label }) => {
                const count = fingerMetrics[finger] || 0;
                const percentage = totalErrors > 0 ? (count / totalErrors * 100) : 0;

                return (
                  <tr key={finger} className="border-b" style={{ borderColor: 'var(--key-border)' }}>
                    <td className="py-3 px-4" style={{ color: 'var(--text-main)' }}>{label} ({finger.split('_')[0]})</td>
                    <td className="text-right py-3 px-4 font-semibold" style={{ color: getErrorColor(count, thresholds) }}>{count}</td>
                    <td className="text-right py-3 px-4" style={{ color: 'var(--text-dim)' }}>{percentage.toFixed(1)}%</td>
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
function FingerColumn({ label, errorCount, row, thresholds }) {
  const color = getErrorColor(errorCount, thresholds);

  // Height based on error count (higher errors = taller bar, which is BAD)
  const maxHeight = 200;
  const minHeight = 50;
  const maxErrors = thresholds[3] * 1.5; // Use 1.5x the fourth threshold as max
  const normalizedHeight = errorCount === 0
    ? minHeight
    : Math.min(maxHeight, minHeight + (errorCount / maxErrors) * (maxHeight - minHeight));

  return (
    <div className="flex flex-col items-center" style={{ marginBottom: `${row * 30}px` }}>
      <div
        className="w-16 rounded-t-full transition-all duration-300 hover:opacity-80"
        style={{
          height: `${normalizedHeight}px`,
          backgroundColor: color,
          border: `2px solid ${color}`,
        }}
        title={`${label}: ${errorCount} errors`}
      />
      <p className="text-xs mt-2 font-semibold" style={{ color: 'var(--text-main)' }}>{label}</p>
      <p className="text-xs font-bold" style={{ color: color }}>{errorCount}</p>
      {errorCount === 0 && (
        <CheckCircle className="w-3 h-3 mt-1" style={{ color: '#10b981' }} />
      )}
    </div>
  );
}

// Keyboard visualization component
function KeyboardView({ keyMetrics, thresholds, totalErrors }) {
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
      {/* Total Errors Summary */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-lg" style={{ backgroundColor: 'var(--bg-input)' }}>
          <AlertTriangle className="w-6 h-6" style={{ color: 'var(--status-error)' }} />
          <div>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Total Errors</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--status-error)' }}>{totalErrors}</p>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-6 text-center" style={{ color: 'var(--text-main)' }}>
        Keyboard Error Distribution
      </h3>

      {/* Keyboard Layout */}
      <div className="flex flex-col gap-2 items-center mb-8">
        {keyboardLayout.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-2">
            {row.map((key) => {
              const keyCode = key.code;
              const count = keyMetrics[keyCode] || 0;
              const label = keyLabels[keyCode] || keyCode.replace('Key', '');

              return (
                <KeyButton
                  key={keyCode}
                  keyCode={keyCode}
                  label={label}
                  errorCount={count}
                  width={key.width}
                  thresholds={thresholds}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Top/Bottom Keys by Errors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--status-correct)' }}>
            <CheckCircle className="w-4 h-4" />
            Keys with Fewest Errors
          </h4>
          <div className="space-y-2">
            {getKeysWithFewestErrors(keyMetrics, 5).map(([keyCode, count]) => (
              <div key={keyCode} className="flex justify-between items-center text-sm">
                <span style={{ color: 'var(--text-main)' }}>
                  {keyLabels[keyCode] || keyCode.replace('Key', '')}
                </span>
                <span style={{ color: getErrorColor(count, thresholds) }} className="font-semibold">
                  {count} {count === 1 ? 'error' : 'errors'}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--status-error)' }}>
            <AlertTriangle className="w-4 h-4" />
            Keys with Most Errors
          </h4>
          <div className="space-y-2">
            {getKeysWithMostErrors(keyMetrics, 5).map(([keyCode, count]) => (
              <div key={keyCode} className="flex justify-between items-center text-sm">
                <span style={{ color: 'var(--text-main)' }}>
                  {keyLabels[keyCode] || keyCode.replace('Key', '')}
                </span>
                <span style={{ color: getErrorColor(count, thresholds) }} className="font-semibold">
                  {count} {count === 1 ? 'error' : 'errors'}
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
function KeyButton({ label, errorCount, width = 1, thresholds }) {
  const color = getErrorColor(errorCount, thresholds);

  // Base unit is 50px, multiply by width factor
  // Add gap contribution for multi-unit keys
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
        backgroundColor: color,
        border: `2px solid ${color}`,
        opacity: errorCount > 0 ? 1 : 0.3,
        fontSize: fontSize,
      }}
      title={`${label}: ${errorCount} ${errorCount === 1 ? 'error' : 'errors'}`}
    >
      <span className="font-semibold text-white">{label}</span>
      <span className="text-white opacity-90">{errorCount}</span>
    </div>
  );
}

// Algorithm: Calculate error metrics from detailed telemetry
function calculateErrorMetrics(events) {
  const errorsByFinger = {}; // Map of finger -> error count
  const errorsByKey = {}; // Map of key_code -> error count
  let totalErrors = 0;

  // Count errors per finger and per key
  for (const event of events) {
    if (event.event_type === 'DOWN' && event.is_error) {
      totalErrors++;

      // Count by finger
      const finger = event.finger_used;
      errorsByFinger[finger] = (errorsByFinger[finger] || 0) + 1;

      // Count by key
      const keyCode = event.key_code;
      errorsByKey[keyCode] = (errorsByKey[keyCode] || 0) + 1;
    }
  }

  return {
    perFinger: errorsByFinger,
    perKey: errorsByKey,
    totalErrors: totalErrors,
  };
}

// Calculate dynamic thresholds based on error counts
function calculateThresholds(metrics) {
  // Collect all error counts
  const allCounts = [
    ...Object.values(metrics.perFinger),
    ...Object.values(metrics.perKey),
  ];

  if (allCounts.length === 0) {
    return [0, 0, 0, 0];
  }

  // Calculate quintiles (5 equal portions)
  const min = Math.min(...allCounts);
  const max = Math.max(...allCounts);
  const range = max - min;
  const step = range / 5;

  return [
    Math.ceil(min + step * 1),
    Math.ceil(min + step * 2),
    Math.ceil(min + step * 3),
    Math.ceil(min + step * 4),
  ];
}

// Get color based on error count with dynamic thresholds
function getErrorColor(errorCount, thresholds) {
  if (errorCount === 0) return '#10b981'; // Green - no errors
  if (errorCount <= thresholds[0]) return '#10b981'; // Green - fewest
  if (errorCount <= thresholds[1]) return '#eab308'; // Yellow - few
  if (errorCount <= thresholds[2]) return '#f59e0b'; // Orange - some
  if (errorCount <= thresholds[3]) return '#ef4444'; // Red - many
  return '#9333ea'; // Purple - most
}

// Get keys with fewest errors
function getKeysWithFewestErrors(keyMetrics, limit) {
  return Object.entries(keyMetrics)
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit);
}

// Get keys with most errors
function getKeysWithMostErrors(keyMetrics, limit) {
  return Object.entries(keyMetrics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}
