/**
 * Two-Factor Authentication Setup Component
 *
 * Displays QR code for authenticator app setup, shows backup codes,
 * and handles verification to enable 2FA.
 */
import { useState } from 'react';
import { twoFactorAPI } from '../../services/api';
import { validate2FACode } from '../../utils/validation';

export default function TwoFactorSetup({ onComplete, onCancel }) {
  const [step, setStep] = useState(1); // 1: init, 2: qr+verify, 3: backup codes
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [setupData, setSetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [validationError, setValidationError] = useState('');
  const [backupCodesCopied, setBackupCodesCopied] = useState(false);

  // Step 1: Initialize 2FA setup
  const handleInitSetup = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await twoFactorAPI.setup();
      setSetupData(data);
      setStep(2);
    } catch (err) {
      console.error('Failed to setup 2FA:', err);
      setError(err.message || 'Failed to generate 2FA secret');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code and enable 2FA
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setValidationError('');

    // Validate code format
    const codeError = validate2FACode(verifyCode);
    if (codeError) {
      setValidationError(codeError);
      return;
    }

    setLoading(true);

    try {
      await twoFactorAPI.verifySetup(verifyCode);
      setStep(3); // Show backup codes
    } catch (err) {
      console.error('Failed to verify 2FA code:', err);
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Copy backup codes to clipboard
  const handleCopyBackupCodes = () => {
    const codes = setupData.backup_codes.join('\n');
    navigator.clipboard.writeText(codes);
    setBackupCodesCopied(true);

    setTimeout(() => {
      setBackupCodesCopied(false);
    }, 2000);
  };

  // Complete setup
  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <div className="two-factor-setup">
      {/* Step 1: Introduction */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Enable Two-Factor Authentication</h2>
            <p className="text-gray-600">
              Add an extra layer of security to your account by requiring a code from your
              authenticator app when you sign in.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">What you'll need:</h3>
            <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm">
              <li>An authenticator app (Google Authenticator, Authy, 1Password, etc.)</li>
              <li>Your phone or device with the app installed</li>
              <li>A few minutes to complete the setup</li>
            </ul>
          </div>

          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleInitSetup}
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Generating...' : 'Continue'}
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Step 2: QR Code and Verification */}
      {step === 2 && setupData && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Scan QR Code</h2>
            <p className="text-gray-600">
              Open your authenticator app and scan this QR code
            </p>
          </div>

          {/* QR Code */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6 text-center">
            <img
              src={setupData.qr_code}
              alt="2FA QR Code"
              className="mx-auto"
              style={{ width: '200px', height: '200px' }}
            />
          </div>

          {/* Manual entry option */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Can't scan the code? Enter this key manually:
            </p>
            <code className="block bg-white border border-gray-300 rounded px-3 py-2 text-center font-mono text-sm">
              {setupData.secret}
            </code>
          </div>

          {/* Verification Form */}
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label htmlFor="verify-code" className="form-label">
                Enter verification code
              </label>
              <input
                type="text"
                id="verify-code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\s/g, ''))}
                placeholder="000000"
                maxLength={6}
                className={`form-input text-center text-2xl tracking-widest ${
                  validationError ? 'border-red-500' : ''
                }`}
                required
                disabled={loading}
                autoFocus
              />
              {validationError && (
                <p className="form-error">{validationError}</p>
              )}
              <p className="form-hint">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            {error && (
              <div className="error-message">
                <p>{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !verifyCode}
                className="btn-primary flex-1"
              >
                {loading ? 'Verifying...' : 'Verify and Enable'}
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
      )}

      {/* Step 3: Backup Codes */}
      {step === 3 && setupData && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">
              ✓ Two-Factor Authentication Enabled!
            </h2>
            <p className="text-gray-600">
              Save these backup codes in a safe place. You can use them to access your
              account if you lose your authenticator device.
            </p>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-yellow-900 mb-1">Important!</p>
                <p className="text-yellow-800 text-sm">
                  Each backup code can only be used once. Store them securely - you won't be able to see them again.
                </p>
              </div>
            </div>
          </div>

          {/* Backup Codes */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="grid grid-cols-2 gap-3 mb-4">
              {setupData.backup_codes.map((code, index) => (
                <div
                  key={index}
                  className="bg-gray-50 border border-gray-300 rounded px-4 py-2 text-center font-mono text-sm"
                >
                  {code}
                </div>
              ))}
            </div>

            <button
              onClick={handleCopyBackupCodes}
              className="btn-secondary w-full"
            >
              {backupCodesCopied ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied to Clipboard!
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy All Codes
                </span>
              )}
            </button>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm text-center">
              You can regenerate backup codes anytime from your security settings.
            </p>
          </div>

          <button
            onClick={handleComplete}
            className="btn-primary w-full"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
