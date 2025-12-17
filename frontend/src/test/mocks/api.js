/**
 * Mock API Responses
 *
 * Centralized mock data for API endpoints
 */

import { vi } from 'vitest';

// Mock user data
export const mockUser = {
  id: 1,
  email: 'test@example.com',
  auth_provider: 'local',
  created_at: Date.now() - 86400000, // 1 day ago
  settings: {
    theme: 'default',
    sessionMode: 'wordcount',
    timedDuration: 30,
    wordCount: 20,
    viewMode: 'ticker',
    selectedWordSetId: 1,
  },
};

// Mock session data
export const mockSession = {
  id: 1,
  user_id: 1,
  start_time: Date.now() - 120000,
  end_time: Date.now(),
  wpm: 65,
  mechanical_wpm: 72,
  accuracy: 95.5,
  total_characters: 500,
  correct_characters: 477,
  incorrect_characters: 23,
  total_keystrokes: 550,
  practice_text: 'the quick brown fox jumps over the lazy dog practice your typing skills',
  created_at: Date.now() - 120000,
};

// Mock sessions list
export const mockSessions = [
  mockSession,
  {
    ...mockSession,
    id: 2,
    start_time: Date.now() - 240000,
    end_time: Date.now() - 120000,
    wpm: 58,
    mechanical_wpm: 65,
    accuracy: 92.0,
  },
  {
    ...mockSession,
    id: 3,
    start_time: Date.now() - 360000,
    end_time: Date.now() - 240000,
    wpm: 62,
    mechanical_wpm: 68,
    accuracy: 94.0,
  },
];

// Mock telemetry events
export const mockTelemetryEvents = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  session_id: 1,
  event_type: i % 2 === 0 ? 'DOWN' : 'UP',
  key_code: `Key${String.fromCharCode(65 + (i % 26))}`,
  timestamp_offset: i * 50,
  finger_used: ['L_INDEX', 'R_INDEX', 'L_MIDDLE', 'R_MIDDLE', 'L_RING', 'R_RING'][i % 6],
  is_error: i % 10 === 0,
}));

// Mock word sets
export const mockWordSets = [
  {
    id: 1,
    name: 'Common Words',
    words: ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'practice', 'typing'],
    description: 'Most common English words',
    is_public: true,
    created_at: Date.now() - 86400000,
  },
  {
    id: 2,
    name: 'Programming Terms',
    words: ['function', 'variable', 'const', 'return', 'async', 'await', 'import', 'export'],
    description: 'Common programming vocabulary',
    is_public: true,
    created_at: Date.now() - 172800000,
  },
];

// Mock API responses
export const mockAPIResponses = {
  // Auth endpoints
  '/api/auth/login': {
    success: {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: mockUser,
    },
    error: {
      detail: 'Invalid credentials',
    },
  },
  '/api/auth/register': {
    success: {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: mockUser,
    },
    error: {
      detail: 'Email already registered',
    },
  },
  '/api/auth/me': {
    success: mockUser,
    error: {
      detail: 'Not authenticated',
    },
  },

  // Session endpoints
  '/api/sessions': {
    success: mockSession,
    list: mockSessions,
  },
  '/api/sessions/:id': {
    success: mockSession,
    error: {
      detail: 'Session not found',
    },
  },
  '/api/sessions/:id/telemetry': {
    success: {
      events: mockTelemetryEvents,
      count: mockTelemetryEvents.length,
      truncated: false,
    },
  },

  // Word sets endpoints
  '/api/word-sets': {
    success: mockWordSets,
  },
  '/api/word-sets/:id': {
    success: mockWordSets[0],
    error: {
      detail: 'Word set not found',
    },
  },
};

/**
 * Create a mock fetch function
 * @param {Object} responses - Custom responses to override defaults
 * @returns {Function} Mock fetch function
 */
export function createMockFetch(responses = {}) {
  return vi.fn((url, options = {}) => {
    const mergedResponses = { ...mockAPIResponses, ...responses };

    // Find matching response
    let response = null;
    for (const [pattern, data] of Object.entries(mergedResponses)) {
      if (url.includes(pattern.replace(':id', '\\d+'))) {
        if (options.method === 'GET' || !options.method) {
          response = data.success || data.list || data;
        } else if (options.method === 'POST') {
          response = data.success || data;
        } else if (options.method === 'DELETE') {
          response = { success: true };
        }
        break;
      }
    }

    if (!response) {
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ detail: 'Not found' }),
      });
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(response),
    });
  });
}

/**
 * Mock the sessionsAPI module
 */
export const mockSessionsAPI = {
  create: vi.fn().mockResolvedValue(mockSession),
  list: vi.fn().mockResolvedValue(mockSessions),
  get: vi.fn().mockResolvedValue(mockSession),
  end: vi.fn().mockResolvedValue(mockSession),
  delete: vi.fn().mockResolvedValue({ success: true }),
  getDetailedTelemetry: vi.fn().mockResolvedValue({
    events: mockTelemetryEvents,
    count: mockTelemetryEvents.length,
    truncated: false,
  }),
};

/**
 * Mock the wordSetsAPI module
 */
export const mockWordSetsAPI = {
  list: vi.fn().mockResolvedValue(mockWordSets),
  get: vi.fn().mockResolvedValue(mockWordSets[0]),
  create: vi.fn().mockResolvedValue(mockWordSets[0]),
  update: vi.fn().mockResolvedValue(mockWordSets[0]),
  delete: vi.fn().mockResolvedValue({ success: true }),
};
