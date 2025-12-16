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
import { SessionHistory } from './components/sessions/SessionHistory';
import { SessionProgressChart } from './components/sessions/SessionProgressChart';
import { useTelemetry } from './hooks/useTelemetry';
import { sessionsAPI, wordSetsAPI } from './services/api';
import { Activity, Target, Trophy, TrendingUp } from 'lucide-react';
import { playClickSound, playErrorBeep, resumeAudioContext } from './utils/audioFeedback';

/**
 * Generate random text from word sets
 * @param {number} wordCount - Number of words to generate
 * @param {number|null} wordSetId - Specific word set ID to use, or null for random
 * @param {Array} availableWordSets - Array of available word sets
 * @returns {Promise<string>} - Generated text string
 */
async function generateRandomText(wordCount = 20, wordSetId = null, availableWordSets = []) {
  try {
    // Fetch available word sets if not provided
    let wordSets = availableWordSets;
    if (!wordSets || wordSets.length === 0) {
      wordSets = await wordSetsAPI.list(0, 100);
    }

    if (!wordSets || wordSets.length === 0) {
      // Fallback to default text if no word sets available
      return 'the quick brown fox jumps over the lazy dog practice your typing skills with finger flow';
    }

    // Pick specific word set or random
    let selectedSet;
    if (wordSetId) {
      selectedSet = wordSets.find(set => set.id === wordSetId);
      if (!selectedSet) {
        // If specified word set not found, pick random
        selectedSet = wordSets[Math.floor(Math.random() * wordSets.length)];
      }
    } else {
      // Pick random word set
      selectedSet = wordSets[Math.floor(Math.random() * wordSets.length)];
    }

    const words = selectedSet.words || [];

    if (words.length === 0) {
      return 'the quick brown fox jumps over the lazy dog practice your typing skills with finger flow';
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
    return 'the quick brown fox jumps over the lazy dog practice your typing skills with finger flow';
  }
}

function App() {
  const { isAuthenticated, loading, checkAuth, user } = useAuth();
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'auth', 'profile'
  const [theme, setTheme] = useState('default');
  const [viewMode, setViewMode] = useState('ticker'); // 'ticker' or 'rolling'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [characterStates, setCharacterStates] = useState({});
  const [characterErrorHistory, setCharacterErrorHistory] = useState(new Set()); // Track which indices had errors
  const [sessionId, setSessionId] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [lastKeyCode, setLastKeyCode] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [googleCallbackStatus, setGoogleCallbackStatus] = useState(null); // 'processing', 'success', 'error'
  const [practiceText, setPracticeText] = useState(''); // Dynamic practice text
  const [firstKeystrokeTime, setFirstKeystrokeTime] = useState(null); // Time of first keystroke
  const [lastKeystrokeTime, setLastKeystrokeTime] = useState(null); // Time of last keystroke
  const [totalKeystrokes, setTotalKeystrokes] = useState(0); // All keystrokes including backspace
  const [totalErrors, setTotalErrors] = useState(0); // Total errors (including corrected ones)
  const [pressedKeys, setPressedKeys] = useState(new Set()); // Track which keys are currently pressed

  // Session configuration
  const [sessionMode, setSessionMode] = useState('wordcount'); // 'timed' or 'wordcount'
  const [timedDuration, setTimedDuration] = useState(30); // seconds
  const [wordCount, setWordCount] = useState(20); // number of words
  const [customInput, setCustomInput] = useState(''); // for custom durations/counts
  const [timeRemaining, setTimeRemaining] = useState(null); // for timed mode countdown
  const [selectedWordSetId, setSelectedWordSetId] = useState(null); // selected word set for text generation
  const [wordSets, setWordSets] = useState([]); // available word sets

  // Initialize telemetry
  const { addEvent, flush } = useTelemetry(sessionId, sessionStartTime);

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

  // Load settings from user profile when authenticated
  useEffect(() => {
    if (isAuthenticated && user?.settings) {
      const settings = user.settings;
      // Load theme
      if (settings.theme) setTheme(settings.theme);
      // Load session configuration
      if (settings.sessionMode) setSessionMode(settings.sessionMode);
      if (settings.timedDuration) setTimedDuration(settings.timedDuration);
      if (settings.wordCount) setWordCount(settings.wordCount);
      if (settings.viewMode) setViewMode(settings.viewMode);
      if (settings.selectedWordSetId) setSelectedWordSetId(settings.selectedWordSetId);
    }
  }, [isAuthenticated, user]);

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

  // Fetch available word sets on mount
  useEffect(() => {
    const fetchWordSets = async () => {
      try {
        const sets = await wordSetsAPI.list(0, 100);
        setWordSets(sets);
        // Set first word set as default if available
        if (sets && sets.length > 0 && !selectedWordSetId) {
          setSelectedWordSetId(sets[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch word sets:', error);
      }
    };
    fetchWordSets();
  }, []);

  // Start session
  const startSession = async () => {
    const sessionStart = Date.now();
    setStartTime(sessionStart);

    // Resume audio context for feedback sounds (browser autoplay policy)
    resumeAudioContext();

    // Calculate word count based on session mode
    let wordsToGenerate;
    if (sessionMode === 'timed') {
      // Assume max 300 WPM: (duration in seconds / 60) * 300 WPM
      wordsToGenerate = Math.ceil((timedDuration / 60) * 300);
      setTimeRemaining(timedDuration); // Initialize countdown
    } else {
      // Word count mode
      wordsToGenerate = wordCount;
      setTimeRemaining(null); // No countdown for word count mode
    }

    // Generate random practice text with selected word set
    const text = await generateRandomText(wordsToGenerate, selectedWordSetId, wordSets);
    setPracticeText(text);

    if (isAuthenticated) {
      try {
        const session = await sessionsAPI.create(sessionStart);
        setSessionId(session.id);
        setSessionStartTime(sessionStart);

        // Save current settings to user profile
        try {
          await fetch(`${import.meta.env.VITE_API_URL}/api/users/profile`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({
              email: user.email,
              settings: {
                theme,
                sessionMode,
                timedDuration,
                wordCount,
                viewMode,
                selectedWordSetId
              }
            })
          });
        } catch (error) {
          console.error('Failed to save settings:', error);
          // Continue without saving settings
        }
      } catch (error) {
        console.error('Failed to create session:', error);
        // Continue without session tracking
      }
    }

    setCurrentIndex(0);
    setCharacterStates({});
    setCharacterErrorHistory(new Set());
    setFirstKeystrokeTime(null);
    setLastKeystrokeTime(null);
    setTotalKeystrokes(0);
    setTotalErrors(0);
  };

  // Save session (end with data persisted)
  const saveSession = async () => {
    // Flush any remaining telemetry events
    if (sessionId) {
      await flush();
    }

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
        console.error('Failed to save session:', error);
      }
    }

    // Reset state
    setSessionId(null);
    setSessionStartTime(null);
    setCurrentIndex(0);
    setCharacterStates({});
    setCharacterErrorHistory(new Set());
    setStartTime(null);
    setFirstKeystrokeTime(null);
    setLastKeystrokeTime(null);
    setTotalKeystrokes(0);
    setTotalErrors(0);
    setTimeRemaining(null);
  };

  // Abort session (delete without saving)
  const abortSession = async () => {
    // Delete session from backend if authenticated
    if (isAuthenticated && sessionId) {
      try {
        await sessionsAPI.delete(sessionId);
      } catch (error) {
        console.error('Failed to abort session:', error);
      }
    }

    // Reset state (same as save, but without persisting stats)
    setSessionId(null);
    setSessionStartTime(null);
    setCurrentIndex(0);
    setCharacterStates({});
    setCharacterErrorHistory(new Set());
    setStartTime(null);
    setFirstKeystrokeTime(null);
    setLastKeystrokeTime(null);
    setTotalKeystrokes(0);
    setTotalErrors(0);
    setTimeRemaining(null);
  };

  // Calculate WPM and accuracy (for display during typing)
  const calculateStats = () => {
    const correctCount = Object.values(characterStates).filter(s => s === 'correct' || s === 'corrected').length;
    // Use totalErrors to include corrected mistakes in accuracy calculation
    const totalTyped = correctCount + totalErrors;
    const accuracy = totalTyped > 0 ? (correctCount / totalTyped) * 100 : 100;

    // Use time from first to current keystroke
    const elapsedMinutes = firstKeystrokeTime ? (Date.now() - firstKeystrokeTime) / 60000 : 0;

    // Productive WPM: correct and corrected characters
    const productiveWPM = elapsedMinutes > 0 ? (correctCount / 5) / elapsedMinutes : 0;

    // Mechanical WPM: all keystrokes
    const mechanicalWPM = elapsedMinutes > 0 ? (totalKeystrokes / 5) / elapsedMinutes : 0;

    return {
      wpm: Math.round(productiveWPM),
      mechanicalWPM: Math.round(mechanicalWPM),
      accuracy: Math.round(accuracy),
      correctCount,
      errorCount: totalErrors
    };
  };

  // Calculate final stats (for session end)
  const calculateFinalStats = () => {
    const correctCount = Object.values(characterStates).filter(s => s === 'correct' || s === 'corrected').length;
    // Use totalErrors to include corrected mistakes
    const totalTyped = correctCount + totalErrors;
    const accuracy = totalTyped > 0 ? (correctCount / totalTyped) * 100 : 100;

    // Use time from first to last keystroke
    const elapsedMinutes = (firstKeystrokeTime && lastKeystrokeTime)
      ? (lastKeystrokeTime - firstKeystrokeTime) / 60000
      : 0;

    // Productive WPM: correct and corrected characters
    const productiveWPM = elapsedMinutes > 0 ? (correctCount / 5) / elapsedMinutes : 0;

    // Mechanical WPM: all keystrokes
    const mechanicalWPM = elapsedMinutes > 0 ? (totalKeystrokes / 5) / elapsedMinutes : 0;

    return {
      productiveWPM,
      mechanicalWPM,
      accuracy,
      correctCount,
      errorCount: totalErrors,
    };
  };

  // Timer countdown for timed mode
  useEffect(() => {
    if (!firstKeystrokeTime || sessionMode !== 'timed' || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - firstKeystrokeTime) / 1000);
      const remaining = timedDuration - elapsed;

      if (remaining <= 0) {
        setTimeRemaining(0);
        clearInterval(interval);
      } else {
        setTimeRemaining(remaining);
      }
    }, 100); // Update every 100ms for smooth countdown

    return () => clearInterval(interval);
  }, [firstKeystrokeTime, sessionMode, timedDuration, startTime]);

  // Handle typing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!startTime || !practiceText) return;

      // Don't process keystrokes if session is complete
      if (currentIndex >= practiceText.length) return;
      if (sessionMode === 'timed' && timeRemaining !== null && timeRemaining <= 0) return;

      // Don't capture browser shortcuts or modifier-only keys
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const now = Date.now();

      // Track first keystroke time
      if (!firstKeystrokeTime) {
        setFirstKeystrokeTime(now);
      }

      // Track last keystroke time
      setLastKeystrokeTime(now);

      // Handle backspace for corrections
      if (e.key === 'Backspace') {
        e.preventDefault();

        // Increment total keystrokes (backspace counts as a keystroke)
        setTotalKeystrokes(prev => prev + 1);

        // Send telemetry for backspace DOWN event (not an error)
        if (sessionId) {
          addEvent('DOWN', e.code, false);
        }

        // Allow going back if not at start
        if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
          // Clear the state of the previous character (allows correction)
          setCharacterStates(prev => {
            const newStates = { ...prev };
            delete newStates[currentIndex - 1];
            return newStates;
          });
        }
        return;
      }

      // Only process character keys for typing
      if (e.key.length !== 1 || currentIndex >= practiceText.length) return;

      // Prevent default to avoid double input
      e.preventDefault();

      // Get the expected character
      const expectedChar = practiceText[currentIndex];
      const typedChar = e.key;

      // Track key for virtual keyboard
      setLastKeyCode(e.code);
      setTimeout(() => setLastKeyCode(null), 150);

      // Check if correct
      const isCorrect = typedChar === expectedChar;

      // Increment total keystrokes
      setTotalKeystrokes(prev => prev + 1);

      // Track errors (including ones that will be corrected)
      if (!isCorrect) {
        setTotalErrors(prev => prev + 1);
        // Mark this character index as having had an error
        setCharacterErrorHistory(prev => new Set(prev).add(currentIndex));
      }

      // Play audio feedback
      if (isCorrect) {
        playClickSound();
      } else {
        playErrorBeep();
      }

      // Send telemetry for keydown event with error flag
      if (sessionId) {
        addEvent('DOWN', e.code, !isCorrect);
      }

      // Update character state
      // If correct and this character previously had an error, mark as 'corrected' instead of 'correct'
      let newState;
      if (isCorrect) {
        newState = characterErrorHistory.has(currentIndex) ? 'corrected' : 'correct';
      } else {
        newState = 'error';
      }

      setCharacterStates(prev => ({
        ...prev,
        [currentIndex]: newState,
      }));

      // Move to next character if correct
      if (isCorrect) {
        setCurrentIndex(prev => prev + 1);
      }
    };

    const handleKeyUp = (e) => {
      if (!startTime || !practiceText) return;

      // Don't process keystrokes if session is complete
      if (currentIndex >= practiceText.length) return;
      if (sessionMode === 'timed' && timeRemaining !== null && timeRemaining <= 0) return;

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Send telemetry for keyup event
      // For error tracking, we check if the current position has an error state
      if (sessionId && (e.key.length === 1 || e.key === 'Backspace')) {
        const isError = characterStates[currentIndex] === 'error' || characterStates[currentIndex - 1] === 'error';
        addEvent('UP', e.code, isError);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startTime, currentIndex, practiceText, firstKeystrokeTime, sessionId, addEvent, characterStates, sessionMode, timeRemaining]);

  // Check if test is complete
  // Check if session is complete (either all text typed or time ran out)
  const isComplete = practiceText && (
    currentIndex >= practiceText.length || // All text typed (word count mode)
    (sessionMode === 'timed' && timeRemaining !== null && timeRemaining <= 0) // Time's up (timed mode)
  );
  const stats = calculateStats();

  // Handle theme changes and save to backend
  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);

    if (isAuthenticated && user) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/api/users/profile`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            email: user.email,
            settings: {
              ...user.settings,
              theme: newTheme
            }
          })
        });
      } catch (error) {
        console.error('Failed to save theme:', error);
      }
    }
  };

  // Auto-end timed sessions when time runs out
  useEffect(() => {
    if (isComplete && sessionMode === 'timed' && timeRemaining === 0 && startTime && !isAuthenticated) {
      // For non-authenticated users, just show results
      // For authenticated users, the completion UI will show save/abort buttons
    }
  }, [isComplete, sessionMode, timeRemaining, startTime, isAuthenticated]);

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
        onThemeChange={handleThemeChange}
      />

      {/* Auth Page */}
      {currentPage === 'auth' && !isAuthenticated && (
        <AuthPage />
      )}

      {/* Profile Page */}
      {currentPage === 'profile' && isAuthenticated && (
        <ProfileSettings onNavigate={setCurrentPage} />
      )}

      {/* Word Sets Manager */}
      {currentPage === 'word-sets' && isAuthenticated && (
        <WordSetManager onNavigate={setCurrentPage} />
      )}

      {/* Home Page / Typing Test */}
      {currentPage === 'home' && (
        <main className="flex-1 container mx-auto p-4 md:p-8 relative z-10">
          {/* Welcome Section */}
          {!startTime && (
            <div className="max-w-5xl mx-auto text-center py-16 md:py-4">

              
              <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight" style={{ color: 'var(--text-main)' }}>
                Master Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-hover)]">Flow</span>
              </h1>
              
              <p className="text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                FingerFlow captures every biomechanical nuance of your typing.
                Analyze dwell times, flight latency, and finger efficiency in real-time.
              </p>

              {/* Session Configuration */}
              <div className="mb-12 max-w-4xl mx-auto">
                {/* Mode Toggle and Preset Options */}
                <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
                  {/* Mode Toggle */}
                  <div className="p-1 rounded-xl glass-panel flex gap-1">
                    <button
                      onClick={() => setSessionMode('wordcount')}
                      className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                        sessionMode === 'wordcount' ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'hover:bg-[var(--bg-input)]'
                      }`}
                      style={sessionMode !== 'wordcount' ? { color: 'var(--text-dim)' } : {}}
                    >
                      Word Count
                    </button>
                    <button
                      onClick={() => setSessionMode('timed')}
                      className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                        sessionMode === 'timed' ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'hover:bg-[var(--bg-input)]'
                      }`}
                      style={sessionMode !== 'timed' ? { color: 'var(--text-dim)' } : {}}
                    >
                      Timed
                    </button>
                  </div>

                  {/* Word Count Mode Options */}
                  {sessionMode === 'wordcount' && (
                    <>
                      {[20, 40, 120].map(count => (
                        <button
                          key={count}
                          onClick={() => setWordCount(count)}
                          className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                            wordCount === count ? 'bg-[var(--accent-glow)] border-2 border-[var(--accent-primary)]' : 'glass-panel hover:bg-[var(--bg-input)]'
                          }`}
                          style={{ color: 'var(--text-main)' }}
                        >
                          {count}
                        </button>
                      ))}
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          min="1"
                          max="500"
                          placeholder="..."
                          value={sessionMode === 'wordcount' && ![20, 40, 120].includes(wordCount) ? wordCount : customInput}
                          onChange={(e) => {
                            const value = e.target.value;
                            setCustomInput(value);
                            // Update wordCount immediately if valid (for spinner arrows)
                            const numValue = parseInt(value);
                            if (!isNaN(numValue) && numValue >= 1 && numValue <= 500) {
                              setWordCount(numValue);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const value = parseInt(customInput);
                              if (value >= 1 && value <= 500) {
                                setWordCount(value);
                                setCustomInput('');
                                e.target.blur();
                              }
                            }
                          }}
                          onBlur={() => {
                            const value = parseInt(customInput);
                            if (value >= 1 && value <= 500) {
                              setWordCount(value);
                            }
                            setCustomInput('');
                          }}
                          className="px-3 py-2.5 rounded-lg font-medium w-20 text-center glass-panel"
                          style={{
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-main)',
                            border: '1px solid var(--key-border)',
                            MozAppearance: 'textfield',
                            WebkitAppearance: 'none',
                            appearance: 'none'
                          }}
                        />
                        <span className="text-sm" style={{ color: 'var(--text-dim)' }}>words</span>
                      </div>
                    </>
                  )}

                  {/* Timed Mode Options */}
                  {sessionMode === 'timed' && (
                    <>
                      {[15, 30, 60].map(duration => (
                        <button
                          key={duration}
                          onClick={() => setTimedDuration(duration)}
                          className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                            timedDuration === duration ? 'bg-[var(--accent-glow)] border-2 border-[var(--accent-primary)]' : 'glass-panel hover:bg-[var(--bg-input)]'
                          }`}
                          style={{ color: 'var(--text-main)' }}
                        >
                          {duration}s
                        </button>
                      ))}
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          min="1"
                          max="300"
                          placeholder="..."
                          value={sessionMode === 'timed' && ![15, 30, 60].includes(timedDuration) ? timedDuration : customInput}
                          onChange={(e) => {
                            const value = e.target.value;
                            setCustomInput(value);
                            // Update timedDuration immediately if valid (for spinner arrows)
                            const numValue = parseInt(value);
                            if (!isNaN(numValue) && numValue >= 1 && numValue <= 300) {
                              setTimedDuration(numValue);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const value = parseInt(customInput);
                              if (value >= 1 && value <= 300) {
                                setTimedDuration(value);
                                setCustomInput('');
                                e.target.blur();
                              }
                            }
                          }}
                          onBlur={() => {
                            const value = parseInt(customInput);
                            if (value >= 1 && value <= 300) {
                              setTimedDuration(value);
                            }
                            setCustomInput('');
                          }}
                          className="px-3 py-2.5 rounded-lg font-medium w-20 text-center glass-panel"
                          style={{
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-main)',
                            border: '1px solid var(--key-border)',
                            MozAppearance: 'textfield',
                            WebkitAppearance: 'none',
                            appearance: 'none'
                          }}
                        />
                        <span className="text-sm" style={{ color: 'var(--text-dim)' }}>seconds</span>
                      </div>
                    </>
                  )}
                </div>

                {/* View Mode and Word Set Selector Row */}
                <div className="flex flex-wrap items-center justify-center gap-6 mb-6">
                  {/* View Mode Selector */}
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

                  {/* Word Set Selector */}
                  {wordSets.length > 0 && (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedWordSetId || ''}
                        onChange={(e) => setSelectedWordSetId(parseInt(e.target.value))}
                        className="px-4 py-2.5 rounded-lg font-medium glass-panel"
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          color: 'var(--text-main)',
                          border: '2px solid var(--key-border)',
                          maxWidth: '250px'
                        }}
                      >
                        {wordSets.map(set => (
                          <option key={set.id} value={set.id}>
                            {set.name} ({set.words?.length || 0} words)
                          </option>
                        ))}
                      </select>
                      {isAuthenticated && (
                        <button
                          onClick={() => setCurrentPage('word-sets')}
                          className="px-4 py-2.5 rounded-lg font-medium glass-panel hover:bg-[var(--bg-input)] transition-colors"
                          style={{
                            color: 'var(--text-main)',
                            border: '1px solid var(--key-border)'
                          }}
                        >
                          Manage
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

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

              {/* Session History for Authenticated Users */}
              {isAuthenticated && (
                <div className="mt-16 space-y-16">
                  <SessionHistory />
                  <SessionProgressChart />
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
                  onClick={abortSession}
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
                  onClick={saveSession}
                  className="px-10 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 shadow-[var(--shadow-glow)]"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                  }}
                >
                  {isAuthenticated ? 'Save Session' : 'Start New Session'}
                </button>
                <button
                  onClick={abortSession}
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
                    onClick={() => setCurrentPage('auth')}
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
