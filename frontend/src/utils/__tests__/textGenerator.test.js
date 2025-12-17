/**
 * Tests for textGenerator utility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateRandomText } from '../textGenerator';
import * as api from '../../services/api';

// Mock the API
vi.mock('../../services/api', () => ({
  wordSetsAPI: {
    list: vi.fn(),
  },
}));

describe('textGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockWordSets = [
    {
      id: 1,
      name: 'Common Words',
      words: ['the', 'quick', 'brown', 'fox', 'jumps'],
    },
    {
      id: 2,
      name: 'Programming',
      words: ['function', 'variable', 'const', 'return'],
    },
  ];

  describe('generateRandomText', () => {
    it('should generate text with specified word count', async () => {
      const text = await generateRandomText(10, 1, mockWordSets);
      const words = text.split(' ');

      expect(words).toHaveLength(10);
    });

    it('should use words from specified word set', async () => {
      const text = await generateRandomText(20, 1, mockWordSets);
      const words = text.split(' ');

      // All words should be from the first word set
      const validWords = mockWordSets[0].words;
      words.forEach(word => {
        expect(validWords).toContain(word);
      });
    });

    it('should pick random word set if wordSetId is null', async () => {
      const text = await generateRandomText(10, null, mockWordSets);
      const words = text.split(' ');

      expect(words).toHaveLength(10);
      // Words should be from one of the word sets
      const allWords = [...mockWordSets[0].words, ...mockWordSets[1].words];
      words.forEach(word => {
        expect(allWords).toContain(word);
      });
    });

    it('should fetch word sets if not provided', async () => {
      api.wordSetsAPI.list.mockResolvedValue(mockWordSets);

      const text = await generateRandomText(10);

      expect(api.wordSetsAPI.list).toHaveBeenCalledWith(0, 100);
      expect(text).toBeTruthy();
    });

    it('should return fallback text if no word sets available', async () => {
      const text = await generateRandomText(10, null, []);

      expect(text).toBe('the quick brown fox jumps over the lazy dog practice your typing skills with finger flow');
    });

    it('should return fallback text if word set has no words', async () => {
      const emptyWordSet = [{ id: 1, name: 'Empty', words: [] }];
      const text = await generateRandomText(10, null, emptyWordSet);

      expect(text).toBe('the quick brown fox jumps over the lazy dog practice your typing skills with finger flow');
    });

    it('should handle missing word set ID gracefully', async () => {
      const text = await generateRandomText(10, 999, mockWordSets);

      // Should fall back to random word set
      expect(text).toBeTruthy();
      const words = text.split(' ');
      expect(words).toHaveLength(10);
    });

    it('should handle API errors gracefully', async () => {
      api.wordSetsAPI.list.mockRejectedValue(new Error('Network error'));

      const text = await generateRandomText(10);

      expect(text).toBe('the quick brown fox jumps over the lazy dog practice your typing skills with finger flow');
    });
  });
});
