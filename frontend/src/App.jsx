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
import { WordSetManager } from './components/word_sets/WordSetManager';
import { TickerTape } from './components/TickerTape';
import { RollingWindow } from './components/RollingWindow';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import { useTelemetry } from './hooks/useTelemetry';
import { sessionsAPI, wordSetsAPI } from './services/api';
import { Activity, Target, Trophy, TrendingUp } from 'lucide-react';

/**
 * Generate random text from word sets
 * @param {number} wordCount - Number of words to generate
 * @returns {Promise<string>} - Generated text string
 */
async function generateRandomText(wordCount = 20) {
  try {
    // Fetch available word sets
    const wordSets = await wordSetsAPI.list(0, 100);

    if (!wordSets || wordSets.length === 0) {
      // Fallback to default text if no word sets available
      return 'The quick brown fox jumps over the lazy dog. Practice your typing skills with FingerFlow.';
    }

    // Pick a random word set
    const randomSet = wordSets[Math.floor(Math.random() * wordSets.length)];
    const words = randomSet.words || [];

    if (words.length === 0) {
      return 'The quick brown fox jumps over the lazy dog. Practice your typing skills with FingerFlow.';
    }

    // Generate random selection of words
    const selectedWords = [];
    for (let i = 0; i < wordCount; i++) {
      const randomWord = words[Math.floor(Math.random() * words.length)];
      selectedWords.push(randomWord);
    }

    // Join words with spaces
    return selectedWords.join(' ');
  } catch (error) {
    console.error('Failed to generate random text:', error);
    // Fallback text
    return 'The quick brown fox jumps over the lazy dog. Practice your typing skills with FingerFlow.';
  }
}

