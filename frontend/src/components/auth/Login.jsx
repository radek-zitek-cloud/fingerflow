/**
 * Login Component
 *
 * Provides user login with email and password.
 */

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useForm, validators } from '../../hooks/useForm';
import { AlertCircle, LogIn, Mail, Lock } from 'lucide-react';

export function Login({ onSwitchToRegister, onForgotPassword }) {
  const { login } = useAuth();
  const [loginError, setLoginError] = useState(null);

  const form = useForm(
    { email: '', password: '' },
    {
      email: validators.email,
      password: validators.required('Password'),
    }
  );

  const handleLogin = async (values) => {
    setLoginError(null);
    const result = await login(values.email, values.password);

    if (!result.success) {
      setLoginError(result.error || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="auth-form-container max-w-md mx-auto p-8 bg-[var(--bg-panel)] rounded-lg shadow-xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--accent-primary)] bg-opacity-10 mb-4">
          <LogIn className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} />
        </div>
        <h2 className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
          Welcome Back
        </h2>
        <p className="mt-2" style={{ color: 'var(--text-dim)' }}>
          Sign in to continue your typing journey
        </p>
      </div>

      {loginError && (
        <div className="mb-6 p-4 rounded-lg bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-500 text-sm">{loginError}</p>
          </div>
        </div>
      )}

      <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-6">
        {/* Email Field */}
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

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-main)' }}>
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="w-5 h-5" style={{ color: 'var(--text-dim)' }} />
            </div>
            <input
              type="password"
              id="password"
              name="password"
              value={form.values.password}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              className="input-field w-full pl-10 pr-4 py-3 rounded-lg border-2 transition-colors"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: form.touched.password && form.errors.password ? 'var(--status-error)' : 'var(--key-border)',
                color: 'var(--text-main)',
              }}
              placeholder="••••••••"
            />
          </div>
          {form.touched.password && form.errors.password && (
            <p className="mt-1 text-sm text-red-500">{form.errors.password}</p>
          )}
        </div>

        {/* Forgot Password Link */}
        <div className="text-right">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm hover:underline"
            style={{ color: 'var(--accent-primary)' }}
          >
            Forgot password?
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={form.isSubmitting}
          className="w-full py-3 px-4 rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'white',
          }}
        >
          {form.isSubmitting ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      {/* Switch to Register */}
      <div className="mt-6 text-center">
        <p style={{ color: 'var(--text-dim)' }}>
          Don't have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="font-semibold hover:underline"
            style={{ color: 'var(--accent-primary)' }}
          >
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
