# Frontend Testing Guide

## Overview

FingerFlow frontend uses a comprehensive testing infrastructure built on **Vitest** and **React Testing Library** to ensure code quality, prevent regressions, and enable confident refactoring.

## Testing Stack

- **Vitest** - Fast, modern testing framework designed for Vite
- **React Testing Library** - Component testing with focus on user behavior
- **jsdom** - Browser environment simulation
- **@vitest/coverage-v8** - Code coverage reporting

## Running Tests

### Basic Commands

```bash
# Run all tests in watch mode
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- src/utils/__tests__/statsCalculator.test.js
```

### Watch Mode

Tests run in watch mode by default during development:
- Automatically re-run when files change
- Only re-run affected tests
- Interactive filtering and debugging

## Test Organization

```
frontend/
├── src/
│   ├── components/
│   │   ├── typing/
│   │   │   ├── SessionConfiguration.jsx
│   │   │   └── __tests__/
│   │   │       └── SessionConfiguration.test.jsx
│   │   └── sessions/
│   │       ├── ErrorAnalysis.jsx
│   │       └── __tests__/
│   │           └── ErrorAnalysis.test.jsx
│   ├── utils/
│   │   ├── statsCalculator.js
│   │   └── __tests__/
│   │       └── statsCalculator.test.js
│   ├── hooks/
│   │   ├── useTelemetry.js
│   │   └── __tests__/
│   │       └── useTelemetry.test.js
│   └── test/
│       ├── setup.js
│       ├── utils/
│       │   └── testUtils.jsx
│       └── mocks/
│           └── api.js
```

## Writing Tests

### Utility Function Tests

Utility functions are tested as pure functions with clear input/output:

```javascript
import { describe, it, expect } from 'vitest';
import { calculateStats } from '../statsCalculator';

describe('statsCalculator', () => {
  describe('calculateStats', () => {
    it('should calculate basic statistics', () => {
      const values = [10, 20, 30, 40, 50];
      const result = calculateStats(values);

      expect(result.count).toBe(5);
      expect(result.avg).toBe(30);
      expect(result.min).toBe(10);
      expect(result.max).toBe(50);
    });

    it('should handle empty array', () => {
      const result = calculateStats([]);
      expect(result).toEqual({ count: 0, avg: 0, stdDev: 0, min: 0, max: 0 });
    });
  });
});
```

### Component Tests

Components are tested from the user's perspective:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@test/utils/testUtils';
import { SessionConfiguration } from '../SessionConfiguration';

describe('SessionConfiguration', () => {
  it('should switch to timed mode when button clicked', () => {
    const setSessionMode = vi.fn();

    render(<SessionConfiguration sessionMode="wordcount" setSessionMode={setSessionMode} />);

    const timedButton = screen.getByText('Timed');
    fireEvent.click(timedButton);

    expect(setSessionMode).toHaveBeenCalledWith('timed');
  });
});
```

### Hook Tests

Hooks are tested using `renderHook`:

```javascript
import { renderHook, act } from '@testing-library/react';
import { useTelemetry } from '../useTelemetry';

describe('useTelemetry', () => {
  it('should buffer events', () => {
    const { result } = renderHook(() => useTelemetry(1, Date.now()));

    act(() => {
      result.current.addEvent('DOWN', 'KeyA', false, Date.now());
    });

    // Assertions...
  });
});
```

## Test Utilities

### Custom Render

Use `renderWithProviders` to wrap components with necessary context:

```javascript
import { renderWithProviders } from '@test/utils/testUtils';

renderWithProviders(<MyComponent />, {
  authValue: {
    isAuthenticated: true,
    user: mockUser,
  },
});
```

### Mock Helpers

Create mock data easily:

```javascript
import { createMockSession, createMockTelemetryEvents, createMockWordSet } from '@test/utils/testUtils';

const session = createMockSession({ wpm: 100 });
const events = createMockTelemetryEvents(50, 'DOWN');
const wordSet = createMockWordSet({ name: 'Custom Set' });
```

### Mocking APIs

Use centralized mock API responses:

```javascript
import { mockSessionsAPI, mockWordSetsAPI } from '@test/mocks/api';

vi.mock('../../services/api', () => ({
  sessionsAPI: mockSessionsAPI,
  wordSetsAPI: mockWordSetsAPI,
}));
```

## Coverage Goals

Our testing infrastructure enforces the following coverage thresholds:

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 75%
- **Statements**: 80%

### Viewing Coverage

```bash
# Generate and view coverage report
npm run test:coverage

# Open HTML report in browser
open coverage/index.html
```

Coverage reports show:
- Overall coverage percentages
- Line-by-line coverage visualization
- Uncovered branches and paths
- Files with low coverage

## Best Practices

### 1. Test Behavior, Not Implementation

```javascript
// ❌ Bad - Tests implementation details
expect(component.state.isOpen).toBe(true);

// ✅ Good - Tests user-visible behavior
expect(screen.getByText('Modal Content')).toBeVisible();
```

### 2. Use Semantic Queries

```javascript
// Prefer (in order):
screen.getByRole('button', { name: 'Submit' })
screen.getByLabelText('Email')
screen.getByText('Welcome')
screen.getByTestId('custom-element') // Last resort
```

### 3. Test Edge Cases

```javascript
it('should handle empty array', () => { /* ... */ });
it('should handle negative values', () => { /* ... */ });
it('should handle API errors', () => { /* ... */ });
it('should handle very large datasets', () => { /* ... */ });
```

### 4. Keep Tests Isolated

```javascript
beforeEach(() => {
  vi.clearAllMocks();
  // Reset state
});
```

### 5. Use Descriptive Test Names

```javascript
// ❌ Bad
it('works', () => { /* ... */ });

// ✅ Good
it('should calculate error rate as percentage of total keystrokes', () => { /* ... */ });
```

## Debugging Tests

### Interactive Debugging

```bash
# Use Vitest UI for visual debugging
npm run test:ui
```

### Console Debugging

```javascript
import { screen } from '@testing-library/react';

// See what's in the DOM
screen.debug();

// See specific element
screen.debug(screen.getByRole('button'));
```

### VS Code Debugging

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Vitest Debug",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal"
}
```

## Continuous Integration

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request
- Multiple Node.js versions (18.x, 20.x)

CI checks:
1. ✅ Linting
2. ✅ All tests pass
3. ✅ Coverage thresholds met
4. ✅ Build succeeds

## Common Issues

### "Cannot find module" errors

Clear cache and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Tests timing out

Increase timeout in test:
```javascript
it('should complete long operation', async () => {
  // ...
}, { timeout: 10000 }); // 10 seconds
```

### Flaky tests

Use `waitFor` for async operations:
```javascript
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Contributing

When adding new features:
1. Write tests first (TDD) or alongside code
2. Ensure all tests pass
3. Check coverage hasn't decreased
4. Follow existing test patterns
