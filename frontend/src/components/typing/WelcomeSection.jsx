/**
 * Welcome Section Component
 *
 * The homepage hero section shown when no session is active.
 * Includes:
 * - Hero title and description
 * - Session configuration
 * - Start button
 * - Session history and statistics (for authenticated users)
 * - Feature cards
 */

import { Activity, Target, Trophy, TrendingUp } from 'lucide-react';
import { SessionConfiguration } from './SessionConfiguration';
import { SessionProgressChart } from '../sessions/SessionProgressChart';
import { TypingStatistics } from '../sessions/TypingStatistics';
import { SessionHistory } from '../sessions/SessionHistory';

export function WelcomeSection({
  sessionMode,
  setSessionMode,
  timedDuration,
  setTimedDuration,
  wordCount,
  setWordCount,
  customInput,
  setCustomInput,
  viewMode,
  setViewMode,
  selectedWordSetId,
  setSelectedWordSetId,
  wordSets,
  isAuthenticated,
  onManageWordSets,
  onStartSession,
  onNavigateToAuth,
  onNavigateToSessionDetail,
  onNavigateToMultiSession,
}) {
  return (
    <div className="max-w-5xl mx-auto text-center py-16 md:py-4">
      <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight" style={{ color: 'var(--text-main)' }}>
        Master Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-hover)]">Flow</span>
      </h1>

      <p className="text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-dim)' }}>
        FingerFlow captures every biomechanical nuance of your typing.
        Analyze dwell times, flight latency, and finger efficiency in real-time.
      </p>

      {/* Session Configuration */}
      <SessionConfiguration
        sessionMode={sessionMode}
        setSessionMode={setSessionMode}
        timedDuration={timedDuration}
        setTimedDuration={setTimedDuration}
        wordCount={wordCount}
        setWordCount={setWordCount}
        customInput={customInput}
        setCustomInput={setCustomInput}
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedWordSetId={selectedWordSetId}
        setSelectedWordSetId={setSelectedWordSetId}
        wordSets={wordSets}
        isAuthenticated={isAuthenticated}
        onManageWordSets={onManageWordSets}
      />

      {/* Start Button */}
      <button
        onClick={onStartSession}
        className="group relative px-12 py-5 text-xl rounded-xl font-bold transition-all hover:scale-105 shadow-[var(--shadow-glow)]"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'white',
        }}
      >
        <span className="relative z-10 flex items-center gap-3">
          Start Diagnostics
          <TrendingUp className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </span>
        <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
      </button>

      {!isAuthenticated && (
        <p className="mt-6 text-sm font-medium" style={{ color: 'var(--text-dim)' }}>
          <button
            onClick={onNavigateToAuth}
            className="underline hover:text-[var(--accent-primary)] transition-colors"
          >
            Sign in
          </button>
          {' '}to save detailed analytics
        </p>
      )}

      {/* Progress Chart, Statistics, and Session History for Authenticated Users */}
      {isAuthenticated && (
        <div className="mt-16 space-y-16">
          <SessionProgressChart />
          <TypingStatistics />
          <SessionHistory
            onNavigateToDetail={onNavigateToSessionDetail}
            onNavigateToMultiSession={onNavigateToMultiSession}
          />
        </div>
      )}

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-20">
        <div className="p-8 glass-panel rounded-2xl feature-card text-left">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-input)] flex items-center justify-center mb-6">
            <Activity className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
          </div>
          <h3 className="font-bold text-lg mb-3" style={{ color: 'var(--text-main)' }}>
            Latency Tracking
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
            Precision measurement of keydown-to-keyup intervals.
          </p>
        </div>

        <div className="p-8 glass-panel rounded-2xl feature-card text-left">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-input)] flex items-center justify-center mb-6">
            <Target className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
          </div>
          <h3 className="font-bold text-lg mb-3" style={{ color: 'var(--text-main)' }}>
            Finger Mapping
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
            Heatmaps and efficiency scores for each finger.
          </p>
        </div>

        <div className="p-8 glass-panel rounded-2xl feature-card text-left">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-input)] flex items-center justify-center mb-6">
            <TrendingUp className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
          </div>
          <h3 className="font-bold text-lg mb-3" style={{ color: 'var(--text-main)' }}>
            Biomechanics
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
            Analyze flight time and digraph transitions.
          </p>
        </div>

        <div className="p-8 glass-panel rounded-2xl feature-card text-left">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-input)] flex items-center justify-center mb-6">
            <Trophy className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
          </div>
          <h3 className="font-bold text-lg mb-3" style={{ color: 'var(--text-main)' }}>
            Skill Evolution
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
            Watch your motor memory improve over time.
          </p>
        </div>
      </div>
    </div>
  );
}
