/**
 * Typing Test UI Component
 *
 * Displays the active typing test interface and results screen.
 * Includes:
 * - Real-time stats header (WPM, accuracy, progress/timer)
 * - Text display (TickerTape or RollingWindow)
 * - Virtual keyboard
 * - Control buttons (abort/save)
 * - Results screen with final stats
 */

import { Trophy } from 'lucide-react';
import { TickerTape } from '../TickerTape';
import { RollingWindow } from '../RollingWindow';
import { VirtualKeyboard } from '../VirtualKeyboard';

export function TypingTestUI({
  isComplete,
  viewMode,
  practiceText,
  currentIndex,
  characterStates,
  lastKeyCode,
  stats,
  sessionMode,
  timedDuration,
  timeRemaining,
  totalKeystrokes,
  firstKeystrokeTime,
  lastKeystrokeTime,
  onAbort,
  onSave,
  onNavigateToAuth,
  isAuthenticated,
}) {
  // Active typing test interface
  if (!isComplete) {
    return (
      <div className="max-w-6xl mx-auto py-12">
        {/* Stats Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="p-6 glass-panel rounded-2xl shadow-[var(--shadow-lg)] text-center">
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Productive WPM</p>
            <p className="text-3xl md:text-4xl font-black" style={{ color: 'var(--accent-primary)' }}>
              {stats.wpm}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>Correct chars only</p>
          </div>
          <div className="p-6 glass-panel rounded-2xl shadow-[var(--shadow-lg)] text-center">
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Mechanical WPM</p>
            <p className="text-3xl md:text-4xl font-black" style={{ color: 'var(--text-main)' }}>
              {stats.mechanicalWPM}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>All keystrokes</p>
          </div>
          <div className="p-6 glass-panel rounded-2xl shadow-[var(--shadow-lg)] text-center">
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Accuracy</p>
            <p className="text-3xl md:text-4xl font-black" style={{ color: 'var(--status-correct)' }}>
              {stats.accuracy}%
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>{stats.correctCount}/{stats.correctCount + stats.errorCount}</p>
          </div>
          <div className="p-6 glass-panel rounded-2xl shadow-[var(--shadow-lg)] text-center">
            {sessionMode === 'timed' ? (
              <>
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Time Remaining</p>
                <p className="text-3xl md:text-4xl font-black" style={{
                  color: timeRemaining !== null && timeRemaining <= 5 ? 'var(--status-error)' : 'var(--text-main)'
                }}>
                  {timeRemaining !== null ? timeRemaining : timedDuration}s
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                  of {timedDuration}s
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Progress</p>
                <p className="text-3xl md:text-4xl font-black" style={{ color: 'var(--text-main)' }}>
                  {practiceText ? Math.round((currentIndex / practiceText.length) * 100) : 0}%
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>{currentIndex}/{practiceText.length}</p>
              </>
            )}
          </div>
        </div>

        {/* Typing Display */}
        <div className="mb-12 relative">
          {viewMode === 'ticker' ? (
            <TickerTape
              text={practiceText}
              currentIndex={currentIndex}
              characterStates={characterStates}
            />
          ) : (
            <RollingWindow
              text={practiceText}
              currentIndex={currentIndex}
              characterStates={characterStates}
            />
          )}
        </div>

        {/* Virtual Keyboard */}
        <div className="mb-10">
          <VirtualKeyboard activeKey={lastKeyCode} />
        </div>

        {/* End Test Button */}
        <div className="text-center">
          <button
            onClick={onAbort}
            className="px-8 py-2.5 rounded-lg border hover:bg-[var(--bg-input)] transition-colors font-medium text-sm tracking-wide"
            style={{
              borderColor: 'var(--key-border)',
              color: 'var(--text-dim)',
            }}
          >
            ABORT SESSION
          </button>
        </div>
      </div>
    );
  }

  // Results screen
  return (
    <div className="max-w-3xl mx-auto text-center py-20">
      <div className="mb-12 celebrate-icon">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[var(--accent-glow)] flex items-center justify-center">
          <Trophy className="w-12 h-12" style={{ color: 'var(--accent-primary)' }} />
        </div>
        <h2 className="text-5xl font-bold mb-4" style={{ color: 'var(--text-main)' }}>
          Session Complete
        </h2>
        <p className="text-xl" style={{ color: 'var(--text-dim)' }}>Analysis report generated successfully.</p>
      </div>

      {/* Final Stats */}
      <div className="grid grid-cols-2 gap-6 mb-12">
        <div className="p-8 glass-panel rounded-2xl">
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>Productive WPM</p>
          <div className="flex items-baseline justify-center gap-2">
            <p className="text-6xl font-black" style={{ color: 'var(--accent-primary)' }}>
              {stats.wpm}
            </p>
            <span className="text-lg font-medium opacity-60" style={{ color: 'var(--text-main)' }}>WPM</span>
          </div>
          <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-dim)' }}>Correct characters only</p>
        </div>
        <div className="p-8 glass-panel rounded-2xl">
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>Mechanical WPM</p>
          <div className="flex items-baseline justify-center gap-2">
            <p className="text-6xl font-black" style={{ color: 'var(--text-main)' }}>
              {stats.mechanicalWPM}
            </p>
            <span className="text-lg font-medium opacity-60" style={{ color: 'var(--text-main)' }}>WPM</span>
          </div>
          <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-dim)' }}>All keystrokes ({totalKeystrokes} total)</p>
        </div>
        <div className="p-6 glass-panel rounded-2xl">
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Accuracy</p>
          <p className="text-5xl font-bold" style={{ color: 'var(--status-correct)' }}>
            {stats.accuracy}%
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-dim)' }}>{stats.correctCount} correct / {stats.errorCount} errors</p>
        </div>
        <div className="p-6 glass-panel rounded-2xl">
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Time</p>
          <p className="text-5xl font-bold" style={{ color: 'var(--text-main)' }}>
            {firstKeystrokeTime && lastKeystrokeTime ?
              Math.round((lastKeystrokeTime - firstKeystrokeTime) / 1000) : 0}
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-dim)' }}>seconds</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={onSave}
          className="px-10 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 shadow-[var(--shadow-glow)]"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'white',
          }}
        >
          {isAuthenticated ? 'Save Session' : 'Start New Session'}
        </button>
        <button
          onClick={onAbort}
          className="px-10 py-4 rounded-xl font-bold text-lg border-2 transition-all hover:bg-[var(--status-error)] hover:text-white"
          style={{
            borderColor: 'var(--status-error)',
            color: 'var(--status-error)',
          }}
        >
          Abort Session
        </button>
        {!isAuthenticated && (
          <button
            onClick={onNavigateToAuth}
            className="px-10 py-4 rounded-xl font-bold text-lg border-2 transition-all hover:bg-[var(--accent-glow)]"
            style={{
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)',
            }}
          >
            Login to Save
          </button>
        )}
      </div>
    </div>
  );
}
