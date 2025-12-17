/**
 * Flight Time Analysis Component
 *
 * Displays inter-keystroke interval analysis:
 * - Flight time: Time between consecutive keystrokes (KeyDown[n] - KeyDown[n-1])
 * - Average and standard deviation per finger
 * - Average and standard deviation per key transition
 * - Visual representation of both hands with color-coded fingers
 * - Keyboard layout with per-key metrics
 * - Shows typing rhythm and transition speed between keys
 */

import { useState, useEffect, useMemo } from 'react';
import { sessionsAPI } from '../../services/api';
import { Hand, Keyboard, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import {
  calculateFlightTimeMetrics,
  calculateFlightTimeThresholds,
  getFlightSpeedColor,
  getFlightConsistencyColor,
  getFastestKeys,
  getSlowestKeys
} from '../../utils/flightTimeCalculator';
import { keyboardLayout, keyLabels, leftHand, rightHand } from '../../utils/keyboardLayout';

export function FlightTimeAnalysis({ sessionId, events }) {
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
        setError('Failed to load flight time analysis data');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      loadDetailedTelemetry();
    }
  }, [sessionId, events]);

  // Calculate flight time metrics and thresholds
  const { metrics, thresholds } = useMemo(() => {
    if (!detailedTelemetry || !detailedTelemetry.events) return { metrics: null, thresholds: null };

    const metricsData = calculateFlightTimeMetrics(detailedTelemetry.events);
    const thresholdsData = calculateFlightTimeThresholds(metricsData);

    return { metrics: metricsData, thresholds: thresholdsData };
  }, [detailedTelemetry]);

  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-xl">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm" style={{ color: 'var(--text-dim)' }}>
            Calculating flight time metrics...
          </p>
        </div>
      </div>
    );
  }

  if (error || !metrics || !thresholds) {
    return (
      <div className="glass-panel p-6 rounded-xl">
        <p className="text-center" style={{ color: 'var(--status-error)' }}>
          {error || 'Unable to calculate flight time metrics'}
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
            <p className="font-semibold mb-2" style={{ color: 'var(--text-dim)' }}>Speed (Average Flight Time)</p>
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
            <p className="font-semibold mb-2" style={{ color: 'var(--text-dim)' }}>Rhythm (Std Dev)</p>
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
          Detailed Finger Statistics (Flight Time)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--key-border)' }}>
                <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>Finger</th>
                <th className="text-right py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>Transitions</th>
                <th className="text-right py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>Avg Flight (ms)</th>
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
                    <td className="text-right py-3 px-4 font-semibold" style={{ color: getFlightSpeedColor(metric.avg, thresholds.speed) }}>{metric.avg.toFixed(1)}</td>
                    <td className="text-right py-3 px-4 font-semibold" style={{ color: getFlightConsistencyColor(metric.stdDev, thresholds.consistency) }}>{metric.stdDev.toFixed(1)}</td>
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

  const speedColor = getFlightSpeedColor(metric.avg, thresholds.speed);
  const consistencyColor = getFlightConsistencyColor(metric.stdDev, thresholds.consistency);

  // Height based on average flight time (inverted - shorter is better)
  const maxHeight = 200;
  const minHeight = 80;
  const normalizedHeight = Math.max(minHeight, Math.min(maxHeight, maxHeight - (metric.avg - 100)));

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
  return (
    <div className="glass-panel p-8 rounded-xl">
      <h3 className="text-lg font-semibold mb-6 text-center" style={{ color: 'var(--text-main)' }}>
        Keyboard Flight Time Analysis
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
            <Zap className="w-4 h-4" />
            Fastest Transitions
          </h4>
          <div className="space-y-2">
            {getFastestKeys(keyMetrics, 5).map(([keyCode, metric]) => (
              <div key={keyCode} className="flex justify-between items-center text-sm">
                <span style={{ color: 'var(--text-main)' }}>
                  {keyLabels[keyCode] || keyCode.replace('Key', '')}
                </span>
                <span style={{ color: getFlightSpeedColor(metric.avg, thresholds.speed) }} className="font-semibold">
                  {metric.avg.toFixed(1)}ms
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--status-error)' }}>
            <TrendingUp className="w-4 h-4" />
            Slowest Transitions
          </h4>
          <div className="space-y-2">
            {getSlowestKeys(keyMetrics, 5).map(([keyCode, metric]) => (
              <div key={keyCode} className="flex justify-between items-center text-sm">
                <span style={{ color: 'var(--text-main)' }}>
                  {keyLabels[keyCode] || keyCode.replace('Key', '')}
                </span>
                <span style={{ color: getFlightSpeedColor(metric.avg, thresholds.speed) }} className="font-semibold">
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
function KeyButton({ keyCode, label, metric, width = 1, thresholds }) {
  const speedColor = metric ? getFlightSpeedColor(metric.avg, thresholds.speed) : 'var(--bg-input)';
  const consistencyColor = metric ? getFlightConsistencyColor(metric.stdDev, thresholds.consistency) : 'var(--key-border)';

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
        backgroundColor: speedColor,
        border: `2px solid ${consistencyColor}`,
        opacity: metric ? 1 : 0.2,
        fontSize: fontSize,
      }}
      title={metric ? `${label}: ${metric.avg.toFixed(1)}ms avg flight, ${metric.stdDev.toFixed(1)}ms std dev (${metric.count} transitions)` : `${label}: No data`}
    >
      <span className="font-semibold text-white">{label}</span>
      {metric && (
        <span className="text-white opacity-90">{metric.avg.toFixed(0)}</span>
      )}
    </div>
  );
}
