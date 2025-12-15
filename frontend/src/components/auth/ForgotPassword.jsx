/**
 * Forgot Password Component
 *
 * Allows users to request a password reset link.
 */

import { useState } from 'react';
import { useForm, validators } from '../../hooks/useForm';
import { AlertCircle, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export function ForgotPassword({ onBack }) {
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState(null);

  const form = useForm(
    { email: '' },
    { email: validators.email }
  );

  const handleSubmit = async (values) => {
    setError(null);
    try {
      // TODO: Implement password reset API call
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reset email');
      }

      setResetSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    }
  };

  if (resetSent) {
    return (
      <div className="auth-form-container max-w-md mx-auto p-8 bg-[var(--bg-panel)] rounded-lg shadow-xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500 bg-opacity-10 mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-main)' }}>
            Check Your Email
          </h2>
          <p className="mb-6" style={{ color: 'var(--text-dim)' }}>
            We've sent password reset instructions to <strong>{form.values.email}</strong>.
            Please check your inbox and follow the link to reset your password.
          </p>
          <button
            onClick={onBack}
            className="px-6 py-2 rounded-lg font-semibold transition-all hover:opacity-90"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'white',
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form-container max-w-md mx-auto p-8 bg-[var(--bg-panel)] rounded-lg shadow-xl">
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-6 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--accent-primary)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </button>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
          Reset Password
        </h2>
        <p className="mt-2" style={{ color: 'var(--text-dim)' }}>
          Enter your email address and we'll send you instructions to reset your password
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-main)' }}>
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="w-5 h-5" style={{ color: 'var(--text-dim)' }} />
            </div>
            <input
              type="email"
              id="email"
              name="email"
              value={form.values.email}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              className="input-field w-full pl-10 pr-4 py-3 rounded-lg border-2 transition-colors"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: form.touched.email && form.errors.email ? 'var(--status-error)' : 'var(--key-border)',
                color: 'var(--text-main)',
              }}
              placeholder="you@example.com"
            />
          </div>
          {form.touched.email && form.errors.email && (
            <p className="mt-1 text-sm text-red-500">{form.errors.email}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={form.isSubmitting}
          className="w-full py-3 px-4 rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'white',
          }}
        >
          {form.isSubmitting ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
    </div>
  );
}
