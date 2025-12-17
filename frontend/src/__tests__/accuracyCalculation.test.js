/**
 * Tests for Accuracy Calculation Logic
 *
 * New accuracy formula: (characters correct on first attempt) / (total characters typed) * 100
 * Key rule: Repeated typos at same character position count as only ONE error
 */

import { describe, it, expect } from 'vitest';

/**
 * Simulates the accuracy calculation from App.jsx
 */
function calculateAccuracy(characterStates) {
  const correctOnFirstAttempt = Object.values(characterStates).filter(s => s === 'correct').length;
  const correctedAfterErrors = Object.values(characterStates).filter(s => s === 'corrected').length;
  const totalCharactersTyped = correctOnFirstAttempt + correctedAfterErrors;

  const accuracy = totalCharactersTyped > 0
    ? (correctOnFirstAttempt / totalCharactersTyped) * 100
    : 100;

  return {
    accuracy: Math.round(accuracy),
    correctOnFirstAttempt,
    correctedAfterErrors,
    totalCharactersTyped,
  };
}

describe('Accuracy Calculation', () => {
  it('should return 100% accuracy when all characters typed correctly on first attempt', () => {
    const characterStates = {
      0: 'correct',
      1: 'correct',
      2: 'correct',
      3: 'correct',
      4: 'correct',
    };

    const result = calculateAccuracy(characterStates);

    expect(result.accuracy).toBe(100);
    expect(result.correctOnFirstAttempt).toBe(5);
    expect(result.correctedAfterErrors).toBe(0);
    expect(result.totalCharactersTyped).toBe(5);
  });

  it('should calculate 80% accuracy for 4 correct and 1 corrected character', () => {
    const characterStates = {
      0: 'correct',    // Typed right on first attempt
      1: 'correct',    // Typed right on first attempt
      2: 'corrected',  // Had error(s), then corrected
      3: 'correct',    // Typed right on first attempt
      4: 'correct',    // Typed right on first attempt
    };

    const result = calculateAccuracy(characterStates);

    expect(result.accuracy).toBe(80); // 4/5 = 80%
    expect(result.correctOnFirstAttempt).toBe(4);
    expect(result.correctedAfterErrors).toBe(1);
    expect(result.totalCharactersTyped).toBe(5);
  });

  it('should count repeated typos at same position as one error', () => {
    // Scenario: User types character at position 2 wrong THREE times, then correct
    // This is ONE error position, not three
    const characterStates = {
      0: 'correct',
      1: 'correct',
      2: 'corrected',  // Typed wrong 3x, then right (counts as 1 error position)
      3: 'correct',
      4: 'correct',
    };

    const result = calculateAccuracy(characterStates);

    // Should be 80% (4 correct / 5 total), NOT 62.5% (4 correct / (4+3 errors))
    expect(result.accuracy).toBe(80);
    expect(result.correctOnFirstAttempt).toBe(4);
    expect(result.totalCharactersTyped).toBe(5);
  });

  it('should calculate 50% accuracy for half errors', () => {
    const characterStates = {
      0: 'correct',
      1: 'corrected',  // Error
      2: 'correct',
      3: 'corrected',  // Error
      4: 'correct',
      5: 'corrected',  // Error
    };

    const result = calculateAccuracy(characterStates);

    expect(result.accuracy).toBe(50); // 3/6 = 50%
    expect(result.correctOnFirstAttempt).toBe(3);
    expect(result.correctedAfterErrors).toBe(3);
    expect(result.totalCharactersTyped).toBe(6);
  });

  it('should calculate 0% accuracy when all characters had errors (but were corrected)', () => {
    const characterStates = {
      0: 'corrected',  // All had errors
      1: 'corrected',
      2: 'corrected',
      3: 'corrected',
      4: 'corrected',
    };

    const result = calculateAccuracy(characterStates);

    expect(result.accuracy).toBe(0); // 0/5 = 0%
    expect(result.correctOnFirstAttempt).toBe(0);
    expect(result.correctedAfterErrors).toBe(5);
    expect(result.totalCharactersTyped).toBe(5);
  });

  it('should return 100% for empty character states (edge case)', () => {
    const characterStates = {};

    const result = calculateAccuracy(characterStates);

    expect(result.accuracy).toBe(100); // Default for no input
    expect(result.correctOnFirstAttempt).toBe(0);
    expect(result.correctedAfterErrors).toBe(0);
    expect(result.totalCharactersTyped).toBe(0);
  });

  it('should ignore characters still in error state (not yet corrected)', () => {
    const characterStates = {
      0: 'correct',
      1: 'correct',
      2: 'error',      // Still in error state - not counted
      3: 'correct',
      4: 'correct',
    };

    const result = calculateAccuracy(characterStates);

    // Only count completed characters (correct + corrected)
    // 'error' state means user hasn't advanced past it yet
    expect(result.accuracy).toBe(100); // 4/4 = 100%
    expect(result.correctOnFirstAttempt).toBe(4);
    expect(result.correctedAfterErrors).toBe(0);
    expect(result.totalCharactersTyped).toBe(4);
  });

  it('should calculate accuracy for real typing scenario', () => {
    // Typing "hello" with errors at 'e' and 'l' (second one)
    const characterStates = {
      0: 'correct',    // h - correct
      1: 'corrected',  // e - typed wrong, then corrected
      2: 'correct',    // l - correct
      3: 'corrected',  // l - typed wrong, then corrected
      4: 'correct',    // o - correct
    };

    const result = calculateAccuracy(characterStates);

    expect(result.accuracy).toBe(60); // 3/5 = 60%
    expect(result.correctOnFirstAttempt).toBe(3);
    expect(result.correctedAfterErrors).toBe(2);
    expect(result.totalCharactersTyped).toBe(5);
  });

  it('should calculate accuracy with mixed completion states', () => {
    const characterStates = {
      0: 'correct',
      1: 'correct',
      2: 'corrected',
      3: 'error',      // Not yet corrected - not counted
      // Positions 4+ not reached yet
    };

    const result = calculateAccuracy(characterStates);

    // Only count positions 0-2 (completed)
    expect(result.accuracy).toBe(67); // 2/3 = 66.67%, rounded to 67%
    expect(result.correctOnFirstAttempt).toBe(2);
    expect(result.correctedAfterErrors).toBe(1);
    expect(result.totalCharactersTyped).toBe(3);
  });

  it('should handle single character typing', () => {
    const characterStates = {
      0: 'correct',
    };

    const result = calculateAccuracy(characterStates);

    expect(result.accuracy).toBe(100); // 1/1 = 100%
    expect(result.correctOnFirstAttempt).toBe(1);
    expect(result.totalCharactersTyped).toBe(1);
  });

  it('should handle single character with error', () => {
    const characterStates = {
      0: 'corrected',
    };

    const result = calculateAccuracy(characterStates);

    expect(result.accuracy).toBe(0); // 0/1 = 0%
    expect(result.correctOnFirstAttempt).toBe(0);
    expect(result.correctedAfterErrors).toBe(1);
    expect(result.totalCharactersTyped).toBe(1);
  });
});

describe('Error Count Calculation', () => {
  it('should count unique error positions using Set', () => {
    // Simulates characterErrorHistory Set
    const errorHistory = new Set([2, 4, 6]); // 3 unique positions with errors

    expect(errorHistory.size).toBe(3);
  });

  it('should not increase count for repeated errors at same position', () => {
    const errorHistory = new Set();

    // User types position 2 wrong multiple times
    errorHistory.add(2);
    errorHistory.add(2); // Adding again doesn't increase size
    errorHistory.add(2);

    expect(errorHistory.size).toBe(1); // Still only 1 unique position
  });

  it('should track multiple unique error positions', () => {
    const errorHistory = new Set();

    // User makes errors at different positions
    errorHistory.add(0); // Error at position 0
    errorHistory.add(0); // Repeated at position 0
    errorHistory.add(3); // Error at position 3
    errorHistory.add(7); // Error at position 7
    errorHistory.add(3); // Repeated at position 3

    expect(errorHistory.size).toBe(3); // 3 unique positions: 0, 3, 7
  });
});
