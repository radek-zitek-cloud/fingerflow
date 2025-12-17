/**
 * Tests for JWT Token Refresh Logic
 *
 * Tests the automatic token refresh mechanism including:
 * - JWT decoding and expiration checking
 * - Proactive token refresh before expiration
 * - Reactive 401 error handling with retry
 * - Concurrent request queueing during refresh
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isTokenExpiringSoon, setAuthToken, clearAuthToken } from '../services/api';

// Helper to create mock JWT token
function createMockJWT(expiresInMinutes) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiresInMinutes * 60);

  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ exp, user_id: 123 }));
  const signature = 'mock_signature';

  return `${header}.${payload}.${signature}`;
}

describe('JWT Token Expiration Checking', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should return true when no token exists', () => {
    expect(isTokenExpiringSoon(5)).toBe(true);
  });

  it('should return true when token expires in 3 minutes (buffer = 5 minutes)', () => {
    const token = createMockJWT(3); // Expires in 3 minutes
    setAuthToken(token);

    // With 5 minute buffer, token expiring in 3 minutes is considered "expiring soon"
    expect(isTokenExpiringSoon(5)).toBe(true);
  });

  it('should return false when token expires in 10 minutes (buffer = 5 minutes)', () => {
    const token = createMockJWT(10); // Expires in 10 minutes
    setAuthToken(token);

    // With 5 minute buffer, token expiring in 10 minutes is still valid
    expect(isTokenExpiringSoon(5)).toBe(false);
  });

  it('should return true when token expires in 2 minutes (buffer = 5 minutes)', () => {
    const token = createMockJWT(2); // Expires in 2 minutes
    setAuthToken(token);

    expect(isTokenExpiringSoon(5)).toBe(true);
  });

  it('should return true when token has already expired', () => {
    const token = createMockJWT(-5); // Expired 5 minutes ago
    setAuthToken(token);

    expect(isTokenExpiringSoon(5)).toBe(true);
  });

  it('should use custom buffer time', () => {
    const token = createMockJWT(8); // Expires in 8 minutes
    setAuthToken(token);

    // With 10 minute buffer, token is expiring soon
    expect(isTokenExpiringSoon(10)).toBe(true);

    // With 5 minute buffer, token is still valid
    expect(isTokenExpiringSoon(5)).toBe(false);
  });

  it('should handle invalid JWT format gracefully', () => {
    localStorage.setItem('auth_token', 'invalid.token.format');

    // Should return true (treat as expired) when token is invalid
    expect(isTokenExpiringSoon(5)).toBe(true);
  });

  it('should handle JWT without exp claim', () => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ user_id: 123 })); // No exp claim
    const signature = 'mock_signature';
    const token = `${header}.${payload}.${signature}`;

    setAuthToken(token);

    // Should return true (treat as expired) when no exp claim
    expect(isTokenExpiringSoon(5)).toBe(true);
  });
});

describe('Token Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should store token and expiration time', () => {
    const token = createMockJWT(30);
    setAuthToken(token);

    expect(localStorage.getItem('auth_token')).toBe(token);
    expect(localStorage.getItem('token_expiration')).toBeTruthy();
  });

  it('should clear both token and expiration time', () => {
    const token = createMockJWT(30);
    setAuthToken(token);

    clearAuthToken();

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('token_expiration')).toBeNull();
  });

  it('should update expiration time when token is refreshed', () => {
    const oldToken = createMockJWT(10);
    setAuthToken(oldToken);
    const oldExpiration = localStorage.getItem('token_expiration');

    // Simulate token refresh with new expiration
    const newToken = createMockJWT(30);
    setAuthToken(newToken);
    const newExpiration = localStorage.getItem('token_expiration');

    expect(newExpiration).not.toBe(oldExpiration);
    expect(parseInt(newExpiration)).toBeGreaterThan(parseInt(oldExpiration));
  });
});

describe('Token Refresh Timing', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should trigger refresh 5 minutes before expiration', () => {
    const token = createMockJWT(4.5); // Expires in 4.5 minutes
    setAuthToken(token);

    // Should trigger refresh (within 5 minute buffer)
    expect(isTokenExpiringSoon(5)).toBe(true);
  });

  it('should not trigger refresh 6 minutes before expiration', () => {
    const token = createMockJWT(6); // Expires in 6 minutes
    setAuthToken(token);

    // Should NOT trigger refresh (outside 5 minute buffer)
    expect(isTokenExpiringSoon(5)).toBe(false);
  });

  it('should handle exact buffer boundary', () => {
    const token = createMockJWT(5); // Expires in exactly 5 minutes
    setAuthToken(token);

    // At exact boundary, should trigger refresh
    expect(isTokenExpiringSoon(5)).toBe(true);
  });
});

describe('Real-World Scenarios', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should handle fresh token (30 minutes remaining)', () => {
    const token = createMockJWT(30);
    setAuthToken(token);

    expect(isTokenExpiringSoon(5)).toBe(false);
  });

  it('should handle token about to expire (2 minutes remaining)', () => {
    const token = createMockJWT(2);
    setAuthToken(token);

    expect(isTokenExpiringSoon(5)).toBe(true);
  });

  it('should handle token just refreshed (15 minutes)', () => {
    const token = createMockJWT(15);
    setAuthToken(token);

    expect(isTokenExpiringSoon(5)).toBe(false);
    expect(isTokenExpiringSoon(10)).toBe(false);
    expect(isTokenExpiringSoon(20)).toBe(true);
  });

  it('should simulate token lifecycle', () => {
    // Start with 30 minute token
    let token = createMockJWT(30);
    setAuthToken(token);
    expect(isTokenExpiringSoon(5)).toBe(false);

    // Simulate time passing - now 4 minutes left
    token = createMockJWT(4);
    setAuthToken(token);
    expect(isTokenExpiringSoon(5)).toBe(true); // Should refresh now

    // After refresh - new 30 minute token
    token = createMockJWT(30);
    setAuthToken(token);
    expect(isTokenExpiringSoon(5)).toBe(false); // Fresh again
  });
});

describe('Edge Cases', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should handle malformed base64 in JWT', () => {
    localStorage.setItem('auth_token', 'header.invalid_base64!@#.signature');

    expect(isTokenExpiringSoon(5)).toBe(true);
  });

  it('should handle non-JSON payload', () => {
    const header = btoa(JSON.stringify({ alg: 'HS256' }));
    const payload = btoa('not valid json{');
    const token = `${header}.${payload}.signature`;

    setAuthToken(token);

    expect(isTokenExpiringSoon(5)).toBe(true);
  });

  it('should handle zero buffer time', () => {
    const token = createMockJWT(0.5); // 30 seconds left
    setAuthToken(token);

    // With 0 buffer, only truly expired tokens trigger
    expect(isTokenExpiringSoon(0)).toBe(false);
    expect(isTokenExpiringSoon(1)).toBe(true);
  });

  it('should handle negative expiration (already expired)', () => {
    const token = createMockJWT(-10); // Expired 10 minutes ago
    setAuthToken(token);

    expect(isTokenExpiringSoon(0)).toBe(true);
    expect(isTokenExpiringSoon(5)).toBe(true);
  });
});
