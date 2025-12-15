/**
 * Form Validation Utilities
 *
 * Common validation functions for user input.
 */

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {string|null} Error message or null if valid
 */
export function validateEmail(email) {
  if (!email || !email.trim()) {
    return 'Email is required';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }

  return null;
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {string|null} Error message or null if valid
 */
export function validatePassword(password) {
  if (!password || !password.trim()) {
    return 'Password is required';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }

  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }

  return null;
}

/**
 * Get password strength score (0-4)
 * @param {string} password - Password to check
 * @returns {number} Strength score: 0 (weak) to 4 (very strong)
 */
export function getPasswordStrength(password) {
  if (!password) return 0;

  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character variety
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++; // Special characters

  return Math.min(score, 4);
}

/**
 * Get password strength label
 * @param {number} strength - Strength score (0-4)
 * @returns {string} Human-readable label
 */
export function getPasswordStrengthLabel(strength) {
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  return labels[strength] || 'Very Weak';
}

/**
 * Get password strength color class
 * @param {number} strength - Strength score (0-4)
 * @returns {string} CSS color class
 */
export function getPasswordStrengthColor(strength) {
  if (strength === 0) return 'text-red-600';
  if (strength === 1) return 'text-orange-600';
  if (strength === 2) return 'text-yellow-600';
  if (strength === 3) return 'text-green-600';
  return 'text-green-700';
}

/**
 * Validate 2FA code format
 * @param {string} code - 2FA code to validate
 * @returns {string|null} Error message or null if valid
 */
export function validate2FACode(code) {
  if (!code || !code.trim()) {
    return '2FA code is required';
  }

  // TOTP codes are 6 digits
  if (code.length === 6 && /^\d{6}$/.test(code)) {
    return null;
  }

  // Backup codes are 8 alphanumeric characters
  if (code.length === 8 && /^[A-Z0-9]{8}$/i.test(code)) {
    return null;
  }

  return 'Invalid code format. Enter 6-digit code or 8-character backup code';
}
