/**
 * Register Component
 *
 * User registration with email and password.
 */

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useForm, validators } from '../../hooks/useForm';
import { AlertCircle, UserPlus, Mail, Lock, CheckCircle } from 'lucide-react';
import { authAPI } from '../../services/api';

export function Register({ onSwitchToLogin }) {
  const { register } = useAuth();
  const [registerError, setRegisterError] = useState(null);

  const form = useForm(
    { email: '', password: '', confirmPassword: '' },
    {
      email: validators.email,
      password: validators.password,
      confirmPassword: validators.passwordConfirm,
    }
  );

  const handleRegister = async (values) => {
    setRegisterError(null);
    const result = await register(values.email, values.password);

    if (!result.success) {
      setRegisterError(result.error || 'Registration failed. Please try again.');
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength, label: 'Weak', color: 'var(--status-error)' };
    if (strength <= 3) return { strength, label: 'Fair', color: '#f59e0b' };
    if (strength <= 4) return { strength, label: 'Good', color: '#10b981' };
    return { strength, label: 'Strong', color: 'var(--status-correct)' };
  };

  const passwordStrength = getPasswordStrength(form.values.password);

  return (
    <div className="auth-form-container max-w-md mx-auto p-8 bg-[var(--bg-panel)] rounded-lg shadow-xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--accent-primary)] bg-opacity-10 mb-4">
          <UserPlus className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} />
        </div>
        <h2 className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
          Create Account
        </h2>
        <p className="mt-2" style={{ color: 'var(--text-dim)' }}>
          Start improving your typing skills today
        </p>
      </div>

      {registerError && (
        <div className="mb-6 p-4 rounded-lg bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-500 text-sm">{registerError}</p>
          </div>
        </div>
      )}

      <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-6">
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

          {/* Password Strength Indicator */}
          {form.values.password && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span style={{ color: 'var(--text-dim)' }}>Password strength:</span>
                <span style={{ color: passwordStrength.color }} className="font-semibold">
                  {passwordStrength.label}
                </span>
              </div>
              <div className="h-1.5 bg-[var(--key-bg)] rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${(passwordStrength.strength / 5) * 100}%`,
                    backgroundColor: passwordStrength.color,
                  }}
                />
              </div>
            </div>
          )}

          {form.touched.password && form.errors.password && (
            <p className="mt-1 text-sm text-red-500">{form.errors.password}</p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-main)' }}>
            Confirm Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {form.values.confirmPassword && !form.errors.confirmPassword ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Lock className="w-5 h-5" style={{ color: 'var(--text-dim)' }} />
              )}
            </div>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={form.values.confirmPassword}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              className="input-field w-full pl-10 pr-4 py-3 rounded-lg border-2 transition-colors"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: form.touched.confirmPassword && form.errors.confirmPassword ? 'var(--status-error)' : 'var(--key-border)',
                color: 'var(--text-main)',
              }}
              placeholder="••••••••"
            />
          </div>
          {form.touched.confirmPassword && form.errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-500">{form.errors.confirmPassword}</p>
          )}
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
          {form.isSubmitting ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" style={{ borderColor: 'var(--key-border)' }}></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2" style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-dim)' }}>
            Or continue with
          </span>
        </div>
      </div>

      {/* Google Sign Up Button */}
      <button
        type="button"
        onClick={async () => {
          try {
            const data = await authAPI.googleLogin();
            if (data.authorization_url) {
              window.location.href = data.authorization_url;
            }
          } catch (error) {
            setRegisterError('Google sign up is not available');
          }
        }}
        className="w-full py-3 px-4 rounded-lg font-semibold transition-all hover:opacity-90 border-2 flex items-center justify-center gap-3"
        style={{
          backgroundColor: 'var(--bg-app)',
          borderColor: 'var(--key-border)',
          color: 'var(--text-main)',
        }}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Sign up with Google
      </button>

      {/* Switch to Login */}
      <div className="mt-6 text-center">
        <p style={{ color: 'var(--text-dim)' }}>
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="font-semibold hover:underline"
            style={{ color: 'var(--accent-primary)' }}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