function App() {
  const { isAuthenticated, loading, checkAuth } = useAuth();
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'auth', 'profile'
  const [theme, setTheme] = useState('default');
  const [viewMode, setViewMode] = useState('ticker'); // 'ticker' or 'rolling'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [characterStates, setCharacterStates] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [lastKeyCode, setLastKeyCode] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [googleCallbackStatus, setGoogleCallbackStatus] = useState(null); // 'processing', 'success', 'error'
  const [practiceText, setPracticeText] = useState(''); // Dynamic practice text
  const [firstKeystrokeTime, setFirstKeystrokeTime] = useState(null); // Time of first keystroke
  const [lastKeystrokeTime, setLastKeystrokeTime] = useState(null); // Time of last keystroke
  const [totalKeystrokes, setTotalKeystrokes] = useState(0); // All keystrokes including backspace

  // Initialize telemetry
  const { addEvent } = useTelemetry(sessionId, sessionStartTime);

  // Handle Google OAuth callback
  useEffect(() => {
    // Check for tokens in URL hash (from Google OAuth redirect)
    const hash = window.location.hash.substring(1); // Remove the #
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const error = params.get('error');

    if (error) {
      setGoogleCallbackStatus('error');
      console.error('Google OAuth error:', error);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (accessToken && refreshToken) {
      setGoogleCallbackStatus('processing');
      handleGoogleCallback(accessToken, refreshToken);
    }
  }, []);

  async function handleGoogleCallback(accessToken, refreshToken) {
    try {
      // Store tokens
      localStorage.setItem('auth_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);

      setGoogleCallbackStatus('success');

      // Clean URL and reload auth state
      window.history.replaceState({}, document.title, window.location.pathname);
      await checkAuth();
    } catch (err) {
      console.error('Google callback error:', err);
      setGoogleCallbackStatus('error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

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

    // Generate random practice text from word sets (20 words)
    const text = await generateRandomText(20);
    setPracticeText(text);

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
    setFirstKeystrokeTime(null);
    setLastKeystrokeTime(null);
    setTotalKeystrokes(0);
  };

  // End session
  const endSession = async () => {
    // Send final stats to backend if authenticated
    if (isAuthenticated && sessionId && firstKeystrokeTime && lastKeystrokeTime) {
      try {
        const stats = calculateFinalStats();
        await sessionsAPI.end(sessionId, {
          end_time: lastKeystrokeTime,
          wpm: stats.productiveWPM,
          mechanical_wpm: stats.mechanicalWPM,
          accuracy: stats.accuracy,
          total_characters: practiceText.length,
          correct_characters: stats.correctCount,
          incorrect_characters: stats.errorCount,
          total_keystrokes: totalKeystrokes,
        });
      } catch (error) {
        console.error('Failed to end session:', error);
      }
    }

    // Reset state
    setSessionId(null);
    setSessionStartTime(null);
    setCurrentIndex(0);
    setCharacterStates({});
    setStartTime(null);
    setFirstKeystrokeTime(null);
    setLastKeystrokeTime(null);
    setTotalKeystrokes(0);
  };

  // Calculate WPM and accuracy (for display during typing)
  const calculateStats = () => {
    const correctCount = Object.values(characterStates).filter(s => s === 'correct').length;
    const errorCount = Object.values(characterStates).filter(s => s === 'error').length;
    const totalTyped = correctCount + errorCount;
    const accuracy = totalTyped > 0 ? (correctCount / totalTyped) * 100 : 0;

    // Use time from first to current keystroke
    const elapsedMinutes = firstKeystrokeTime ? (Date.now() - firstKeystrokeTime) / 60000 : 0;

    // Productive WPM: only correct characters
    const productiveWPM = elapsedMinutes > 0 ? (correctCount / 5) / elapsedMinutes : 0;

    // Mechanical WPM: all keystrokes
    const mechanicalWPM = elapsedMinutes > 0 ? (totalKeystrokes / 5) / elapsedMinutes : 0;

    return {
      wpm: Math.round(productiveWPM),
      mechanicalWPM: Math.round(mechanicalWPM),
      accuracy: Math.round(accuracy),
      correctCount,
      errorCount
    };
  };

  // Calculate final stats (for session end)
  const calculateFinalStats = () => {
    const correctCount = Object.values(characterStates).filter(s => s === 'correct').length;
    const errorCount = Object.values(characterStates).filter(s => s === 'error').length;
    const totalTyped = correctCount + errorCount;
    const accuracy = totalTyped > 0 ? (correctCount / totalTyped) * 100 : 0;

    // Use time from first to last keystroke
    const elapsedMinutes = (firstKeystrokeTime && lastKeystrokeTime)
      ? (lastKeystrokeTime - firstKeystrokeTime) / 60000
      : 0;

    // Productive WPM: only correct characters
    const productiveWPM = elapsedMinutes > 0 ? (correctCount / 5) / elapsedMinutes : 0;

    // Mechanical WPM: all keystrokes
    const mechanicalWPM = elapsedMinutes > 0 ? (totalKeystrokes / 5) / elapsedMinutes : 0;

    return {
      productiveWPM,
      mechanicalWPM,
      accuracy,
      correctCount,
      errorCount,
    };
  };

  // Handle typing
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!startTime || !practiceText || currentIndex >= practiceText.length) return;

      const now = Date.now();

      // Track first keystroke time
      if (!firstKeystrokeTime) {
        setFirstKeystrokeTime(now);
      }

      // Track last keystroke time
      setLastKeystrokeTime(now);

      // Increment total keystrokes
      setTotalKeystrokes(prev => prev + 1);

      // Get the expected character
      const expectedChar = practiceText[currentIndex];
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

    // Handle backspace for corrections
    const handleKeyDown = (e) => {
      if (!startTime || !practiceText) return;

      const now = Date.now();

      // Track backspace as a keystroke
      if (e.key === 'Backspace') {
        // Track first keystroke if this is the first key
        if (!firstKeystrokeTime) {
          setFirstKeystrokeTime(now);
        }

        // Track last keystroke time
        setLastKeystrokeTime(now);

        // Increment total keystrokes (backspace counts as a keystroke)
        setTotalKeystrokes(prev => prev + 1);

        // Allow going back if not at start
        if (currentIndex > 0) {
          e.preventDefault();
          setCurrentIndex(prev => prev - 1);
          // Clear the state of the previous character
          setCharacterStates(prev => {
            const newStates = { ...prev };
            delete newStates[currentIndex - 1];
            return newStates;
          });
        }
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [startTime, currentIndex, practiceText, firstKeystrokeTime]);

  // Check if test is complete
  const isComplete = practiceText && currentIndex >= practiceText.length;
  const stats = calculateStats();

  if (loading || googleCallbackStatus === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: 'var(--text-dim)' }}>
            {googleCallbackStatus === 'processing' ? 'Completing Google Sign In...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-app)] relative overflow-hidden transition-colors duration-300">
      {/* Background Gradient Blobs */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--accent-primary)] opacity-10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--accent-primary)] opacity-10 blur-[120px] pointer-events-none" />

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

      {/* Word Sets Manager */}
      {currentPage === 'word-sets' && isAuthenticated && (
        <WordSetManager />
      )}

      {/* Home Page / Typing Test */}
      {currentPage === 'home' && (
        <main className="flex-1 container mx-auto p-4 md:p-8 relative z-10">
          {/* Welcome Section */}
          {!startTime && (
            <div className="max-w-5xl mx-auto text-center py-16 md:py-24">
              <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-[var(--accent-primary)] bg-[var(--accent-glow)] backdrop-blur-sm">
                <span className="text-sm font-semibold tracking-wide" style={{ color: 'var(--accent-primary)' }}>
                  NEXT-GEN TYPING DIAGNOSTICS
                </span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight" style={{ color: 'var(--text-main)' }}>
                Master Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-hover)]">Flow</span>
              </h1>
              
              <p className="text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                FingerFlow captures every biomechanical nuance of your typing. 
                Analyze dwell times, flight latency, and finger efficiency in real-time.
              </p>

              {/* Start Button */}
              <button
                onClick={startSession}
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
                    onClick={() => setCurrentPage('auth')}
                    className="underline hover:text-[var(--accent-primary)] transition-colors"
                  >
                    Sign in
                  </button>
                  {' '}to save detailed analytics
                </p>
              )}

              {/* View Mode Selector */}
              <div className="mt-16 flex flex-col md:flex-row gap-4 items-center justify-center">
                <div className="p-1 rounded-xl glass-panel flex gap-1">
                  <button
                    onClick={() => setViewMode('ticker')}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                      viewMode === 'ticker' ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'hover:bg-[var(--bg-input)]'
                    }`}
                    style={viewMode !== 'ticker' ? { color: 'var(--text-dim)' } : {}}
                  >
                    Ticker Tape
                  </button>
                  <button
                    onClick={() => setViewMode('rolling')}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                      viewMode === 'rolling' ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'hover:bg-[var(--bg-input)]'
                    }`}
                    style={viewMode !== 'rolling' ? { color: 'var(--text-dim)' } : {}}
                  >
                    Rolling Window
                  </button>
                </div>
              </div>

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
          )}

          {/* Typing Area */}
          {startTime && !isComplete && (
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
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Progress</p>
                  <p className="text-3xl md:text-4xl font-black" style={{ color: 'var(--text-main)' }}>
                    {practiceText ? Math.round((currentIndex / practiceText.length) * 100) : 0}%
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>{currentIndex}/{practiceText.length}</p>
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
                  onClick={endSession}
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
          )}

          {/* Results Screen */}
          {isComplete && (
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
                  onClick={endSession}
                  className="px-10 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 shadow-[var(--shadow-glow)]"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                  }}
                >
                  Start New Session
                </button>
                {!isAuthenticated && (
                  <button
                    onClick={() => setCurrentPage('auth')}
                    className="px-10 py-4 rounded-xl font-bold text-lg border-2 transition-all hover:bg-[var(--accent-glow)]"
                    style={{
                      borderColor: 'var(--accent-primary)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    Save & Analyze
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      )}

      {/* Footer */}
      <footer className="py-8 text-center border-t relative z-10" style={{ borderColor: 'var(--key-border)', color: 'var(--text-dim)' }}>
        <p className="text-sm font-medium">FingerFlow v1.3.0 &bull; Biomechanical Typing Diagnostics</p>
      </footer>
    </div>
  );}

export default App;
