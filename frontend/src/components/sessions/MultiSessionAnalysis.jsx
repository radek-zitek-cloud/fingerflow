/**
 * MultiSessionAnalysis Component
 *
 * Analyzes typing performance across multiple sessions within a date range.
 * Provides combined error analysis, dwell time, and flight time metrics.
 */

import { useState, useEffect } from 'react';
import { ErrorAnalysis } from './ErrorAnalysis';
import { FlightTimeAnalysis } from './FlightTimeAnalysis';
import { FingerAnalysis } from './FingerAnalysis';
import { sessionsAPI } from '../../services/api';

export function MultiSessionAnalysis({ onBack }) {
  // Date and time range state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('23:59');

  // Data state
  const [sessions, setSessions] = useState([]);
  const [telemetryData, setTelemetryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize with last 7 days
  useEffect(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Format as YYYY-MM-DD for date input
    setEndDate(now.toISOString().split('T')[0]);
    setStartDate(sevenDaysAgo.toISOString().split('T')[0]);
    // Default times already set in initial state
  }, []);

  // Fetch sessions when date range changes
  const fetchData = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError(null);

    try {
      // Parse time components
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      // Convert dates and times to timestamps
      const startTimestamp = new Date(startDate).setHours(startHour, startMinute, 0, 0);
      const endTimestamp = new Date(endDate).setHours(endHour, endMinute, 59, 999);

      // Fetch sessions in range using API service
      const sessionsData = await sessionsAPI.getByDateRange(startTimestamp, endTimestamp);
      setSessions(sessionsData);

      // If we have sessions, fetch combined telemetry
      if (sessionsData.length > 0) {
        const telemetryJson = await sessionsAPI.getCombinedTelemetry(startTimestamp, endTimestamp);
        setTelemetryData(telemetryJson);
      } else {
        setTelemetryData(null);
      }
    } catch (err) {
      console.error('Error fetching multi-session data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate aggregate statistics
  const calculateAggregateStats = () => {
    if (sessions.length === 0) return null;

    const totalSessions = sessions.length;
    const avgWpm = sessions.reduce((sum, s) => sum + (s.wpm || 0), 0) / totalSessions;
    const avgMechanicalWpm = sessions.reduce((sum, s) => sum + (s.mechanical_wpm || 0), 0) / totalSessions;
    const avgAccuracy = sessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / totalSessions;
    const totalKeystrokes = sessions.reduce((sum, s) => sum + (s.total_keystrokes || 0), 0);
    const totalCharacters = sessions.reduce((sum, s) => sum + (s.total_characters || 0), 0);

    return {
      totalSessions,
      avgWpm,
      avgMechanicalWpm,
      avgAccuracy,
      totalKeystrokes,
      totalCharacters,
    };
  };

  const stats = calculateAggregateStats();

  return (
    <div className="multi-session-analysis">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
          Multi-Session Analysis
        </h2>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg transition-all duration-200"
          style={{
            backgroundColor: 'var(--bg-panel)',
            color: 'var(--text-main)',
            border: '1px solid var(--key-border)',
          }}
        >
          ← Back to History
        </button>
      </div>

      {/* Date and Time Range Selector */}
      <div className="glass-panel p-6 rounded-2xl mb-6" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-main)' }}>
          Select Date & Time Range
        </h3>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          {/* Start Date & Time */}
          <div className="flex-1 flex gap-2">
            <div className="flex-1">
              <label className="block text-sm mb-2" style={{ color: 'var(--text-dim)' }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--key-border)',
                }}
              />
            </div>
            <div className="w-32">
              <label className="block text-sm mb-2" style={{ color: 'var(--text-dim)' }}>
                Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--key-border)',
                }}
              />
            </div>
          </div>

          {/* End Date & Time */}
          <div className="flex-1 flex gap-2">
            <div className="flex-1">
              <label className="block text-sm mb-2" style={{ color: 'var(--text-dim)' }}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--key-border)',
                }}
              />
            </div>
            <div className="w-32">
              <label className="block text-sm mb-2" style={{ color: 'var(--text-dim)' }}>
                Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--key-border)',
                }}
              />
            </div>
          </div>

          {/* Analyze Button */}
          <button
            onClick={fetchData}
            disabled={!startDate || !endDate || loading}
            className="px-6 py-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 w-full md:w-auto"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'white',
            }}
          >
            {loading ? 'Loading...' : 'Analyze'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-panel p-4 rounded-lg mb-6" style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--status-error)',
        }}>
          <p style={{ color: 'var(--status-error)' }}>Error: {error}</p>
        </div>
      )}

      {/* Aggregate Statistics */}
      {stats && !loading && (
        <div className="glass-panel p-6 rounded-2xl mb-6" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-main)' }}>
            Aggregate Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Total Sessions</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                {stats.totalSessions}
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Average WPM</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                {stats.avgWpm.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Average Mechanical WPM</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                {stats.avgMechanicalWpm.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Average Accuracy</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                {stats.avgAccuracy.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Total Keystrokes</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                {stats.totalKeystrokes.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Total Characters</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                {stats.totalCharacters.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Session List */}
      {sessions.length > 0 && !loading && (
        <div className="glass-panel p-6 rounded-2xl mb-6" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-main)' }}>
            Sessions in Range ({sessions.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--key-border)' }}>
                  <th className="text-left py-2 px-4" style={{ color: 'var(--text-dim)' }}>Date</th>
                  <th className="text-right py-2 px-4" style={{ color: 'var(--text-dim)' }}>WPM</th>
                  <th className="text-right py-2 px-4" style={{ color: 'var(--text-dim)' }}>Mechanical WPM</th>
                  <th className="text-right py-2 px-4" style={{ color: 'var(--text-dim)' }}>Accuracy</th>
                  <th className="text-right py-2 px-4" style={{ color: 'var(--text-dim)' }}>Keystrokes</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} style={{ borderBottom: '1px solid rgba(var(--key-border-rgb), 0.3)' }}>
                    <td className="py-2 px-4" style={{ color: 'var(--text-main)' }}>
                      {new Date(session.start_time).toLocaleString()}
                    </td>
                    <td className="text-right py-2 px-4" style={{ color: 'var(--text-main)' }}>
                      {session.wpm?.toFixed(1) || 'N/A'}
                    </td>
                    <td className="text-right py-2 px-4" style={{ color: 'var(--text-main)' }}>
                      {session.mechanical_wpm?.toFixed(1) || 'N/A'}
                    </td>
                    <td className="text-right py-2 px-4" style={{ color: 'var(--text-main)' }}>
                      {session.accuracy?.toFixed(1)}%
                    </td>
                    <td className="text-right py-2 px-4" style={{ color: 'var(--text-main)' }}>
                      {session.total_keystrokes?.toLocaleString() || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Combined Analysis Sections */}
      {telemetryData && telemetryData.events && telemetryData.events.length > 0 && (
        <>
          {/* Error Analysis */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-main)' }}>
              Combined Error Analysis
            </h3>
            <ErrorAnalysis events={telemetryData.events} />
          </div>

          {/* Dwell Time Analysis */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-main)' }}>
              Combined Dwell Time Analysis
            </h3>
            <FingerAnalysis events={telemetryData.events} />
          </div>

          {/* Flight Time Analysis */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-main)' }}>
              Combined Flight Time Analysis
            </h3>
            <FlightTimeAnalysis events={telemetryData.events} />
          </div>
        </>
      )}

      {/* No Data Message */}
      {!loading && sessions.length === 0 && startDate && endDate && (
        <div className="glass-panel p-8 rounded-2xl text-center" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <p className="text-lg" style={{ color: 'var(--text-dim)' }}>
            No sessions found in the selected date range.
          </p>
        </div>
      )}
    </div>
  );
}
