/**
 * Authentication Context
 *
 * Provides global authentication state and functions throughout the app.
 * Manages user session, login, logout, and registration.
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, setAuthToken, clearAuthToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
    } catch (err) {
      // Not authenticated or token expired
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    try {
      setError(null);
      const response = await authAPI.login(email, password);
      await checkAuth(); // Fetch user data after login
      return { success: true };
    } catch (err) {
      setError(err.message || 'Login failed');
      return { success: false, error: err.message };
    }
  }

  async function register(email, password) {
    try {
      setError(null);
      const response = await authAPI.register(email, password);
      await checkAuth(); // Fetch user data after registration
      return { success: true };
    } catch (err) {
      setError(err.message || 'Registration failed');
      return { success: false, error: err.message };
    }
  }

  function logout() {
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
