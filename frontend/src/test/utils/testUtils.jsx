/**
 * Test Utilities
 *
 * Custom render functions and test helpers for React Testing Library
 */

import { render } from '@testing-library/react';
import { AuthProvider } from '../../context/AuthContext';

/**
 * Custom render function that wraps components with necessary providers
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @param {Object} options.authValue - Mock auth context value
 * @param {Object} options.renderOptions - Additional render options
 * @returns {Object} Render result with utilities
 */
export function renderWithProviders(
  ui,
  {
    authValue = {
      isAuthenticated: false,
      loading: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      checkAuth: vi.fn(),
    },
    ...renderOptions
  } = {}
) {
  // Mock AuthContext if needed
  const MockAuthProvider = authValue ?
    ({ children }) => (
      <AuthProvider value={authValue}>
        {children}
      </AuthProvider>
    ) : AuthProvider;

  function Wrapper({ children }) {
    return <MockAuthProvider>{children}</MockAuthProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Create mock telemetry events for testing
 * @param {number} count - Number of events to generate
 * @param {string} eventType - 'DOWN' or 'UP'
 * @returns {Array} Array of mock telemetry events
 */
export function createMockTelemetryEvents(count = 10, eventType = 'DOWN') {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    session_id: 1,
    event_type: eventType,
    key_code: `Key${String.fromCharCode(65 + (i % 26))}`,
    timestamp_offset: i * 100,
    finger_used: ['L_INDEX', 'R_INDEX', 'L_MIDDLE', 'R_MIDDLE'][i % 4],
    is_error: i % 5 === 0, // Every 5th event is an error
  }));
}

/**
 * Create mock session data
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock session object
 */
export function createMockSession(overrides = {}) {
  return {
    id: 1,
    user_id: 1,
    start_time: Date.now() - 60000,
    end_time: Date.now(),
    wpm: 65,
    mechanical_wpm: 72,
    accuracy: 95.5,
    total_characters: 500,
    correct_characters: 477,
    incorrect_characters: 23,
    total_keystrokes: 550,
    practice_text: 'the quick brown fox jumps over the lazy dog',
    created_at: Date.now() - 60000,
    ...overrides,
  };
}

/**
 * Create mock word set data
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock word set object
 */
export function createMockWordSet(overrides = {}) {
  return {
    id: 1,
    name: 'Common Words',
    words: ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog'],
    description: 'Most common English words',
    is_public: true,
    created_at: Date.now(),
    ...overrides,
  };
}

/**
 * Wait for a condition to be true
 * @param {Function} condition - Function that returns boolean
 * @param {number} timeout - Maximum time to wait in ms
 * @param {number} interval - Check interval in ms
 * @returns {Promise<void>}
 */
export async function waitForCondition(condition, timeout = 3000, interval = 50) {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/**
 * Simulate typing a string of characters
 * @param {HTMLElement} element - Element to type into
 * @param {string} text - Text to type
 * @param {Object} userEvent - userEvent instance from @testing-library/user-event
 */
export async function typeText(element, text, userEvent) {
  element.focus();
  for (const char of text) {
    await userEvent.keyboard(char);
  }
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
