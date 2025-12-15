/**
 * FingerFlow Main Application Component
 *
 * Integrated authentication, profile management, and typing test.
 */

import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { AuthPage } from './components/auth/AuthPage';
import { ProfileSettings } from './components/profile/ProfileSettings';
import { TickerTape } from './components/TickerTape';
import { RollingWindow } from './components/RollingWindow';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import { useTelemetry } from './hooks/useTelemetry';
import { sessionsAPI } from './services/api';
import { Activity, Target, Trophy, TrendingUp } from 'lucide-react';

// Sample text for typing practice
const SAMPLE_TEXT =
  'The quick brown fox jumps over the lazy dog. ' +
  'This is a sample typing test to demonstrate the FingerFlow application. ' +
  'Type carefully and watch your finger performance improve over time. ' +
  'Focus on accuracy first, then gradually increase your speed.';

function App() {
  const { isAuthenticated, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'auth', 'profile'
  const [theme, setTheme] = useState('default');
  const [viewMode, setViewMode] = useState('ticker'); // 'ticker' or 'rolling'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [characterStates, setCharacterStates] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [lastKeyCode, setLastKeyCode] = useState(null);
  const [startTime, setStartTime] = useState(null);

  // Initialize telemetry
  const { addEvent } = useTelemetry(sessionId, sessionStartTime);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Redirect to home if user logs in while on auth page
  useEffect(() => {
    if (isAuthenticated && currentPage === 'auth') {
      setCurrentPage('home');
    }
  }, [isAuthenticated, currentPage]);

  // Start session
  const startSession = async () => {
    const sessionStart = Date.now();
    setStartTime(sessionStart);

    if (isAuthenticated) {
      try {
        const session = await sessionsAPI.create(sessionStart);
        setSessionId(session.id);
        setSessionStartTime(sessionStart);
      } catch (error) {
        console.error('Failed to create session:', error);
        // Continue without session tracking
      }
    }

    setCurrentIndex(0);
    setCharacterStates({});
  };

  // End session
  const endSession = () => {
    setSessionId(null);
    setSessionStartTime(null);
    setCurrentIndex(0);
    setCharacterStates({});
    setStartTime(null);
  };

  // Calculate WPM and accuracy
  const calculateStats = () => {
    const correctCount = Object.values(characterStates).filter(s => s === 'correct').length;
    const errorCount = Object.values(characterStates).filter(s => s === 'error').length;
    const totalTyped = correctCount + errorCount;
    const accuracy = totalTyped > 0 ? (correctCount / totalTyped) * 100 : 0;

    const elapsedMinutes = startTime ? (Date.now() - startTime) / 60000 : 0;
    const wpm = elapsedMinutes > 0 ? (correctCount / 5) / elapsedMinutes : 0;

    return { wpm: Math.round(wpm), accuracy: Math.round(accuracy), correctCount, errorCount };
  };

  // Handle typing
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!startTime || currentIndex >= SAMPLE_TEXT.length) return;

      // Get the expected character
      const expectedChar = SAMPLE_TEXT[currentIndex];
      const typedChar = e.key;

      // Track key for virtual keyboard
      setLastKeyCode(e.code);
      setTimeout(() => setLastKeyCode(null), 150);

      // Check if correct
      const isCorrect = typedChar === expectedChar;

      // Update character state
      setCharacterStates(prev => ({
        ...prev,
        [currentIndex]: isCorrect ? 'correct' : 'error',
      }));

      // Move to next character if correct
      if (isCorrect) {
        setCurrentIndex(prev => prev + 1);
      }

      // Telemetry is automatically handled by useTelemetry hook
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [startTime, currentIndex]);

  // Check if test is complete
  const isComplete = currentIndex >= SAMPLE_TEXT.length;
  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: 'var(--text-dim)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-app)]">
      <Navbar
        onNavigate={setCurrentPage}
        theme={theme}
        onThemeChange={setTheme}
      />

      {/* Auth Page */}
      {currentPage === 'auth' && !isAuthenticated && (
        <AuthPage />
      )}

      {/* Profile Page */}
      {currentPage === 'profile' && isAuthenticated && (
        <ProfileSettings />
      )}

      {/* Home Page / Typing Test */}
      {currentPage === 'home' && (
        <main className="flex-1 container mx-auto p-4 md:p-8">
          {/* Welcome Section */}
          {!startTime && (
            <div className="max-w-4xl mx-auto text-center py-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--text-main)' }}>
                Improve Your Typing
              </h1>
              <p className="text-lg md:text-xl mb-8" style={{ color: 'var(--text-dim)' }}>
                Track every keystroke, analyze biomechanical data, optimize your typing efficiency
              </p>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                <div className="p-6 bg-[var(--bg-panel)] rounded-lg">
                  <Activity className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--accent-primary)' }} />
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--text-main)' }}>
                    Real-time Tracking
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                    Every keydown and keyup event captured
                  </p>
                </div>

                <div className="p-6 bg-[var(--bg-panel)] rounded-lg">
                  <Target className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--accent-primary)' }} />
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--text-main)' }}>
                    Finger Analysis
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                    Per-finger performance metrics
                  </p>
                </div>

                <div className="p-6 bg-[var(--bg-panel)] rounded-lg">
                  <TrendingUp className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--accent-primary)' }} />
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--text-main)' }}>
                    Biomechanics
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                    Dwell time, flight time, transitions
                  </p>
                </div>

                <div className="p-6 bg-[var(--bg-panel)] rounded-lg">
                  <Trophy className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--accent-primary)' }} />
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--text-main)' }}>
                    Track Progress
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                    Historical data and trends
                  </p>
                </div>
              </div>

              {/* View Mode Selector */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-center mb-8">
                <label className="font-medium" style={{ color: 'var(--text-main)' }}>
                  View Mode:
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('ticker')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                      viewMode === 'ticker' ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--key-bg)]'
                    }`}
                    style={viewMode !== 'ticker' ? { color: 'var(--text-main)' } : {}}
                  >
                    Ticker Tape
                  </button>
                  <button
                    onClick={() => setViewMode('rolling')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                      viewMode === 'rolling' ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--key-bg)]'
                    }`}
                    style={viewMode !== 'rolling' ? { color: 'var(--text-main)' } : {}}
                  >
                    Rolling Window
                  </button>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={startSession}
                className="px-12 py-4 text-xl rounded-lg font-semibold transition-all hover:opacity-90 hover:scale-105"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                }}
              >
                Start Typing Test
              </button>

              {!isAuthenticated && (
                <p className="mt-4 text-sm" style={{ color: 'var(--text-dim)' }}>
                  <button
                    onClick={() => setCurrentPage('auth')}
                    className="underline hover:opacity-70"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    Sign in
                  </button>
                  {' '}to save your sessions and track progress
                </p>
              )}
            </div>
          )}

          {/* Typing Area */}
          {startTime && !isComplete && (
            <div className="max-w-6xl mx-auto">
              {/* Stats Header */}
              <div className="flex justify-between items-center mb-8 p-4 bg-[var(--bg-panel)] rounded-lg">
                <div className="text-center flex-1">
                  <p className="text-sm" style={{ color: 'var(--text-dim)' }}>WPM</p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                    {stats.wpm}
                  </p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Accuracy</p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--status-correct)' }}>
                    {stats.accuracy}%
                  </p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Progress</p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
                    {Math.round((currentIndex / SAMPLE_TEXT.length) * 100)}%
                  </p>
                </div>
              </div>

              {/* Typing Display */}
              <div className="mb-8">
                {viewMode === 'ticker' ? (
                  <TickerTape
                    text={SAMPLE_TEXT}
                    currentIndex={currentIndex}
                    characterStates={characterStates}
                  />
                ) : (
                  <RollingWindow
                    text={SAMPLE_TEXT}
                    currentIndex={currentIndex}
                    characterStates={characterStates}
                  />
                )}
              </div>

              {/* Virtual Keyboard */}
              <VirtualKeyboard activeKey={lastKeyCode} />

              {/* End Test Button */}
              <div className="text-center mt-8">
                <button
                  onClick={endSession}
                  className="px-6 py-2 rounded-lg border-2 hover:bg-[var(--bg-input)] transition-all"
                  style={{
                    borderColor: 'var(--key-border)',
                    color: 'var(--text-main)',
                  }}
                >
                  End Test
                </button>
              </div>
            </div>
          )}

          {/* Results Screen */}
          {isComplete && (
            <div className="max-w-2xl mx-auto text-center py-12">
              <div className="mb-8">
                <Trophy className="w-20 h-20 mx-auto mb-4" style={{ color: 'var(--accent-primary)' }} />
                <h2 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>
                  Test Complete!
                </h2>
                <p style={{ color: 'var(--text-dim)' }}>Great job on completing the typing test</p>
              </div>

              {/* Final Stats */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="p-6 bg-[var(--bg-panel)] rounded-lg">
                  <p className="text-sm mb-2" style={{ color: 'var(--text-dim)' }}>Words Per Minute</p>
                  <p className="text-5xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                    {stats.wpm}
                  </p>
                </div>
                <div className="p-6 bg-[var(--bg-panel)] rounded-lg">
                  <p className="text-sm mb-2" style={{ color: 'var(--text-dim)' }}>Accuracy</p>
                  <p className="text-5xl font-bold" style={{ color: 'var(--status-correct)' }}>
                    {stats.accuracy}%
                  </p>
                </div>
                <div className="p-6 bg-[var(--bg-panel)] rounded-lg">
                  <p className="text-sm mb-2" style={{ color: 'var(--text-dim)' }}>Correct Keystrokes</p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
                    {stats.correctCount}
                  </p>
                </div>
                <div className="p-6 bg-[var(--bg-panel)] rounded-lg">
                  <p className="text-sm mb-2" style={{ color: 'var(--text-dim)' }}>Errors</p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--status-error)' }}>
                    {stats.errorCount}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={endSession}
                  className="px-8 py-3 rounded-lg font-semibold transition-all hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                  }}
                >
                  Try Again
                </button>
                {!isAuthenticated && (
                  <button
                    onClick={() => setCurrentPage('auth')}
                    className="px-8 py-3 rounded-lg font-semibold border-2 transition-all hover:bg-[var(--bg-input)]"
                    style={{
                      borderColor: 'var(--accent-primary)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    Sign In to Save
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      )}

      {/* Footer */}
      <footer className="py-6 text-center border-t" style={{ borderColor: 'var(--key-border)', color: 'var(--text-dim)' }}>
        <p className="text-sm">FingerFlow - Biomechanical Typing Diagnostics</p>
      </footer>
    </div>
  );
}

export default App;
