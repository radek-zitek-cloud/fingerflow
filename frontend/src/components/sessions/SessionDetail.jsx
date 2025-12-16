/**
 * Session Detail Component
 *
 * Displays comprehensive analysis of a completed typing session:
 * - Overall statistics panel
 * - Typing history with inline deletion markers
 * - Evolution chart (WPM & accuracy with 5-keystroke moving average)
 */

import { useState, useEffect, useMemo } from 'react';
import { sessionsAPI } from '../../services/api';
import { Home, Clock, TrendingUp, Target, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Bar } from 'recharts';
import { ErrorAnalysis } from './ErrorAnalysis';
import { FingerAnalysis } from './FingerAnalysis';
import { FlightTimeAnalysis } from './FlightTimeAnalysis';
import DOMPurify from 'dompurify';

export function SessionDetail({ sessionId, onNavigate }) {
  const [session, setSession] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load session data and telemetry events
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch session and telemetry in parallel
        const [sessionData, telemetryData] = await Promise.all([
          sessionsAPI.get(sessionId),
          sessionsAPI.getTelemetry(sessionId)
        ]);

        setSession(sessionData);
        setTelemetry(telemetryData);

        // Warn if data was truncated
        if (telemetryData.truncated) {
          console.warn(
            `Session ${sessionId} data was truncated. Showing ${telemetryData.count} events. ` +
            `This session may be too long for complete analysis.`
          );
        }
      } catch (err) {
        console.error('Failed to load session details:', err);
        setError('Failed to load session details');
      } finally {
        setLoading(false);
      }
    };

    loadSessionData();
  }, [sessionId]);

  // Reconstruct typing history from telemetry events
  const typingHistory = useMemo(() => {
    if (!telemetry || !session || !session.practice_text) return null;

    // Sanitize practice_text to prevent XSS attacks
    // Note: React automatically escapes text content, but this provides defense-in-depth
    const sanitizedText = sanitizePracticeText(session.practice_text);

    return reconstructTypingHistory(telemetry.events, sanitizedText);
  }, [telemetry, session]);

  // Calculate evolution chart data
  const chartData = useMemo(() => {
    if (!telemetry || !session) return null;

    return calculateEvolutionData(telemetry.events, session.start_time);
  }, [telemetry, session]);

  // Calculate accuracy domain with margin
  const accuracyDomain = useMemo(() => {
    if (!chartData || chartData.length === 0) return [0, 100];

    const accuracyValues = chartData.map(d => d.accuracy);
    const minAccuracy = Math.min(...accuracyValues);
    const maxAccuracy = Math.max(...accuracyValues);

    // Add 10% margin
    const range = maxAccuracy - minAccuracy;
    const margin = Math.max(range * 0.1, 5); // At least 5% margin

    return [
      Math.max(0, Math.floor(minAccuracy - margin)),
      Math.min(100, Math.ceil(maxAccuracy + margin))
    ];
  }, [chartData]);

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center py-16">
          <div className="w-12 h-12 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4" style={{ color: 'var(--text-dim)' }}>Loading session details...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center py-16">
          <p style={{ color: 'var(--status-error)' }}>{error || 'Session not found'}</p>
          <button
            onClick={() => onNavigate('home')}
            className="mt-4 px-6 py-2 rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Show message for old sessions without practice_text
  if (!session.practice_text) {
    return (
      <div className="container mx-auto p-8">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 mb-8 px-4 py-2 rounded-lg hover:bg-[var(--bg-input)] transition-colors"
          style={{ color: 'var(--text-dim)' }}
        >
          <Home className="w-5 h-5" />
          Back to Home
        </button>

        <div className="text-center py-16 glass-panel rounded-xl">
          <p style={{ color: 'var(--text-dim)' }}>
            Detailed analysis is not available for this session.
          </p>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-dim)' }}>
            Sessions created before this feature was added do not have the necessary data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      {/* Back Button */}
      <button
        onClick={() => onNavigate('home')}
        className="flex items-center gap-2 mb-8 px-4 py-2 rounded-lg hover:bg-[var(--bg-input)] transition-colors"
        style={{ color: 'var(--text-dim)' }}
      >
        <Home className="w-5 h-5" />
        Back to Home
      </button>

      <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--text-main)' }}>
        Session Analysis
      </h1>

      {/* Data Truncation Warning */}
      {telemetry && telemetry.truncated && (
        <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderLeft: '4px solid #f59e0b' }}>
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 mt-0.5" style={{ color: '#f59e0b' }} />
            <div>
              <p className="font-semibold" style={{ color: '#f59e0b' }}>
                Large Session - Data Truncated
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
                This session has a very large number of keystrokes. Analysis is based on the first {telemetry.count} events.
                Results may not represent the complete session.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Panel */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-main)' }}>
          Session Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard
            icon={Clock}
            label="Duration"
            value={formatDuration(session.start_time, session.end_time)}
          />
          <StatCard
            icon={Activity}
            label="Characters"
            value={session.total_characters || 0}
          />
          <StatCard
            icon={Activity}
            label="Total Keystrokes"
            value={session.total_keystrokes || 0}
          />
          <StatCard
            icon={Activity}
            label="Errors"
            value={session.incorrect_characters || 0}
            highlight="error"
          />
          <StatCard
            icon={TrendingUp}
            label="Raw WPM"
            value={session.mechanical_wpm?.toFixed(1) || '-'}
          />
          <StatCard
            icon={TrendingUp}
            label="Productive WPM"
            value={session.wpm?.toFixed(1) || '-'}
            highlight="primary"
          />
          <StatCard
            icon={Target}
            label="Accuracy"
            value={session.accuracy ? `${session.accuracy.toFixed(1)}%` : '-'}
            highlight="correct"
          />
        </div>
      </div>

      {/* Typing History */}
      {typingHistory && (
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-main)' }}>
            Typing History
          </h2>
          <div className="glass-panel p-6 rounded-xl">
            <div
              className="font-mono text-lg leading-relaxed"
              style={{
                color: 'var(--text-main)',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'pre-wrap'
              }}
            >
              {typingHistory.map((char, index) => (
                <TypingHistoryChar key={index} char={char} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Evolution Chart */}
      {chartData && chartData.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-main)' }}>
            Performance Evolution
          </h2>
          <div className="glass-panel p-6 rounded-xl">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--key-border)" />
                <XAxis
                  dataKey="keystroke"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  stroke="var(--text-dim)"
                  label={{ value: 'Keystroke', position: 'insideBottom', offset: -5, fill: 'var(--text-dim)' }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="var(--accent-primary)"
                  label={{ value: 'WPM', angle: -90, position: 'insideLeft', fill: 'var(--accent-primary)' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={accuracyDomain}
                  stroke="var(--status-correct)"
                  label={{ value: 'Accuracy (%)', angle: 90, position: 'insideRight', fill: 'var(--status-correct)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--key-border)',
                    borderRadius: '8px',
                    color: 'var(--text-main)'
                  }}
                  formatter={(value, name) => {
                    if (name === 'wpm') return [value.toFixed(1), 'WPM'];
                    if (name === 'accuracy') return [value.toFixed(1) + '%', 'Accuracy'];
                    return [value, name];
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="wpm"
                  stroke="var(--accent-primary)"
                  strokeWidth={3}
                  dot={false}
                  name="WPM"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="accuracy"
                  stroke="var(--status-correct)"
                  strokeWidth={3}
                  dot={false}
                  name="Accuracy"
                />
                {/* Error markers - bars at typo keystrokes */}
                <Bar
                  yAxisId="right"
                  dataKey="errorBar"
                  fill="#ef4444"
                  fillOpacity={0.3}
                  barSize={4}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Error Analysis */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-main)' }}>
          Error Analysis
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
          Shows which fingers and keys caused the most errors. Identify your problem areas to focus your practice.
        </p>
        <ErrorAnalysis sessionId={sessionId} />
      </div>

      {/* Finger Analysis - Dwell Time */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-main)' }}>
          Dwell Time Analysis
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
          Dwell time measures how long each key is held down (time between keydown and keyup). Lower values indicate faster finger release.
        </p>
        <FingerAnalysis sessionId={sessionId} />
      </div>

      {/* Flight Time Analysis */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-main)' }}>
          Flight Time Analysis
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
          Flight time measures the interval between consecutive keystrokes (time from one keydown to the next). This shows your typing rhythm and transition speed between keys.
        </p>
        <FlightTimeAnalysis sessionId={sessionId} />
      </div>
    </div>
  );
}

// Helper component for statistics cards
function StatCard({ icon: Icon, label, value, highlight }) {
  const getColor = () => {
    if (highlight === 'primary') return 'var(--accent-primary)';
    if (highlight === 'correct') return 'var(--status-correct)';
    if (highlight === 'error') return 'var(--status-error)';
    return 'var(--text-main)';
  };

  return (
    <div className="glass-panel p-4 rounded-xl flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color: 'var(--text-dim)' }} />
        <p className="text-xs uppercase font-semibold" style={{ color: 'var(--text-dim)' }}>
          {label}
        </p>
      </div>
      <p className="text-2xl font-bold" style={{ color: getColor() }}>
        {value}
      </p>
    </div>
  );
}

// Helper component for rendering typing history characters
function TypingHistoryChar({ char }) {
  const { expected, attempts } = char;

  return (
    <span style={{ display: 'inline' }}>
      {attempts.map((attempt, i) => {
        // Determine display character for spaces
        const getDisplayChar = (char, isError, isCorrected) => {
          if (char === ' ') {
            // Show underscore for space errors and corrected spaces
            if (isError || isCorrected) {
              return '_';
            }
            // Show non-breaking space for correct spaces
            return '\u00A0';
          }
          return char;
        };

        if (attempt.deleted) {
          // Deleted character: smaller, red, strikethrough
          const displayChar = getDisplayChar(attempt.char, true, false);
          return (
            <span
              key={i}
              style={{
                fontSize: '85%',
                color: 'var(--status-error)',
                textDecoration: 'line-through',
                opacity: 0.6
              }}
            >
              {displayChar}
            </span>
          );
        } else if (!attempt.correct) {
          // Error character (not yet corrected): red
          const displayChar = getDisplayChar(attempt.char, true, false);
          return (
            <span key={i} style={{ color: 'var(--status-error)' }}>
              {displayChar}
            </span>
          );
        } else if (i > 0) {
          // Corrected character: orange/amber
          const displayChar = getDisplayChar(attempt.char, false, true);
          return (
            <span key={i} style={{ color: 'var(--status-corrected)' }}>
              {displayChar}
            </span>
          );
        } else {
          // Correct on first try: normal color
          const displayChar = getDisplayChar(attempt.char, false, false);
          return (
            <span key={i} style={{ color: 'var(--text-main)' }}>
              {displayChar}
            </span>
          );
        }
      })}
    </span>
  );
}

// Algorithm 1: Reconstruct typing history from telemetry events
function reconstructTypingHistory(events, practiceText) {
  const history = [];
  let position = 0;

  for (const event of events) {
    if (event.key_code === 'Backspace') {
      // Mark previous character attempt as deleted
      if (position > 0) {
        position--;
        if (history[position] && history[position].attempts.length > 0) {
          const lastAttempt = history[position].attempts[history[position].attempts.length - 1];
          lastAttempt.deleted = true;
        }
      }
    } else {
      // Convert key_code to character
      const typedChar = keyCodeToChar(event.key_code);
      if (typedChar === null) continue; // Skip non-character keys

      const expectedChar = practiceText[position] || '';

      // Initialize history entry for this position if needed
      if (!history[position]) {
        history[position] = {
          expected: expectedChar,
          attempts: []
        };
      }

      // Add this attempt
      history[position].attempts.push({
        char: typedChar,
        correct: !event.is_error,
        deleted: false
      });

      // Only advance position on correct keystroke
      if (!event.is_error) {
        position++;
      }
    }
  }

  return history;
}

// Algorithm 2: Calculate evolution chart data with moving average
function calculateEvolutionData(events, sessionStartTime) {
  // Find the first non-backspace keystroke to use as effective start time
  // This ignores the wait time between test display and first keystroke
  let firstCharOffset = null;
  let firstCharKeystrokeNumber = null;
  let tempKeystrokeNumber = 0;

  for (const event of events) {
    tempKeystrokeNumber++;
    if (event.key_code !== 'Backspace') {
      firstCharOffset = event.timestamp_offset;
      firstCharKeystrokeNumber = tempKeystrokeNumber;
      break;
    }
  }

  // If no character keys found, use 0 as fallback
  if (firstCharOffset === null) {
    firstCharOffset = 0;
  }

  const dataPoints = [];
  let correctCount = 0;
  let errorCount = 0;
  let keystrokeNumber = 0;

  for (const event of events) {
    keystrokeNumber++;

    // Update counts (skip for backspace)
    if (event.key_code !== 'Backspace') {
      if (event.is_error) {
        errorCount++;
      } else {
        correctCount++;
      }
    }

    // Calculate metrics using time from first character keystroke
    const effectiveElapsedMs = event.timestamp_offset - firstCharOffset;
    const elapsedMinutes = effectiveElapsedMs / 1000 / 60;
    const wpm = elapsedMinutes > 0 ? (correctCount / 5) / elapsedMinutes : 0;
    const accuracy = (correctCount + errorCount) > 0
      ? (correctCount / (correctCount + errorCount)) * 100
      : 100;

    dataPoints.push({
      keystroke: keystrokeNumber,
      wpm: wpm,
      accuracy: accuracy,
      hasError: event.key_code !== 'Backspace' && event.is_error,
      errorBar: (event.key_code !== 'Backspace' && event.is_error) ? 100 : null
    });
  }

  // Apply 5-keystroke moving average
  // At the start, use whatever data points are available (1, 2, 3, 4 points instead of 5)
  const averaged = dataPoints.map((point, i) => {
    const start = Math.max(0, i - 4);
    const window = dataPoints.slice(start, i + 1);

    const avgWpm = window.reduce((sum, p) => sum + p.wpm, 0) / window.length;
    const avgAccuracy = window.reduce((sum, p) => sum + p.accuracy, 0) / window.length;

    return {
      keystroke: point.keystroke,
      wpm: avgWpm,
      accuracy: avgAccuracy,
      hasError: point.hasError,
      errorBar: point.errorBar
    };
  });

  // Set first character keystroke's WPM to match the second keystroke's WPM
  // This avoids starting the chart at WPM = 0
  if (averaged.length >= 2 && firstCharKeystrokeNumber !== null) {
    const firstCharIndex = averaged.findIndex(p => p.keystroke === firstCharKeystrokeNumber);
    if (firstCharIndex >= 0 && firstCharIndex < averaged.length - 1) {
      averaged[firstCharIndex].wpm = averaged[firstCharIndex + 1].wpm;
    }
  }

  return averaged;
}

// Convert JavaScript KeyboardEvent.code to character
function keyCodeToChar(keyCode) {
  // Letter keys
  if (keyCode.startsWith('Key')) {
    return keyCode.substring(3).toLowerCase();
  }

  // Digit keys
  if (keyCode.startsWith('Digit')) {
    return keyCode.substring(5);
  }

  // Special keys
  const specialKeys = {
    'Space': ' ',
    'Minus': '-',
    'Equal': '=',
    'BracketLeft': '[',
    'BracketRight': ']',
    'Backslash': '\\',
    'Semicolon': ';',
    'Quote': "'",
    'Comma': ',',
    'Period': '.',
    'Slash': '/',
    'Backquote': '`'
  };

  if (specialKeys[keyCode]) {
    return specialKeys[keyCode];
  }

  // Unknown key
  return null;
}

// Format duration
function formatDuration(startTime, endTime) {
  if (!endTime) return '-';

  const durationMs = endTime - startTime;
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Sanitize practice text to prevent XSS attacks
 *
 * Defense-in-depth: While React automatically escapes text content rendered
 * via {variable} syntax, we explicitly sanitize to prevent any potential
 * script injection if the text contains HTML/script tags.
 *
 * @param {string} text - The practice text from the database
 * @returns {string} - Sanitized plain text
 */
function sanitizePracticeText(text) {
  if (!text) return '';

  // DOMPurify.sanitize with ALLOWED_TAGS: [] strips ALL HTML tags
  // This converts '<script>alert("xss")</script>' to 'alert("xss")'
  const sanitized = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],        // Strip all HTML tags
    ALLOWED_ATTR: [],        // Strip all attributes
    KEEP_CONTENT: true,      // Keep text content inside tags
  });

  return sanitized;
}
