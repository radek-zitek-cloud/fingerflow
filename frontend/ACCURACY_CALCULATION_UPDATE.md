# Accuracy Calculation Update

## Summary

Updated accuracy calculation to count **unique character positions with errors** instead of total error keystrokes. Repeated typos at the same position now count as only ONE error.

## Previous Calculation (Incorrect)

```javascript
const correctCount = Object.values(characterStates).filter(
  s => s === 'correct' || s === 'corrected'
).length;
const totalTyped = correctCount + totalErrors;
const accuracy = (correctCount / totalTyped) * 100;
```

**Problem:** If you typed a character wrong 3 times before getting it right, `totalErrors` would increment by 3, unfairly lowering your accuracy.

### Example Scenario (Old Calculation)
- Typing "hello" (5 characters)
- Position 1 ('e'): typed wrong 3 times, then correct
- All other characters: correct on first attempt

**Old calculation:**
- `correctCount` = 5 (all eventually correct)
- `totalErrors` = 3 (counted each typo)
- `totalTyped` = 5 + 3 = 8
- `accuracy` = 5/8 = **62.5%** ❌ (incorrect!)

**Should be:**
- 4 characters correct on first attempt
- 1 character with errors (regardless of how many attempts)
- `accuracy` = 4/5 = **80%** ✅ (correct!)

## New Calculation (Correct)

```javascript
// Count characters by state
const correctOnFirstAttempt = Object.values(characterStates).filter(
  s => s === 'correct'
).length;
const correctedAfterErrors = Object.values(characterStates).filter(
  s => s === 'corrected'
).length;
const totalCharactersTyped = correctOnFirstAttempt + correctedAfterErrors;

// Accuracy based on unique character positions
const accuracy = totalCharactersTyped > 0
  ? (correctOnFirstAttempt / totalCharactersTyped) * 100
  : 100;
```

**Formula:**
```
accuracy = (characters correct on first attempt) / (total characters typed) * 100
```

OR equivalently:
```
accuracy = (characters typed - unique positions with errors) / (characters typed) * 100
```

## Character States Explained

The code tracks three states for each character position:

1. **`'correct'`** - Typed correctly on **first attempt**
   - Never appeared in `characterErrorHistory` Set
   - User typed the right character immediately

2. **`'corrected'`** - Had error(s), but **eventually typed correctly**
   - Position exists in `characterErrorHistory` Set
   - User made one or more typos, then finally got it right
   - **Counts as 1 error regardless of how many attempts**

3. **`'error'`** - Currently **in error state** (not yet corrected)
   - User has NOT advanced past this character yet
   - Not included in total characters typed (incomplete)

## Error Tracking

`characterErrorHistory` is a JavaScript `Set` that tracks unique character positions with errors:

```javascript
const characterErrorHistory = new Set();

// Position 2 typed wrong multiple times
characterErrorHistory.add(2); // size = 1
characterErrorHistory.add(2); // size = 1 (Set prevents duplicates)
characterErrorHistory.add(2); // size = 1

// Different positions
characterErrorHistory.add(5); // size = 2
characterErrorHistory.add(8); // size = 3
```

**Key Property:** `Set.size` gives us the count of **unique positions** with errors.

## Examples

### Example 1: Perfect Typing
```javascript
characterStates = {
  0: 'correct',  // h
  1: 'correct',  // e
  2: 'correct',  // l
  3: 'correct',  // l
  4: 'correct',  // o
};

correctOnFirstAttempt = 5
totalCharactersTyped = 5
accuracy = 5/5 * 100 = 100%
```

### Example 2: One Error (Multiple Attempts)
```javascript
characterStates = {
  0: 'correct',    // h - correct
  1: 'corrected',  // e - typed wrong 3 times, then correct
  2: 'correct',    // l - correct
  3: 'correct',    // l - correct
  4: 'correct',    // o - correct
};

characterErrorHistory = Set([1])  // Only position 1 had errors

correctOnFirstAttempt = 4
correctedAfterErrors = 1
totalCharactersTyped = 5
accuracy = 4/5 * 100 = 80%
```

