/**
 * Typing Statistics Component
 *
 * Displays comprehensive typing statistics including:
 * - Total and today's typing duration
 * - Overall and today's average WPM/accuracy
 * - Best WPM/accuracy (overall and today)
 */

import { useState, useEffect } from 'react';
import { sessionsAPI } from '../../services/api';
import { Clock, TrendingUp, Target, Award, Calendar, Zap } from 'lucide-react';

export function TypingStatistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all sessions
      const sessions = await sessionsAPI.list(10000, 0);

      if (!sessions || sessions.length === 0) {
        setStats(null);
        setLoading(false);
        return;
      }

      // Filter sessions with valid data
      const validSessions = sessions.filter(
        session => session.wpm != null && session.accuracy != null && session.end_time != null
      );

      if (validSessions.length === 0) {
        setStats(null);
        setLoading(false);
        return;
      }

      // Get today's start timestamp (midnight today)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartMs = todayStart.getTime();

      // Filter today's sessions
      const todaySessions = validSessions.filter(
        session => session.start_time >= todayStartMs
      );

      // Calculate overall statistics
      const totalDuration = validSessions.reduce((sum, session) => {
        return sum + (session.end_time - session.start_time);
      }, 0);

      const overallAvgWpm = validSessions.reduce((sum, s) => sum + s.wpm, 0) / validSessions.length;
      const overallAvgAccuracy = validSessions.reduce((sum, s) => sum + s.accuracy, 0) / validSessions.length;
      const overallBestWpm = Math.max(...validSessions.map(s => s.wpm));
      const overallBestAccuracy = Math.max(...validSessions.map(s => s.accuracy));

      // Calculate today's statistics
      let todayDuration = 0;
      let todayAvgWpm = 0;
      let todayAvgAccuracy = 0;
      let todayBestWpm = 0;
      let todayBestAccuracy = 0;

      if (todaySessions.length > 0) {
        todayDuration = todaySessions.reduce((sum, session) => {
          return sum + (session.end_time - session.start_time);
        }, 0);

        todayAvgWpm = todaySessions.reduce((sum, s) => sum + s.wpm, 0) / todaySessions.length;
        todayAvgAccuracy = todaySessions.reduce((sum, s) => sum + s.accuracy, 0) / todaySessions.length;
        todayBestWpm = Math.max(...todaySessions.map(s => s.wpm));
        todayBestAccuracy = Math.max(...todaySessions.map(s => s.accuracy));
      }

      setStats({
        overall: {
          totalSessions: validSessions.length,
          totalDuration,
          avgWpm: overallAvgWpm,
          avgAccuracy: overallAvgAccuracy,
          bestWpm: overallBestWpm,
          bestAccuracy: overallBestAccuracy,
        },
        today: {
          totalSessions: todaySessions.length,
          totalDuration: todayDuration,
          avgWpm: todayAvgWpm,
          avgAccuracy: todayAvgAccuracy,
          bestWpm: todayBestWpm,
          bestAccuracy: todayBestAccuracy,
        },
      });
    } catch (err) {
      console.error('Failed to load statistics:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (durationMs) => {
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4" style={{ color: 'var(--text-dim)' }}>Loading statistics...</p>
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

  if (!stats) {
    return (
      <div className="text-center py-8 glass-panel rounded-xl">
        <p style={{ color: 'var(--text-dim)' }}>
          Complete more sessions to see your statistics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
        Typing Statistics
      </h2>

      {/* Overall Statistics */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
          <Award className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
          Overall Performance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 auto-rows-fr">
          {/* Total Duration */}
          <div className="glass-panel p-4 rounded-xl flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4" style={{ color: 'var(--text-dim)' }} />
              <p className="text-xs uppercase font-semibold" style={{ color: 'var(--text-dim)' }}>
                Total Time
              </p>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
              {formatDuration(stats.overall.totalDuration)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
              {stats.overall.totalSessions} sessions
            </p>
          </div>

          {/* Average WPM */}
          <div className="glass-panel p-4 rounded-xl flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--text-dim)' }} />
              <p className="text-xs uppercase font-semibold" style={{ color: 'var(--text-dim)' }}>
                Avg WPM
              </p>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
              {stats.overall.avgWpm.toFixed(1)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
              productive
            </p>
          </div>

          {/* Average Accuracy */}
          <div className="glass-panel p-4 rounded-xl flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4" style={{ color: 'var(--text-dim)' }} />
              <p className="text-xs uppercase font-semibold" style={{ color: 'var(--text-dim)' }}>
                Avg Accuracy
              </p>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--status-correct)' }}>
              {stats.overall.avgAccuracy.toFixed(1)}%
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
              overall
            </p>
          </div>

          {/* Best WPM */}
          <div className="glass-panel p-4 rounded-xl flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4" style={{ color: 'var(--text-dim)' }} />
              <p className="text-xs uppercase font-semibold" style={{ color: 'var(--text-dim)' }}>
                Best WPM
              </p>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
              {stats.overall.bestWpm.toFixed(1)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
              personal record
            </p>
          </div>

          {/* Best Accuracy */}
          <div className="glass-panel p-4 rounded-xl flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4" style={{ color: 'var(--text-dim)' }} />
              <p className="text-xs uppercase font-semibold" style={{ color: 'var(--text-dim)' }}>
                Best Accuracy
              </p>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--status-correct)' }}>
              {stats.overall.bestAccuracy.toFixed(1)}%
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
              personal record
            </p>
          </div>
        </div>
      </div>

      {/* Today's Statistics */}
      {stats.today.totalSessions > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Calendar className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            Today's Performance
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 auto-rows-fr">
            {/* Today Duration */}
            <div className="glass-panel p-4 rounded-xl flex flex-col h-full">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4" style={{ color: 'var(--text-dim)' }} />
                <p className="text-xs uppercase font-semibold" style={{ color: 'var(--text-dim)' }}>
                  Time Today
                </p>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
                {formatDuration(stats.today.totalDuration)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                {stats.today.totalSessions} sessions
              </p>
            </div>

            {/* Today Average WPM */}
            <div className="glass-panel p-4 rounded-xl flex flex-col h-full">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" style={{ color: 'var(--text-dim)' }} />
                <p className="text-xs uppercase font-semibold" style={{ color: 'var(--text-dim)' }}>
                  Avg WPM
                </p>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                {stats.today.avgWpm.toFixed(1)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                today
              </p>
            </div>

            {/* Today Average Accuracy */}
            <div className="glass-panel p-4 rounded-xl flex flex-col h-full">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4" style={{ color: 'var(--text-dim)' }} />
                <p className="text-xs uppercase font-semibold" style={{ color: 'var(--text-dim)' }}>
                  Avg Accuracy
                </p>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--status-correct)' }}>
                {stats.today.avgAccuracy.toFixed(1)}%
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                today
              </p>
            </div>

            {/* Today Best WPM */}
            <div className="glass-panel p-4 rounded-xl flex flex-col h-full">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4" style={{ color: 'var(--text-dim)' }} />
                <p className="text-xs uppercase font-semibold" style={{ color: 'var(--text-dim)' }}>
                  Best WPM
                </p>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                {stats.today.bestWpm.toFixed(1)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                today
              </p>
            </div>

            {/* Today Best Accuracy */}
            <div className="glass-panel p-4 rounded-xl flex flex-col h-full">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4" style={{ color: 'var(--text-dim)' }} />
                <p className="text-xs uppercase font-semibold" style={{ color: 'var(--text-dim)' }}>
                  Best Accuracy
                </p>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--status-correct)' }}>
                {stats.today.bestAccuracy.toFixed(1)}%
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                today
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
