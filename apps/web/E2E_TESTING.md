# E2E Testing with Playwright

This document explains how to run and maintain E2E tests for the Location Intelligence web application.

## Overview

The E2E test suite uses [Playwright](https://playwright.dev/) to test the application end-to-end across real user workflows. Tests are organized by feature and tagged for flexible execution.

## Test Organization

Tests are located in the `e2e/` directory and organized by feature:

- **`location-analysis.spec.ts`** — Tests for the core address search and analysis workflow
- **`navigation-and-routing.spec.ts`** — Tests for navigation, locale switching, and page routing
- **`production-smoke.spec.ts`** — Safe tests that can run against production
- **`accessibility.spec.ts`** — Accessibility and keyboard navigation tests
- **`fixtures.ts`** — Shared test utilities, selectors, and helper functions

## Test Tags

Tests are tagged to support different execution contexts:

- **`@smoke`** — Minimal smoke tests proving the app works (5–10 tests)
- **`@critical`** — Important business workflows (must work for the app to be usable)
- **`@regression`** — Broader coverage including edge cases and failure scenarios
- **`@production-smoke`** — Safe tests that can run against deployed production without creating/modifying data

A test can have multiple tags (e.g., `@smoke` and `@critical`).

## Running Tests Locally

### Prerequisites

Ensure services are running locally:

```bash
# Start services (API, PostGIS, Redis, OSRM)
pnpm services:up

# In a separate terminal, start the Next.js dev server
pnpm dev:web
```

The app will be available at `http://localhost:3000` and the API at `http://localhost:8000`.

### Run All Tests

```bash
pnpm test:e2e
```

### Run Smoke Tests Only

```bash
pnpm test:e2e:smoke
```

This is the fastest suite and useful for quick feedback during development.

### Run Critical Tests

```bash
pnpm test:e2e:critical
```

### Run Regression Tests

```bash
pnpm test:e2e:regression
```

This runs all tests including regression coverage.

### Run Production Smoke Tests

```bash
pnpm test:e2e:production-smoke
```

These tests are safe to run against production and verify basic functionality without modifying data.

### Interactive UI Mode

For debugging and development:

```bash
pnpm test:e2e:ui
```

This opens an interactive UI where you can:
- Watch tests run step-by-step
- Inspect elements
- Re-run individual tests
- View traces and videos

### Debug Mode

To debug a single test:

```bash
pnpm test:e2e:debug
```

This opens Playwright Inspector, allowing you to step through test execution.

## Configuration

The Playwright configuration is in `playwright.config.ts`. Key settings:

- **`baseURL`** — Points to `http://localhost:3000` by default (override with `PLAYWRIGHT_TEST_BASE_URL`)
- **`webServer`** — Automatically starts the dev server unless in CI
- **`workers`** — Uses all available CPU cores locally; 1 worker in CI
- **`retries`** — 0 retries locally; 2 retries in CI
- **`reporter`** — Generates HTML report, JSON results, and list output

### Environment Variables

- `PLAYWRIGHT_TEST_BASE_URL` — Override the application base URL
- `PLAYWRIGHT_TEST_API_URL` — Override the API URL (for future use)
- `CI` — Set automatically in CI; enables CI-specific behavior

## Writing Tests

### Test Structure

Tests follow this pattern:

```typescript
import { test, expect } from './fixtures';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test(
    'description of what the test does',
    { tag: ['@smoke', '@critical'] },
    async ({ page }) => {
      // Arrange: Set up test data or state
      // Act: Perform user actions
      // Assert: Verify outcomes
    }
  );
});
```

### Locators

Prefer accessible locators that match how users interact with the app:

```typescript
// Good: Semantic, accessible
page.getByRole('button', { name: 'Analyse' })
page.getByLabel('Address')
page.getByPlaceholder('Enter address')
page.getByText('Location Score')

// Acceptable: Test IDs when semantic selectors don't work
page.getByTestId('facility-item')

// Avoid: CSS classes, nth-child selectors, implementation details
page.locator('.css-12345')
page.locator('div:nth-child(3)')
```

### Helpers

Use helpers from `fixtures.ts` for common operations:

```typescript
import {
  searchAddress,
  analyzeAddress,
  verifyScoreDisplayed,
  verifyFacilitiesDisplayed,
  waitForAnalysisComplete,
} from './fixtures';

// Example
await searchAddress(page, 'Wellington');
await analyzeAddress(page);
const scoreDisplayed = await verifyScoreDisplayed(page);
expect(scoreDisplayed).toBeTruthy();
```

### Waiting and Synchronization

Avoid fixed `await page.waitForTimeout(5000)` sleeps. Instead:

```typescript
// Wait for navigation to complete
await page.waitForLoadState('networkidle');

// Wait for a specific element
await expect(page.getByText('Location Score')).toBeVisible();

// Wait for an action to complete
await page.getByRole('button', { name: 'Analyse' }).click();
await page.waitForLoadState('networkidle');
```

## CI/CD Integration

### GitHub Actions Workflow

The test suite integrates with GitHub Actions (`.github/workflows/push.yml`):

1. **PR/Push** — Runs smoke tests (`@smoke`) for fast feedback
2. **Merge to main** — Runs full suite (all tags)
3. **Post-deploy** — Runs production smoke tests against production

### Test Results

- Test results are uploaded as artifacts and available for download
- Playwright HTML reports are generated for detailed analysis
- Failed tests upload traces and videos for debugging

## Best Practices

### Test Independence

- Each test must be independent and not rely on others running first
- Set up required state (via fixtures, API calls, or UI setup) within each test
- Clean up after tests if needed (tests run in isolation, so cleanup is usually not required)

### Deterministic Data

- Use consistent test data (see `TEST_DATA` in `fixtures.ts`)
- Avoid depending on real-time data, random data, or uncontrolled external services
- Mock external services where appropriate to ensure reliability

### Assertions

Verify meaningful user-visible outcomes:

```typescript
// Good: Verifies user-visible result
await expect(page.getByText('Location Score')).toBeVisible();

// Avoid: Tests implementation details
expect(await page.evaluate(() => localStorage.getItem('state'))).toBe('...');
```

### Error Handling

- Tests should be robust to timing issues and network flakiness
- Use `.catch(() => false)` or optional assertions for non-critical checks
- Fix flaky tests by improving synchronization, not by adding retries

### Performance

- Smoke tests should complete in <1 minute total
- Individual tests should complete in <30 seconds
- Minimize third-party API calls; use mocks where appropriate

## Troubleshooting

### Test Timeouts

If tests timeout:

1. Check that services are running (`pnpm services:up`)
2. Verify the app is accessible at `http://localhost:3000`
3. Check for network issues or slow API responses
4. Use `pnpm test:e2e:debug` to step through the test

### Element Not Found

If a test fails to find an element:

1. Verify the element exists on the page
2. Check for dynamic content loading — use proper waiting mechanisms
3. Inspect the element with browser dev tools to find a better selector
4. Update `fixtures.ts` if a selector has changed

### Flaky Tests

If tests pass/fail inconsistently:

1. Review the test for fixed `waitForTimeout()` calls — replace with proper waits
2. Check for timing-dependent assertions (e.g., checking for presence before it loads)
3. Use the Playwright Inspector (`pnpm test:e2e:debug`) to understand timing
4. Consider using `.catch()` for non-critical checks that may be timing-sensitive

### CI-Only Failures

If tests pass locally but fail in CI:

1. Check network/connectivity differences
2. Verify environment variables are set correctly
3. Review CI logs and Playwright reports for clues
4. Use `--screenshot=on` to see what the page looked like when it failed

## Maintenance

### Adding New Tests

1. Identify the feature/user journey
2. Create a new test file or add to an existing one
3. Use helpers from `fixtures.ts`
4. Apply appropriate tags (`@smoke`, `@critical`, `@regression`, etc.)
5. Verify tests pass locally: `pnpm test:e2e`

### Updating Selectors

When UI components change:

1. Find all tests using the old selector
2. Update the selector to match the new UI
3. Verify the new selector works: `pnpm test:e2e:ui`
4. Commit the changes

### Deprecating Tests

If a feature is removed:

1. Remove or archive the test file
2. Update this documentation
3. Verify remaining tests still pass

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Debugging](https://playwright.dev/docs/debug)
- [Locator Documentation](https://playwright.dev/docs/locators)

## Questions?

Refer to the project's CONTRIBUTING.md or ask in the project repository issues.
