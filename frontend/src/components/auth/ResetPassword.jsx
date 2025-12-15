/**
 * Password Reset Page
 *
 * Handles password reset with token from URL query parameter.
 * Allows user to set a new password if token is valid.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../services/api';
import { validatePassword } from '../../utils/validation';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const tokenParam = searchParams.get('token');

    if (!tokenParam) {
      setError('Invalid reset link. No token provided.');
      return;
    }

    setToken(tokenParam);
  }, [searchParams]);

  const validateForm = () => {
    const errors = {};

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      errors.password = passwordError;
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await resetPassword(token, password);

      if (response.status === 'success') {
        setSuccess(true);

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/auth?view=login');
        }, 3000);
      }
    } catch (err) {
      console.error('Password reset failed:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to reset password. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show error if no token
  if (!token && error) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <div className="text-center py-8">
              <div className="error-icon mb-4">
                <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">Invalid Link</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => navigate('/auth?view=forgot-password')}
                className="btn-primary"
              >
                Request New Link
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
            <p className="text-gray-600">Enter your new password below</p>
          </div>

          {/* Success State */}
          {success ? (
            <div className="text-center py-8">
              <div className="success-icon mb-4">
                <svg className="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">Password Reset!</h2>
              <p className="text-gray-600 mb-4">Your password has been successfully reset.</p>
              <p className="text-sm text-gray-500">Redirecting you to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="error-message">
                  <p>{error}</p>
                </div>
              )}

              {/* New Password */}
              <div>
                <label htmlFor="password" className="form-label">
                  New Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`form-input ${validationErrors.password ? 'border-red-500' : ''}`}
                  required
                  disabled={loading}
                  placeholder="Enter new password"
                />
                {validationErrors.password && (
                  <p className="form-error">{validationErrors.password}</p>
                )}
                <p className="form-hint">
                  Password must be at least 8 characters with uppercase, lowercase, and number
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`form-input ${validationErrors.confirmPassword ? 'border-red-500' : ''}`}
                  required
                  disabled={loading}
                  placeholder="Confirm new password"
                />
                {validationErrors.confirmPassword && (
                  <p className="form-error">{validationErrors.confirmPassword}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="spinner mr-2"></span>
                    Resetting Password...
                  </span>
                ) : (
                  'Reset Password'
                )}
              </button>

              {/* Back to Login */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/auth?view=login')}
                  className="text-sm text-gray-600 hover:text-gray-900"
                  disabled={loading}
                >
                  ← Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
