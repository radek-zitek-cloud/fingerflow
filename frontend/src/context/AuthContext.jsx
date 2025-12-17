/**
 * Authentication Context
 *
 * Provides global authentication state and functions throughout the app.
 * Manages user session, login, logout, and registration.
 * Automatically refreshes JWT tokens before expiration to maintain long-term sessions.
 */

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authAPI, setAuthToken, clearAuthToken, isTokenExpiringSoon } from '../services/api';

const AuthContext = createContext(null);

// Check token expiration every 1 minute
const TOKEN_CHECK_INTERVAL = 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const refreshTimerRef = useRef(null);

  // Check if user is already authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
      // Start background token refresh timer when authenticated
      startTokenRefreshTimer();
    } catch (err) {
      console.error('checkAuth failed:', err);
      // Not authenticated or token expired
      setUser(null);
      clearAuthToken();
      stopTokenRefreshTimer();
    } finally {
      setLoading(false);
    }
  }

  /**
   * Proactively refresh token before it expires
   */
  async function refreshTokenIfNeeded() {
    if (!user) return;

    try {
      if (isTokenExpiringSoon(5)) {
        console.log('Token expiring soon, refreshing proactively...');
        await authAPI.refreshToken();
        console.log('Token refreshed successfully');
      }
    } catch (err) {
      console.error('Token refresh failed:', err);
      // If refresh fails, log the user out
      logout();
    }
  }

  /**
   * Start background timer to check token expiration
   */
  function startTokenRefreshTimer() {
    // Clear any existing timer
    stopTokenRefreshTimer();

    // Check immediately
    refreshTokenIfNeeded();

    // Then check periodically
    refreshTimerRef.current = setInterval(() => {
      refreshTokenIfNeeded();
    }, TOKEN_CHECK_INTERVAL);
  }

  /**
   * Stop background timer
   */
  function stopTokenRefreshTimer() {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      stopTokenRefreshTimer();
    };
  }, []);

  async function login(email, password) {
    try {
      setError(null);
      const response = await authAPI.login(email, password);
      await checkAuth(); // Fetch user data and start refresh timer
      return { success: true };
    } catch (err) {
      setError(err.message || 'Login failed');
      return { success: false, error: err.message };
    }
  }

  async function register(email, password) {
    try {
      clearAuthToken();
      setError(null);
      const response = await authAPI.register(email, password);
      await checkAuth(); // Fetch user data and start refresh timer
      return { success: true };
    } catch (err) {
      setError(err.message || 'Registration failed');
      return { success: false, error: err.message };
    }
  }

  function logout() {
    stopTokenRefreshTimer(); // Stop background refresh
    authAPI.logout();
    setUser(null);
    setError(null);
  }

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
