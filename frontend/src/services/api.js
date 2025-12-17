/**
 * API Service - Centralized HTTP client for backend communication
 *
 * All API requests go through this module for consistent error handling,
 * authentication, and logging.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Token refresh state management
let isRefreshing = false;
let refreshSubscribers = [];

/**
 * Add callback to queue for execution after token refresh
 */
function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback);
}

/**
 * Notify all queued callbacks that token has been refreshed
 */
function onTokenRefreshed(newToken) {
  refreshSubscribers.forEach(callback => callback(newToken));
  refreshSubscribers = [];
}

/**
 * Decode JWT token to extract payload (without verification)
 * This is safe because we only use it for expiration checking
 * Server still validates the token on every request
 */
function decodeJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if token is expired or will expire soon
 * @param {number} bufferMinutes - Minutes before expiration to consider expired
 */
export function isTokenExpiringSoon(bufferMinutes = 5) {
  const token = getAuthToken();
  if (!token) return true;

  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;

  const expirationTime = payload.exp * 1000; // Convert to milliseconds
  const bufferTime = bufferMinutes * 60 * 1000;
  const now = Date.now();

  return now >= expirationTime - bufferTime;
}

/**
 * Get authentication token from localStorage
 */
function getAuthToken() {
  return localStorage.getItem('auth_token');
}

/**
 * Set authentication token in localStorage
 */
export function setAuthToken(token) {
  localStorage.setItem('auth_token', token);

  // Store token expiration time for easier checking
  const payload = decodeJWT(token);
  if (payload && payload.exp) {
    localStorage.setItem('token_expiration', payload.exp.toString());
  }
}

/**
 * Remove authentication token from localStorage
 */
export function clearAuthToken() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('token_expiration');
}

/**
 * Generic fetch wrapper with error handling and auth injection
 * Automatically refreshes token on 401 errors and retries the request
 */
