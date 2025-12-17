/**
 * Text Generator Utility
 *
 * Generates random practice text from word sets.
 * Extracted from App.jsx for reusability and testability.
 */

import { wordSetsAPI } from '../services/api';

/**
 * Generate random text from word sets
 * @param {number} wordCount - Number of words to generate
 * @param {number|null} wordSetId - Specific word set ID to use, or null for random
 * @param {Array} availableWordSets - Array of available word sets
 * @returns {Promise<string>} - Generated text string
 */
export async function generateRandomText(wordCount = 20, wordSetId = null, availableWordSets = []) {
  try {
    // Fetch available word sets if not provided
    let wordSets = availableWordSets;
    if (!wordSets || wordSets.length === 0) {
      wordSets = await wordSetsAPI.list(0, 100);
    }

    if (!wordSets || wordSets.length === 0) {
      // Fallback to default text if no word sets available
      return 'the quick brown fox jumps over the lazy dog practice your typing skills with finger flow';
    }

    // Pick specific word set or random
    let selectedSet;
    if (wordSetId) {
      selectedSet = wordSets.find(set => set.id === wordSetId);
      if (!selectedSet) {
        // If specified word set not found, pick random
        selectedSet = wordSets[Math.floor(Math.random() * wordSets.length)];
      }
    } else {
      // Pick random word set
      selectedSet = wordSets[Math.floor(Math.random() * wordSets.length)];
    }

    const words = selectedSet.words || [];

    if (words.length === 0) {
      return 'the quick brown fox jumps over the lazy dog practice your typing skills with finger flow';
    }

    // Generate random selection of words
    const selectedWords = [];
    for (let i = 0; i < wordCount; i++) {
      const randomWord = words[Math.floor(Math.random() * words.length)];
      selectedWords.push(randomWord);
    }

    // Join words with spaces
    return selectedWords.join(' ');
  } catch (error) {
    console.error('Failed to generate random text:', error);
    // Fallback text
    return 'the quick brown fox jumps over the lazy dog practice your typing skills with finger flow';
  }
}
