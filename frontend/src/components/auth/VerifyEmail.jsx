/**
 * Email Verification Page
 *
 * Handles email verification with token from URL query parameter.
 * Shows success/error states and provides resend option.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyEmail, resendVerificationEmail } from '../../services/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error, expired
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    // Verify email with token
    const verify = async () => {
      try {
        const response = await verifyEmail(token);

        if (response.status === 'success') {
          setStatus('success');
          setMessage(response.message || 'Email verified successfully!');

          // Redirect to home after 3 seconds
          setTimeout(() => {
            navigate('/');
          }, 3000);
        }
      } catch (error) {
        console.error('Email verification failed:', error);

        const errorMessage = error.response?.data?.detail || 'Verification failed';

        if (errorMessage.includes('expired') || errorMessage.includes('used')) {
          setStatus('expired');
          setMessage('This verification link has expired or has already been used.');
        } else {
          setStatus('error');
          setMessage(errorMessage);
        }
      }
    };

    verify();
  }, [searchParams, navigate]);

  const handleResend = async (e) => {
    e.preventDefault();

    if (!resendEmail.trim()) {
      return;
    }

    setResending(true);
    setResendSuccess(false);

    try {
      await resendVerificationEmail(resendEmail);
      setResendSuccess(true);
      setResendEmail('');
    } catch (error) {
      console.error('Failed to resend verification:', error);
      alert('Failed to resend verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Email Verification</h1>
          </div>

          {/* Verifying State */}
          {status === 'verifying' && (
            <div className="text-center py-8">
              <div className="spinner-large mb-4"></div>
              <p className="text-lg">Verifying your email...</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="text-center py-8">
              <div className="success-icon mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">Email Verified!</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <p className="text-sm text-gray-500">Redirecting you to the home page...</p>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="text-center py-8">
              <div className="error-icon mb-4">
                <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">Verification Failed</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <button
                onClick={() => navigate('/')}
                className="btn-primary"
              >
                Go to Home
              </button>
            </div>
          )}

          {/* Expired State with Resend Option */}
          {status === 'expired' && (
            <div className="py-8">
              <div className="warning-icon mb-4 text-center">
                <svg className="w-16 h-16 mx-auto text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-yellow-600 mb-2 text-center">Link Expired</h2>
              <p className="text-gray-600 mb-6 text-center">{message}</p>

              {resendSuccess ? (
                <div className="success-message text-center mb-4">
                  <p className="text-green-600 font-semibold">
                    ✓ Verification email sent! Check your inbox.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleResend} className="space-y-4">
                  <div>
                    <label htmlFor="resend-email" className="form-label">
                      Resend Verification Email
                    </label>
                    <input
                      type="email"
                      id="resend-email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="form-input"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resending}
                    className="btn-primary w-full"
                  >
                    {resending ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                </form>
              )}

              <div className="mt-6 text-center">
                <button
                  onClick={() => navigate('/')}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  ← Back to Home
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
