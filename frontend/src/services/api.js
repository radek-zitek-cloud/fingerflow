/**
 * API Service - Centralized HTTP client for backend communication
 *
 * All API requests go through this module for consistent error handling,
 * authentication, and logging.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

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
}

/**
 * Remove authentication token from localStorage
 */
export function clearAuthToken() {
  localStorage.removeItem('auth_token');
}

/**
 * Generic fetch wrapper with error handling and auth injection
 */
async function fetchWithAuth(url, options = {}) {
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

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
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

  async end(sessionId, endTime, wpm, accuracy) {
    return fetchWithAuth(`/api/sessions/${sessionId}/end`, {
      method: 'PATCH',
      body: JSON.stringify({
        end_time: endTime,
        wpm,
        accuracy,
      }),
    });
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
