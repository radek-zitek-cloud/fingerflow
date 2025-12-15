/**
 * Google OAuth Callback Handler
 *
 * Handles the callback from Google OAuth2 flow and exchanges
 * the authorization code for JWT tokens.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';

export function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Google authentication was cancelled or failed');
      setTimeout(() => navigate('/'), 3000);
      return;
    }

    if (!code) {
      setError('No authorization code received from Google');
      setTimeout(() => navigate('/'), 3000);
      return;
    }

    // Exchange code for tokens
    handleGoogleCallback(code);
  }, [searchParams, navigate]);

  async function handleGoogleCallback(code) {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_BASE_URL}/auth/google/callback?code=${code}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Authentication failed' }));
        throw new Error(errorData.detail || 'Failed to authenticate with Google');
      }

      const data = await response.json();

      // Store tokens
      if (data.access_token) {
        localStorage.setItem('auth_token', data.access_token);
      }
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }

      // Redirect to home
      navigate('/', { replace: true });
      window.location.reload(); // Reload to update auth state
    } catch (err) {
      console.error('Google callback error:', err);
      setError(err.message || 'Failed to complete Google authentication');
      setTimeout(() => navigate('/'), 3000);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-app)' }}>
        <div className="max-w-md p-8 bg-[var(--bg-panel)] rounded-lg shadow-xl">
          <div className="flex items-center gap-3 text-red-500 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-xl font-bold">Authentication Error</h2>
          </div>
          <p className="text-red-500 mb-4">{error}</p>
          <p style={{ color: 'var(--text-dim)' }} className="text-sm">
            Redirecting to login page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-app)' }}>
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: 'var(--accent-primary)' }} />
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-main)' }}>
          Completing Google Sign In
        </h2>
        <p style={{ color: 'var(--text-dim)' }}>
          Please wait while we authenticate your account...
        </p>
      </div>
    </div>
  );
}
