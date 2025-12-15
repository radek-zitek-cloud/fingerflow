/**
 * Two-Factor Authentication Verification Component
 *
 * Used during login when 2FA is enabled.
 * Prompts user to enter TOTP code or backup code.
 */
import { useState } from 'react';
import { authAPI } from '../../services/api';
import { validate2FACode } from '../../utils/validation';

export default function TwoFactorVerify({ tempToken, onSuccess, onCancel }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showBackupCodeInfo, setShowBackupCodeInfo] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setValidationError('');

    // Validate code format
    const codeError = validate2FACode(code);
    if (codeError) {
      setValidationError(codeError);
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.verify2FA(tempToken, code);

      if (response.access_token) {
        // Success! Call onSuccess callback
        if (onSuccess) {
          onSuccess(response);
        }
      }
    } catch (err) {
      console.error('2FA verification failed:', err);
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e) => {
    // Allow only digits and uppercase letters (for backup codes)
    const value = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '');
    setCode(value);
    setValidationError('');
    setError('');
  };

  return (
    <div className="two-factor-verify">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Two-Factor Authentication</h2>
        <p className="text-gray-600">
          Enter the verification code from your authenticator app
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="2fa-code" className="form-label">
            Verification Code
          </label>
          <input
            type="text"
            id="2fa-code"
            value={code}
            onChange={handleCodeChange}
            placeholder="000000"
            maxLength={8}
            className={`form-input text-center text-2xl tracking-widest ${
              validationError || error ? 'border-red-500' : ''
            }`}
            required
            disabled={loading}
            autoFocus
          />
          {validationError && (
            <p className="form-error">{validationError}</p>
          )}
          <p className="form-hint text-center">
            Enter 6-digit code or 8-character backup code
          </p>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !code}
          className="btn-primary w-full"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <span className="spinner mr-2"></span>
              Verifying...
            </span>
          ) : (
            'Verify'
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary w-full"
          >
            Cancel
          </button>
        )}
      </form>

      {/* Backup code information */}
      <div className="mt-6 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={() => setShowBackupCodeInfo(!showBackupCodeInfo)}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mx-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {showBackupCodeInfo ? 'Hide' : 'Lost your device?'}
        </button>

        {showBackupCodeInfo && (
          <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Using Backup Codes</h3>
            <p className="text-sm text-gray-600 mb-2">
              If you don't have access to your authenticator app, you can use one of
              your backup codes instead:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
              <li>Enter your 8-character backup code above</li>
              <li>Each backup code can only be used once</li>
              <li>Generate new codes from your security settings after logging in</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
