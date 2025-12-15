/**
 * Register Component
 *
 * User registration with email and password.
 */

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useForm, validators } from '../../hooks/useForm';
import { AlertCircle, UserPlus, Mail, Lock, CheckCircle } from 'lucide-react';

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
