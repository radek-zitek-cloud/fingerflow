/**
 * Navigation Bar Component
 *
 * Top navigation with user menu and theme switcher.
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, LogOut, Settings, Menu, X } from 'lucide-react';

export function Navbar({ onNavigate, theme, onThemeChange }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    onNavigate('home');
  };

  return (
    <nav className="bg-[var(--bg-panel)] border-b" style={{ borderColor: 'var(--key-border)' }}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
              FingerFlow
            </div>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {/* Theme Selector */}
            <select
              value={theme}
              onChange={(e) => onThemeChange(e.target.value)}
              className="px-3 py-1.5 rounded-lg border bg-[var(--bg-input)] text-sm"
              style={{
                borderColor: 'var(--key-border)',
                color: 'var(--text-main)',
              }}
            >
              <option value="default">Dark</option>
              <option value="paper">Paper</option>
              <option value="high-contrast">High Contrast</option>
            </select>

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--bg-input)] transition-colors"
                  style={{ color: 'var(--text-main)' }}
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] bg-opacity-20 flex items-center justify-center">
                    <User className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <span className="text-sm font-medium">{user?.email}</span>
                </button>

                {showUserMenu && (
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl border overflow-hidden z-50"
                    style={{
                      backgroundColor: 'var(--bg-panel)',
                      borderColor: 'var(--key-border)',
                    }}
                  >
                    <button
                      onClick={() => {
                        onNavigate('profile');
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-[var(--bg-input)] transition-colors"
                      style={{ color: 'var(--text-main)' }}
                    >
                      <Settings className="w-4 h-4" />
                      Profile Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-[var(--bg-input)] transition-colors border-t"
                      style={{
                        color: 'var(--status-error)',
                        borderColor: 'var(--key-border)',
                      }}
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => onNavigate('auth')}
                className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                }}
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2"
            style={{ color: 'var(--text-main)' }}
          >
            {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden py-4 border-t" style={{ borderColor: 'var(--key-border)' }}>
            <div className="space-y-2">
              <select
                value={theme}
                onChange={(e) => onThemeChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-[var(--bg-input)]"
                style={{
                  borderColor: 'var(--key-border)',
                  color: 'var(--text-main)',
                }}
              >
                <option value="default">Dark Theme</option>
                <option value="paper">Paper Theme</option>
                <option value="high-contrast">High Contrast</option>
              </select>

              {isAuthenticated ? (
                <>
                  <div className="px-3 py-2" style={{ color: 'var(--text-dim)' }}>
                    <p className="text-xs">Signed in as</p>
                    <p className="font-medium" style={{ color: 'var(--text-main)' }}>
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onNavigate('profile');
                      setShowMobileMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 rounded-lg hover:bg-[var(--bg-input)]"
                    style={{ color: 'var(--text-main)' }}
                  >
                    <Settings className="w-4 h-4" />
                    Profile Settings
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowMobileMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 rounded-lg hover:bg-[var(--bg-input)]"
                    style={{ color: 'var(--status-error)' }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    onNavigate('auth');
                    setShowMobileMenu(false);
                  }}
                  className="w-full px-4 py-2 rounded-lg font-medium"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                  }}
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
