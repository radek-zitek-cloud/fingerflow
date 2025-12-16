/**
 * Session History Component
 *
 * Displays a paginated list of user's typing sessions with key metrics.
 */

import { useState, useEffect } from 'react';
import { sessionsAPI } from '../../services/api';
import { Clock, Target, TrendingUp, Calendar, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

export function SessionHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const SESSIONS_PER_PAGE = 10;

  useEffect(() => {
    loadSessions();
  }, [page]);

  const handleDeleteSession = async (sessionId) => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    try {
      await sessionsAPI.delete(sessionId);
      // Reload current page
      loadSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
      alert('Failed to delete session. Please try again.');
    }
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sessionsAPI.list(SESSIONS_PER_PAGE, page * SESSIONS_PER_PAGE);
      setSessions(data);
      setHasMore(data.length === SESSIONS_PER_PAGE);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError('Failed to load session history');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${dateStr} ${timeStr}`;
  };

  const formatDuration = (startTime, endTime) => {
    if (!endTime) return 'In progress';
    const durationMs = endTime - startTime;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4" style={{ color: 'var(--text-dim)' }}>Loading sessions...</p>
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

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 glass-panel rounded-xl">
        <p style={{ color: 'var(--text-dim)' }}>No typing sessions yet. Start your first session above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-main)' }}>
        Session History
      </h2>

      {/* Desktop Table View */}
      <div className="hidden md:block glass-panel rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--key-border)' }}>
              <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date & Time
                </div>
              </th>
              <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Duration
                </div>
              </th>
              <th className="text-right p-4 text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>
                Raw WPM
              </th>
              <th className="text-right p-4 text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>
                <div className="flex items-center justify-end gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Productive WPM
                </div>
              </th>
              <th className="text-right p-4 text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>
                <div className="flex items-center justify-end gap-2">
                  <Target className="w-4 h-4" />
                  Accuracy
                </div>
              </th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session, index) => (
              <tr
                key={session.id}
                className="border-b hover:bg-[var(--bg-input)] transition-colors"
                style={{ borderColor: 'var(--key-border)' }}
              >
                <td className="p-4">
                  <div style={{ color: 'var(--text-main)' }} className="font-medium">
                    {formatDateTime(session.start_time)}
                  </div>
                </td>
                <td className="p-4" style={{ color: 'var(--text-main)' }}>
                  {formatDuration(session.start_time, session.end_time)}
                </td>
                <td className="p-4 text-right font-medium" style={{ color: 'var(--text-main)' }}>
                  {session.mechanical_wpm ? session.mechanical_wpm.toFixed(1) : '-'}
                </td>
                <td className="p-4 text-right font-bold" style={{ color: 'var(--accent-primary)' }}>
                  {session.wpm ? session.wpm.toFixed(1) : '-'}
                </td>
                <td className="p-4 text-right font-bold" style={{ color: 'var(--status-correct)' }}>
                  {session.accuracy ? session.accuracy.toFixed(2) + '%' : '-'}
                </td>
                <td className="p-4">
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="p-2 rounded-lg hover:bg-[var(--status-error)] hover:bg-opacity-10 text-[var(--text-dim)] hover:text-[var(--status-error)] transition-colors"
                    title="Delete session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {sessions.map((session) => (
          <div key={session.id} className="glass-panel p-4 rounded-xl relative">
            <button
              onClick={() => handleDeleteSession(session.id)}
              className="absolute top-3 right-3 p-2 rounded-lg hover:bg-[var(--status-error)] hover:bg-opacity-10 text-[var(--text-dim)] hover:text-[var(--status-error)] transition-colors"
              title="Delete session"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="mb-3 pr-10">
              <div className="font-medium" style={{ color: 'var(--text-main)' }}>
                {formatDateTime(session.start_time)}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-dim)' }}>
                {formatDuration(session.start_time, session.end_time)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t" style={{ borderColor: 'var(--key-border)' }}>
              <div>
                <div className="text-xs" style={{ color: 'var(--text-dim)' }}>Raw WPM</div>
                <div className="text-lg font-medium" style={{ color: 'var(--text-main)' }}>
                  {session.mechanical_wpm ? session.mechanical_wpm.toFixed(1) : '-'}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--text-dim)' }}>Productive</div>
                <div className="text-lg font-bold" style={{ color: 'var(--accent-primary)' }}>
                  {session.wpm ? session.wpm.toFixed(1) : '-'}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--text-dim)' }}>Accuracy</div>
                <div className="text-lg font-bold" style={{ color: 'var(--status-correct)' }}>
                  {session.accuracy ? session.accuracy.toFixed(2) + '%' : '-'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-center items-center gap-4 pt-4">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-input)]"
          style={{ color: 'var(--text-main)' }}
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>

        <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
          Page {page + 1}
        </span>

        <button
          onClick={() => setPage(p => p + 1)}
          disabled={!hasMore}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-input)]"
          style={{ color: 'var(--text-main)' }}
        >
          Next
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
