/**
 * Two-Factor Authentication Management Component
 *
 * Displays 2FA status and provides options to enable/disable 2FA
 * and regenerate backup codes. Used in profile settings.
 */
import { useState, useEffect } from 'react';
import { twoFactorAPI } from '../../services/api';
import TwoFactorSetup from '../auth/TwoFactorSetup';

export default function TwoFactorManage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [showRegenerate, setShowRegenerate] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await twoFactorAPI.getStatus();
      setStatus(data);
    } catch (err) {
      console.error('Failed to load 2FA status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
    loadStatus();
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="spinner-large mb-4"></div>
        <p className="text-gray-600">Loading 2FA settings...</p>
      </div>
    );
  }

  // Show setup modal
  if (showSetup) {
    return (
      <TwoFactorSetup
        onComplete={handleSetupComplete}
        onCancel={() => setShowSetup(false)}
      />
    );
  }

  // Show disable modal
  if (showDisable) {
    return (
      <DisableTwoFactor
        onSuccess={() => {
          setShowDisable(false);
          loadStatus();
        }}
        onCancel={() => setShowDisable(false)}
      />
    );
  }

  // Show regenerate backup codes modal
  if (showRegenerate) {
    return (
      <RegenerateBackupCodes
        onSuccess={() => {
          setShowRegenerate(false);
          loadStatus();
        }}
        onCancel={() => setShowRegenerate(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Two-Factor Authentication</h2>
        <p className="text-gray-600">
          Add an extra layer of security to your account
        </p>
      </div>

      {/* Status Card */}
      <div className={`border-2 rounded-lg p-6 ${
        status?.enabled
          ? 'border-green-300 bg-green-50'
          : 'border-gray-200 bg-gray-50'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              status?.enabled
                ? 'bg-green-200'
                : 'bg-gray-200'
            }`}>
              {status?.enabled ? (
                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">
                {status?.enabled ? '2FA Enabled' : '2FA Disabled'}
              </h3>
              <p className={`text-sm ${
                status?.enabled ? 'text-green-700' : 'text-gray-600'
              }`}>
                {status?.enabled
                  ? 'Your account is protected with two-factor authentication'
                  : 'Enable 2FA to add an extra layer of security to your account'
                }
              </p>
              {status?.enabled && status?.backup_codes_remaining !== undefined && (
                <p className="text-sm text-gray-600 mt-2">
                  <span className="font-semibold">Backup codes remaining:</span>{' '}
                  {status.backup_codes_remaining} / 10
                </p>
              )}
            </div>
          </div>

          {!status?.enabled ? (
            <button
              onClick={() => setShowSetup(true)}
              className="btn-primary whitespace-nowrap"
            >
              Enable 2FA
            </button>
          ) : (
            <button
              onClick={() => setShowDisable(true)}
              className="btn-danger whitespace-nowrap"
            >
              Disable 2FA
            </button>
          )}
        </div>
      </div>

      {/* Additional Options (only shown when 2FA is enabled) */}
      {status?.enabled && (
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold mb-1">Backup Codes</h3>
                <p className="text-sm text-gray-600">
                  Regenerate backup codes if you've used most of them or want new ones
                </p>
              </div>
              <button
                onClick={() => setShowRegenerate(true)}
                className="btn-secondary whitespace-nowrap ml-4"
              >
                Regenerate Codes
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-blue-900 mb-1">How 2FA works</p>
                <p className="text-sm text-blue-800">
                  After entering your password, you'll be prompted for a 6-digit code from your
                  authenticator app. This ensures that only you can access your account, even
                  if someone knows your password.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Disable Two-Factor Authentication Modal
 */
function DisableTwoFactor({ onSuccess, onCancel }) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await twoFactorAPI.disable(code, password);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Failed to disable 2FA:', err);
      setError(err.message || 'Failed to disable 2FA. Please check your code and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Disable Two-Factor Authentication</h2>
        <p className="text-gray-600">
          To disable 2FA, please verify with your 2FA code and password
        </p>
      </div>

      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold text-yellow-900 mb-1">Warning</p>
            <p className="text-sm text-yellow-800">
              Disabling 2FA will make your account less secure. Make sure you understand the risks.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="disable-code" className="form-label">
            2FA Code
          </label>
          <input
            type="text"
            id="disable-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))}
            placeholder="000000"
            maxLength={8}
            className="form-input"
            required
            disabled={loading}
          />
          <p className="form-hint">Enter 6-digit code or 8-character backup code</p>
        </div>

        <div>
          <label htmlFor="disable-password" className="form-label">
            Password
          </label>
          <input
            type="password"
            id="disable-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            required
            disabled={loading}
          />
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="btn-danger flex-1"
          >
            {loading ? 'Disabling...' : 'Disable 2FA'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Regenerate Backup Codes Modal
 */
function RegenerateBackupCodes({ onSuccess, onCancel }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newCodes, setNewCodes] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await twoFactorAPI.regenerateBackupCodes(code);
      setNewCodes(response.backup_codes);
    } catch (err) {
      console.error('Failed to regenerate backup codes:', err);
      setError(err.message || 'Failed to regenerate backup codes.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const codes = newCodes.join('\n');
    navigator.clipboard.writeText(codes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Show new codes
  if (newCodes) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">
            ✓ New Backup Codes Generated
          </h2>
          <p className="text-gray-600">
            Save these codes in a safe place. Your old backup codes are now invalid.
          </p>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">Important:</span> Each code can only be used once. Store them securely.
          </p>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {newCodes.map((codeItem, index) => (
              <div
                key={index}
                className="bg-gray-50 border border-gray-300 rounded px-4 py-2 text-center font-mono text-sm"
              >
                {codeItem}
              </div>
            ))}
          </div>

          <button onClick={handleCopy} className="btn-secondary w-full">
            {copied ? '✓ Copied!' : 'Copy All Codes'}
          </button>
        </div>

        <button onClick={onSuccess} className="btn-primary w-full">
          Done
        </button>
      </div>
    );
  }

  // Show verification form
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Regenerate Backup Codes</h2>
        <p className="text-gray-600">
          Enter your 2FA code to generate new backup codes
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          Regenerating backup codes will invalidate all your current backup codes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="regen-code" className="form-label">
            2FA Code
          </label>
          <input
            type="text"
            id="regen-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
            placeholder="000000"
            maxLength={6}
            className="form-input text-center text-2xl tracking-widest"
            required
            disabled={loading}
            autoFocus
          />
          <p className="form-hint">Enter the 6-digit code from your authenticator app</p>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? 'Generating...' : 'Generate New Codes'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
