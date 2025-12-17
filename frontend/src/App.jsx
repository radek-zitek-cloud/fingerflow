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
import { WelcomeSection } from './components/typing/WelcomeSection';
import { TypingTestUI } from './components/typing/TypingTestUI';
import { SessionDetail } from './components/sessions/SessionDetail';
import { MultiSessionAnalysis } from './components/sessions/MultiSessionAnalysis';
import { useTelemetry } from './hooks/useTelemetry';
import { sessionsAPI, wordSetsAPI } from './services/api';
import { playClickSound, playErrorBeep, resumeAudioContext } from './utils/audioFeedback';
import { generateRandomText } from './utils/textGenerator';

function App() {
  const { isAuthenticated, loading, checkAuth, user } = useAuth();
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'auth', 'profile', 'session-detail'
  const [selectedSessionId, setSelectedSessionId] = useState(null); // For session detail page
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

  // Session configuration
  const [sessionMode, setSessionMode] = useState('wordcount'); // 'timed' or 'wordcount'
  const [timedDuration, setTimedDuration] = useState(30); // seconds
  const [wordCount, setWordCount] = useState(20); // number of words
  const [customInput, setCustomInput] = useState(''); // for custom durations/counts
  const [timeRemaining, setTimeRemaining] = useState(null); // for timed mode countdown
  const [selectedWordSetId, setSelectedWordSetId] = useState(null); // selected word set for text generation
  const [wordSets, setWordSets] = useState([]); // available word sets

  // Initialize telemetry
  // Always use sessionStartTime as reference for consistent offsets
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

        // Validate practice text before saving
        if (!practiceText || practiceText.length === 0) {
          console.error('Invalid practice text when saving session');
          return;
        }

        await sessionsAPI.end(sessionId, {
          start_time: firstKeystrokeTime,
          end_time: lastKeystrokeTime,
          wpm: stats.productiveWPM,
          mechanical_wpm: stats.mechanicalWPM,
          accuracy: stats.accuracy,
          total_characters: practiceText.length,
          correct_characters: stats.correctCount,
          incorrect_characters: stats.errorCount,
          total_keystrokes: totalKeystrokes,
          practice_text: practiceText,
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
    // Flush any remaining telemetry before deleting session
    // This ensures partial session data is preserved for analytics
    if (sessionId) {
      try {
        await flush();
      } catch (error) {
        // Ignore flush errors on abort (session might already be gone)
        console.warn('Telemetry flush failed during abort:', error);
      }
    }

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

  // Navigate to session detail page
  const handleNavigateToSessionDetail = (sessionId) => {
    setSelectedSessionId(sessionId);
    setCurrentPage('session-detail');
  };

  // Navigate to multi-session analysis page
  const handleNavigateToMultiSession = () => {
    setCurrentPage('multi-session-analysis');
  };

  // Calculate WPM and accuracy (for display during typing)
  const calculateStats = () => {
    // Count characters by state
    const correctOnFirstAttempt = Object.values(characterStates).filter(s => s === 'correct').length;
    const correctedAfterErrors = Object.values(characterStates).filter(s => s === 'corrected').length;
    const totalCharactersTyped = correctOnFirstAttempt + correctedAfterErrors;

    // NEW: Accuracy based on unique character positions with errors
    // Repeated typos at same position count as only one error
    const accuracy = totalCharactersTyped > 0
      ? (correctOnFirstAttempt / totalCharactersTyped) * 100
      : 100;

    // Use time from first to current keystroke
    const elapsedMinutes = firstKeystrokeTime ? (Date.now() - firstKeystrokeTime) / 60000 : 0;

    // Productive WPM: correct and corrected characters
    const productiveWPM = elapsedMinutes > 0 ? (totalCharactersTyped / 5) / elapsedMinutes : 0;

    // Mechanical WPM: all keystrokes
    const mechanicalWPM = elapsedMinutes > 0 ? (totalKeystrokes / 5) / elapsedMinutes : 0;

    return {
      wpm: Math.round(productiveWPM),
      mechanicalWPM: Math.round(mechanicalWPM),
      accuracy: Math.round(accuracy),
      correctCount: totalCharactersTyped,
      errorCount: characterErrorHistory.size // Unique positions with errors
    };
  };

  // Calculate final stats (for session end)
  const calculateFinalStats = () => {
    // Count characters by state
    const correctOnFirstAttempt = Object.values(characterStates).filter(s => s === 'correct').length;
    const correctedAfterErrors = Object.values(characterStates).filter(s => s === 'corrected').length;
    const totalCharactersTyped = correctOnFirstAttempt + correctedAfterErrors;

    // NEW: Accuracy based on unique character positions with errors
    // Repeated typos at same position count as only one error
    const accuracy = totalCharactersTyped > 0
      ? (correctOnFirstAttempt / totalCharactersTyped) * 100
      : 100;

    // Use time from first to last keystroke
    const elapsedMinutes = (firstKeystrokeTime && lastKeystrokeTime)
      ? (lastKeystrokeTime - firstKeystrokeTime) / 60000
      : 0;

    // Productive WPM: correct and corrected characters
    const productiveWPM = elapsedMinutes > 0 ? (totalCharactersTyped / 5) / elapsedMinutes : 0;

    // Mechanical WPM: all keystrokes
    const mechanicalWPM = elapsedMinutes > 0 ? (totalKeystrokes / 5) / elapsedMinutes : 0;

    return {
      productiveWPM,
      mechanicalWPM,
      accuracy,
      correctCount: totalCharactersTyped,
      errorCount: characterErrorHistory.size, // Unique positions with errors
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

      // Handle Escape key to abort session
      if (e.key === 'Escape') {
        e.preventDefault();
        abortSession();
        return;
      }

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
        // Pass explicit timestamp for first keystroke to ensure correct offset
        if (sessionId) {
          addEvent('DOWN', e.code, false, now);
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
      // Pass explicit timestamp for first keystroke to ensure correct offset
      if (sessionId) {
        addEvent('DOWN', e.code, !isCorrect, now);
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

      const now = Date.now();

      // Send telemetry for keyup event
      // For error tracking, we check if the current position has an error state
      if (sessionId && (e.key.length === 1 || e.key === 'Backspace')) {
        const isError = characterStates[currentIndex] === 'error' || characterStates[currentIndex - 1] === 'error';
        addEvent('UP', e.code, isError, now);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startTime, currentIndex, practiceText, firstKeystrokeTime, sessionId, addEvent, characterStates, sessionMode, timeRemaining, abortSession]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Enter key: Start session when on homepage
      if (e.key === 'Enter' && !startTime && currentPage === 'home') {
        e.preventDefault();
        startSession();
      }

      // Esc key: Abort session when typing
      if (e.key === 'Escape' && startTime) {
        e.preventDefault();
        abortSession();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [startTime, currentPage, startSession, abortSession]);

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

      {/* Session Detail Page */}
      {currentPage === 'session-detail' && isAuthenticated && selectedSessionId && (
        <SessionDetail sessionId={selectedSessionId} onNavigate={setCurrentPage} />
      )}

      {/* Multi-Session Analysis Page */}
      {currentPage === 'multi-session-analysis' && isAuthenticated && (
        <main className="flex-1 container mx-auto p-4 md:p-8 relative z-10">
          <MultiSessionAnalysis onBack={() => setCurrentPage('home')} />
        </main>
      )}

      {/* Home Page / Typing Test */}
      {currentPage === 'home' && (
        <main className="flex-1 container mx-auto p-4 md:p-8 relative z-10">
          {/* Welcome Section */}
          {!startTime && (
            <WelcomeSection
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
              onManageWordSets={() => setCurrentPage('word-sets')}
              onStartSession={startSession}
              onNavigateToAuth={() => setCurrentPage('auth')}
              onNavigateToSessionDetail={handleNavigateToSessionDetail}
              onNavigateToMultiSession={handleNavigateToMultiSession}
            />
          )}

          {/* Typing Test UI */}
          {startTime && (
            <TypingTestUI
              isComplete={isComplete}
              viewMode={viewMode}
              practiceText={practiceText}
              currentIndex={currentIndex}
              characterStates={characterStates}
              lastKeyCode={lastKeyCode}
              stats={stats}
              sessionMode={sessionMode}
              timedDuration={timedDuration}
              timeRemaining={timeRemaining}
              totalKeystrokes={totalKeystrokes}
              firstKeystrokeTime={firstKeystrokeTime}
              lastKeystrokeTime={lastKeystrokeTime}
              onAbort={abortSession}
              onSave={saveSession}
              onNavigateToAuth={() => setCurrentPage('auth')}
              isAuthenticated={isAuthenticated}
            />
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