async function fetchWithAuth(url, options = {}, retryCount = 0) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized - try to refresh token and retry
  if (response.status === 401 && retryCount === 0 && url !== '/auth/refresh') {
    try {
      // If already refreshing, wait for it to complete
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(newToken => {
            // Retry original request with new token
            fetchWithAuth(url, options, retryCount + 1)
              .then(resolve)
              .catch(reject);
          });
        });
      }

      // Start refresh process
      isRefreshing = true;
      const refreshData = await authAPI.refreshToken();
      isRefreshing = false;

      // Notify all waiting requests
      onTokenRefreshed(refreshData.access_token);

      // Retry original request with new token
      return fetchWithAuth(url, options, retryCount + 1);
    } catch (refreshError) {
      isRefreshing = false;
      // Refresh failed - clear tokens and force re-login
      clearAuthToken();
      localStorage.removeItem('refresh_token');
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    // Handle FastAPI validation errors (array of errors)
    if (error.detail && Array.isArray(error.detail)) {
      const errorMessages = error.detail.map(e => `${e.loc.join('.')}: ${e.msg}`).join(', ');
      throw new Error(errorMessages);
    }
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Authentication API
 */
export const authAPI = {
  async register(email, password) {
    const data = await fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.access_token) {
      setAuthToken(data.access_token);
    }
    // Store refresh token separately
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    return data;
  },

  async login(email, password) {
    const data = await fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Handle 2FA flow
    if (data.requires_2fa) {
      return data; // Return temp_token for 2FA verification
    }

    if (data.access_token) {
      setAuthToken(data.access_token);
    }
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    return data;
  },

  async verify2FA(tempToken, code) {
    const data = await fetchWithAuth('/auth/2fa-verify', {
      method: 'POST',
      body: JSON.stringify({ temp_token: tempToken, code }),
    });
    setAuthToken(data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    return data;
  },

  async getCurrentUser() {
    return fetchWithAuth('/auth/me');
  },

  async verifyEmail(token) {
    return fetchWithAuth('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  async resendVerification(email) {
    return fetchWithAuth('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const data = await fetchWithAuth('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    setAuthToken(data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return data;
  },

  async revokeToken(refreshToken) {
    return fetchWithAuth('/auth/revoke', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  },

  async listSessions() {
    return fetchWithAuth('/auth/sessions');
  },

  async googleLogin() {
    return fetchWithAuth('/auth/google/login');
  },

  logout() {
    clearAuthToken();
    localStorage.removeItem('refresh_token');
  },
};

/**
 * Sessions API
 */
export const sessionsAPI = {
  async create(startTime) {
    return fetchWithAuth('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ start_time: startTime }),
    });
  },

  async get(sessionId) {
    return fetchWithAuth(`/api/sessions/${sessionId}`);
  },

  async list(limit = 20, offset = 0) {
    return fetchWithAuth(`/api/sessions?limit=${limit}&offset=${offset}`);
  },

  async end(sessionId, sessionEndData) {
    return fetchWithAuth(`/api/sessions/${sessionId}/end`, {
      method: 'PATCH',
      body: JSON.stringify(sessionEndData),
    });
  },

  async delete(sessionId) {
    return fetchWithAuth(`/api/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },

  async getTelemetry(sessionId) {
    return fetchWithAuth(`/api/sessions/${sessionId}/telemetry`);
  },

  async getDetailedTelemetry(sessionId) {
    return fetchWithAuth(`/api/sessions/${sessionId}/telemetry/detailed`);
  },

  async getByDateRange(startDate, endDate) {
    return fetchWithAuth(`/api/sessions/range?start_date=${startDate}&end_date=${endDate}`);
  },

  async getCombinedTelemetry(startDate, endDate) {
    return fetchWithAuth(`/api/sessions/range/telemetry?start_date=${startDate}&end_date=${endDate}`);
  },
};

/**
 * Telemetry API
 */
export const telemetryAPI = {
  async ingest(sessionId, events) {
    return fetchWithAuth(`/api/sessions/${sessionId}/telemetry`, {
      method: 'POST',
      body: JSON.stringify({ events }),
    });
  },
};

/**
 * System API (Logging Proxy)
 */
export const systemAPI = {
  async log(level, message, context = {}) {
    // Fire-and-forget logging (don't await)
    fetchWithAuth('/api/system/logs', {
      method: 'POST',
      body: JSON.stringify({
        level,
        message,
        context,
        timestamp: Date.now(),
      }),
    }).catch(err => {
      console.error('Failed to send log to server:', err);
    });
  },
};

/**
 * Users API (Profile and Password Management)
 */
export const usersAPI = {
  async updateProfile(email) {
    return fetchWithAuth('/api/users/profile', {
      method: 'PATCH',
      body: JSON.stringify({ email }),
    });
  },

  async changePassword(currentPassword, newPassword) {
    return fetchWithAuth('/api/users/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  },

  async forgotPassword(email) {
    return fetchWithAuth('/api/users/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token, newPassword) {
    return fetchWithAuth('/api/users/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  },
};

/**
 * Two-Factor Authentication API
 */
export const twoFactorAPI = {
  async setup() {
    return fetchWithAuth('/api/2fa/setup', {
      method: 'POST',
    });
  },

  async verifySetup(code) {
    return fetchWithAuth('/api/2fa/verify-setup', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  async disable(code, password) {
    return fetchWithAuth('/api/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ code, password }),
    });
  },

  async regenerateBackupCodes(code) {
    return fetchWithAuth('/api/2fa/regenerate-backup-codes', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  async getStatus() {
    return fetchWithAuth('/api/2fa/status');
  },
};

/**
 * Word Sets API
 */
export const wordSetsAPI = {
  async list(skip = 0, limit = 100) {
    return fetchWithAuth(`/api/word-sets?skip=${skip}&limit=${limit}`);
  },

  async get(setId) {
    return fetchWithAuth(`/api/word-sets/${setId}`);
  },

  async create(name, description, words) {
    return fetchWithAuth('/api/word-sets/', {
      method: 'POST',
      body: JSON.stringify({ name, description, words }),
    });
  },

  async update(setId, name, description, words) {
    return fetchWithAuth(`/api/word-sets/${setId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description, words }),
    });
  },

  async delete(setId) {
    return fetchWithAuth(`/api/word-sets/${setId}`, {
      method: 'DELETE',
    });
  },
};

// Export convenience functions for components
export const verifyEmail = (token) => authAPI.verifyEmail(token);
export const resendVerificationEmail = (email) => authAPI.resendVerification(email);
export const resetPassword = (token, newPassword) => usersAPI.resetPassword(token, newPassword);
export const forgotPassword = (email) => usersAPI.forgotPassword(email);