### Example 3: Multiple Errors
```javascript
characterStates = {
  0: 'correct',    // h
  1: 'corrected',  // e - error
  2: 'correct',    // l
  3: 'corrected',  // l - error
  4: 'corrected',  // o - error
};

characterErrorHistory = Set([1, 3, 4])  // 3 unique positions

correctOnFirstAttempt = 2
correctedAfterErrors = 3
totalCharactersTyped = 5
accuracy = 2/5 * 100 = 40%
```

### Example 4: Still Typing (Error State)
```javascript
characterStates = {
  0: 'correct',
  1: 'correct',
  2: 'error',      // Currently stuck on this character
  // Positions 3+ not reached yet
};

correctOnFirstAttempt = 2
correctedAfterErrors = 0
totalCharactersTyped = 2  // Only count completed characters
accuracy = 2/2 * 100 = 100%
```

## Backend Changes

Updated schema descriptions in `backend/app/schemas/telemetry.py`:

```python
class SessionEnd(BaseModel):
    accuracy: float = Field(
        ...,
        ge=0,
        le=100,
        description="Accuracy percentage (characters correct on first attempt / total characters typed)"
    )
    correct_characters: int = Field(
        ...,
        ge=0,
        description="Total characters typed (includes corrected characters)"
    )
    incorrect_characters: int = Field(
        ...,
        ge=0,
        description="Unique character positions with errors (repeated typos at same position count as one)"
    )
```

**Note:** Backend doesn't calculate accuracy - it receives and stores the value from frontend. These field names now accurately reflect their meaning.

## Validation Formula

The backend could validate accuracy using:

```python
accuracy = ((correct_characters - incorrect_characters) / correct_characters) * 100
```

Where:
- `correct_characters` = total characters typed (correct + corrected)
- `incorrect_characters` = unique positions with errors (Set size)

This equals:
- `accuracy = (characters correct on first attempt / total typed) * 100`

## Testing

Created comprehensive test suite: `src/__tests__/accuracyCalculation.test.js`

Test cases cover:
- ✅ 100% accuracy (no errors)
- ✅ 80% accuracy (1 error position out of 5)
- ✅ Repeated typos at same position = 1 error
- ✅ 50% accuracy (half errors)
- ✅ 0% accuracy (all corrected)
- ✅ Empty state edge case
- ✅ Characters still in error state (not counted)
- ✅ Real typing scenarios
- ✅ Mixed completion states
- ✅ Single character cases
- ✅ Set-based error counting

Run tests:
```bash
npm test -- accuracyCalculation.test.js
```

## Files Modified

1. **`frontend/src/App.jsx`**
   - Updated `calculateStats()` function (lines 305-334)
   - Updated `calculateFinalStats()` function (lines 336-367)
   - Changed `errorCount` from `totalErrors` to `characterErrorHistory.size`

2. **`backend/app/schemas/telemetry.py`**
   - Updated field descriptions for `accuracy`, `correct_characters`, `incorrect_characters` (lines 50-53)

3. **`frontend/src/__tests__/accuracyCalculation.test.js`** (NEW)
   - 11 test cases for accuracy calculation
   - 3 test cases for error counting with Sets

## Benefits

### Before Fix
- ❌ Unfair penalty for multiple attempts at same character
- ❌ Accuracy could be misleadingly low (62.5% for 1 error position)
- ❌ Discouraging for users who self-correct

### After Fix
- ✅ Fair measurement: 1 error position = 1 error (80% for 1 error out of 5)
- ✅ Encourages self-correction (fixing typos doesn't multiply the penalty)
- ✅ Aligns with user intent: "How many character positions did I get wrong?"
- ✅ More intuitive and motivating metric

## Migration Notes

- **No database migration required** - accuracy is calculated on the fly
- **No breaking changes** - API schema remains the same, only descriptions updated
- **Backward compatible** - old sessions keep their original accuracy values
- **New sessions** will use the improved calculation going forward

## User Impact

Users will notice:
- **Higher accuracy scores** for the same typing performance (more fair)
- **More consistent** accuracy between similar typing patterns
- **Less punishment** for self-correction
- **More intuitive** metric that matches their mental model

---

**Update Date:** 2025-12-17
**Updated By:** Claude Code
**Testing Status:** Comprehensive unit tests added and passing
