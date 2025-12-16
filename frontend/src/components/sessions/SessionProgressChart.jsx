/**
 * Session Progress Chart Component
 *
 * Displays evolution of WPM and accuracy across sessions.
 * - X-axis: Session sequence (1, 2, 3, ...)
 * - Left Y-axis: Productive WPM
 * - Right Y-axis: Accuracy (%)
 * - Smooth line charts with auto-scaled axes
 */

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { sessionsAPI } from '../../services/api';
import { TrendingUp } from 'lucide-react';

export function SessionProgressChart() {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wpmDomain, setWpmDomain] = useState([0, 100]);
  const [accuracyDomain, setAccuracyDomain] = useState([0, 100]);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all sessions (use a large limit to get all data)
      const sessions = await sessionsAPI.list(1000, 0);

      if (!sessions || sessions.length === 0) {
        setChartData([]);
        setLoading(false);
        return;
      }

      // Sort by start_time ascending (oldest to newest)
      const sortedSessions = [...sessions].sort((a, b) => a.start_time - b.start_time);

      // Filter sessions with valid WPM and accuracy
      const validSessions = sortedSessions.filter(
        session => session.wpm != null && session.accuracy != null
      );

      if (validSessions.length === 0) {
        setChartData([]);
        setLoading(false);
        return;
      }

      // Create chart data with session sequence
      const data = validSessions.map((session, index) => ({
        session: index + 1,
        wpm: parseFloat(session.wpm.toFixed(1)),
        accuracy: parseFloat(session.accuracy.toFixed(2)),
        date: new Date(session.start_time).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })
      }));

      // Calculate domain ranges with margins
      const wpmValues = data.map(d => d.wpm);
      const accuracyValues = data.map(d => d.accuracy);

      const minWpm = Math.min(...wpmValues);
      const maxWpm = Math.max(...wpmValues);
      const wpmMargin = (maxWpm - minWpm) * 0.1 || 5; // 10% margin or 5 if all same

      const minAccuracy = Math.min(...accuracyValues);
      const maxAccuracy = Math.max(...accuracyValues);
      const accuracyMargin = (maxAccuracy - minAccuracy) * 0.1 || 2; // 10% margin or 2 if all same

      setWpmDomain([
        Math.max(0, Math.floor(minWpm - wpmMargin)),
        Math.ceil(maxWpm + wpmMargin)
      ]);

      setAccuracyDomain([
        Math.max(0, Math.floor(minAccuracy - accuracyMargin)),
        Math.min(100, Math.ceil(maxAccuracy + accuracyMargin))
      ]);

      setChartData(data);
    } catch (err) {
      console.error('Failed to load chart data:', err);
      setError('Failed to load progress chart');
    } finally {
      setLoading(false);
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="glass-panel p-3 rounded-lg border"
          style={{
            borderColor: 'var(--key-border)',
            backgroundColor: 'var(--bg-panel)'
          }}
        >
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-main)' }}>
            Session {payload[0].payload.session}
          </p>
          <p className="text-xs mb-1" style={{ color: 'var(--text-dim)' }}>
            {payload[0].payload.date}
          </p>
          <div className="space-y-1">
            <p className="text-sm" style={{ color: 'var(--accent-primary)' }}>
              WPM: <span className="font-bold">{payload[0].value}</span>
            </p>
            <p className="text-sm" style={{ color: 'var(--status-correct)' }}>
              Accuracy: <span className="font-bold">{payload[1].value}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4" style={{ color: 'var(--text-dim)' }}>Loading progress chart...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p style={{ color: 'var(--status-error)' }}>{error}</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 glass-panel rounded-xl">
        <p style={{ color: 'var(--text-dim)' }}>
          Complete more sessions to see your progress chart.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
          Progress Over Time
        </h2>
      </div>

      <div className="glass-panel p-6 rounded-xl">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--key-border)"
              opacity={0.3}
            />
            <XAxis
              dataKey="session"
              stroke="var(--text-dim)"
              style={{ fontSize: '0.875rem' }}
              label={{
                value: 'Session Number',
                position: 'insideBottom',
                offset: -5,
                style: { fill: 'var(--text-dim)' }
              }}
            />
            <YAxis
              yAxisId="left"
              domain={wpmDomain}
              stroke="var(--accent-primary)"
              style={{ fontSize: '0.875rem' }}
              label={{
                value: 'WPM',
                angle: -90,
                position: 'insideLeft',
                style: { fill: 'var(--accent-primary)' }
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={accuracyDomain}
              stroke="var(--status-correct)"
              style={{ fontSize: '0.875rem' }}
              label={{
                value: 'Accuracy (%)',
                angle: 90,
                position: 'insideRight',
                style: { fill: 'var(--status-correct)' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '0.875rem'
              }}
              iconType="line"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="wpm"
              stroke="var(--accent-primary)"
              strokeWidth={3}
              dot={{ fill: 'var(--accent-primary)', r: 4 }}
              activeDot={{ r: 6 }}
              name="Productive WPM"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="accuracy"
              stroke="var(--status-correct)"
              strokeWidth={3}
              dot={{ fill: 'var(--status-correct)', r: 4 }}
              activeDot={{ r: 6 }}
              name="Accuracy (%)"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t" style={{ borderColor: 'var(--key-border)' }}>
          <div className="text-center">
            <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>
              Total Sessions
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
              {chartData.length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>
              Best WPM
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
              {Math.max(...chartData.map(d => d.wpm)).toFixed(1)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>
              Avg WPM
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
              {(chartData.reduce((sum, d) => sum + d.wpm, 0) / chartData.length).toFixed(1)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>
              Avg Accuracy
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--status-correct)' }}>
              {(chartData.reduce((sum, d) => sum + d.accuracy, 0) / chartData.length).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
