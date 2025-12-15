/**
 * Auth Page Component
 *
 * Container for login, register, and forgot password views.
 */

import { useState } from 'react';
import { Login } from './Login';
import { Register } from './Register';
import { ForgotPassword } from './ForgotPassword';

export function AuthPage() {
  const [view, setView] = useState('login'); // 'login', 'register', 'forgot'

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-app)]">
      {view === 'login' && (
        <Login
          onSwitchToRegister={() => setView('register')}
          onForgotPassword={() => setView('forgot')}
        />
      )}

      {view === 'register' && (
        <Register onSwitchToLogin={() => setView('login')} />
      )}

      {view === 'forgot' && (
        <ForgotPassword onBack={() => setView('login')} />
      )}
    </div>
  );
}
