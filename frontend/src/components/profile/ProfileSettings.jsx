/**
 * Profile Settings Component
 *
 * User profile management including email and password changes.
 */

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useForm, validators } from '../../hooks/useForm';
import { User, Mail, Lock, Save, CheckCircle, AlertCircle } from 'lucide-react';

export function ProfileSettings() {
  const { user, checkAuth } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Profile form
  const profileForm = useForm(
    { email: user?.email || '' },
    { email: validators.email }
  );

  // Password change form
  const passwordForm = useForm(
    { currentPassword: '', newPassword: '', confirmPassword: '' },
    {
      currentPassword: validators.required('Current password'),
      newPassword: validators.password,
      confirmPassword: validators.passwordConfirm,
    }
  );

  const handleUpdateProfile = async (values) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email: values.email }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      await checkAuth(); // Refresh user data
      setSuccessMessage('Profile updated successfully');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (values) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: values.currentPassword,
          new_password: values.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to change password');
      }

      setSuccessMessage('Password changed successfully');
      passwordForm.reset();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to change password');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--text-main)' }}>
        Profile Settings
      </h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b" style={{ borderColor: 'var(--key-border)' }}>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'profile' ? 'border-[var(--accent-primary)]' : 'border-transparent'
          }`}
          style={{
            color: activeTab === 'profile' ? 'var(--accent-primary)' : 'var(--text-dim)',
          }}
        >
          <User className="w-4 h-4 inline mr-2" />
          Profile
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'security' ? 'border-[var(--accent-primary)]' : 'border-transparent'
          }`}
          style={{
            color: activeTab === 'security' ? 'var(--accent-primary)' : 'var(--text-dim)',
          }}
        >
          <Lock className="w-4 h-4 inline mr-2" />
          Security
        </button>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-lg bg-green-500 bg-opacity-10 border border-green-500 border-opacity-30">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-green-500 text-sm">{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 rounded-lg bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-500 text-sm">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-[var(--bg-panel)] rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-main)' }}>
            Profile Information
          </h2>

          <form onSubmit={profileForm.handleSubmit(handleUpdateProfile)} className="space-y-6">
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
                  value={profileForm.values.email}
                  onChange={profileForm.handleChange}
                  onBlur={profileForm.handleBlur}
                  className="input-field w-full pl-10 pr-4 py-3 rounded-lg border-2 transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: profileForm.touched.email && profileForm.errors.email ? 'var(--status-error)' : 'var(--key-border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
              {profileForm.touched.email && profileForm.errors.email && (
                <p className="mt-1 text-sm text-red-500">{profileForm.errors.email}</p>
              )}
            </div>

            <div className="flex items-center gap-2 p-4 bg-[var(--bg-input)] rounded-lg">
              <User className="w-5 h-5" style={{ color: 'var(--text-dim)' }} />
              <div>
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Auth Provider</p>
                <p className="font-medium" style={{ color: 'var(--text-main)' }}>
                  {user?.auth_provider === 'local' ? 'Email/Password' : 'Google OAuth'}
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={profileForm.isSubmitting}
              className="px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
              }}
            >
              <Save className="w-4 h-4" />
              {profileForm.isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-[var(--bg-panel)] rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-main)' }}>
            Change Password
          </h2>

          {user?.auth_provider !== 'local' ? (
            <div className="p-4 rounded-lg bg-[var(--bg-input)]">
              <p style={{ color: 'var(--text-dim)' }}>
                You're signed in with Google OAuth. Password change is not available for OAuth accounts.
              </p>
            </div>
          ) : (
            <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-6">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-main)' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordForm.values.currentPassword}
                  onChange={passwordForm.handleChange}
                  onBlur={passwordForm.handleBlur}
                  className="input-field w-full px-4 py-3 rounded-lg border-2 transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: passwordForm.touched.currentPassword && passwordForm.errors.currentPassword ? 'var(--status-error)' : 'var(--key-border)',
                    color: 'var(--text-main)',
                  }}
                />
                {passwordForm.touched.currentPassword && passwordForm.errors.currentPassword && (
                  <p className="mt-1 text-sm text-red-500">{passwordForm.errors.currentPassword}</p>
                )}
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-main)' }}>
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordForm.values.newPassword}
                  onChange={passwordForm.handleChange}
                  onBlur={passwordForm.handleBlur}
                  className="input-field w-full px-4 py-3 rounded-lg border-2 transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: passwordForm.touched.newPassword && passwordForm.errors.newPassword ? 'var(--status-error)' : 'var(--key-border)',
                    color: 'var(--text-main)',
                  }}
                />
                {passwordForm.touched.newPassword && passwordForm.errors.newPassword && (
                  <p className="mt-1 text-sm text-red-500">{passwordForm.errors.newPassword}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-main)' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordForm.values.confirmPassword}
                  onChange={passwordForm.handleChange}
                  onBlur={passwordForm.handleBlur}
                  className="input-field w-full px-4 py-3 rounded-lg border-2 transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: passwordForm.touched.confirmPassword && passwordForm.errors.confirmPassword ? 'var(--status-error)' : 'var(--key-border)',
                    color: 'var(--text-main)',
                  }}
                />
                {passwordForm.touched.confirmPassword && passwordForm.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-500">{passwordForm.errors.confirmPassword}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={passwordForm.isSubmitting}
                className="px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                }}
              >
                <Lock className="w-4 h-4" />
                {passwordForm.isSubmitting ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
