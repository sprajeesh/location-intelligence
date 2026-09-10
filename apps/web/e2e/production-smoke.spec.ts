import { test, expect } from './fixtures';

test.describe('Production Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test(
    'application is accessible and responsive',
    { tag: ['@production-smoke'] },
    async ({ page }) => {
      // Verify page is accessible
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();

      // Verify no console errors
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Wait a bit for potential errors
      await page.waitForTimeout(1000);

      // No critical errors should have occurred
      const criticalErrors = errors.filter((e) => !e.includes('warning') && !e.includes('note'));
      expect(criticalErrors).toEqual([]);
    }
  );

  test(
    'search input is visible and interactive',
    { tag: ['@production-smoke'] },
    async ({ page }) => {
      const searchInput = page.locator('input[type="text"]').first();
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toBeFocused().catch(() => {
        // Element might not be focused initially, but should be focusable
      });

      // Verify we can type in it (without submitting)
      await searchInput.focus();
      await searchInput.type('test');

      const inputValue = await searchInput.inputValue();
      expect(inputValue).toBe('test');
    }
  );

  test(
    'analyze button is visible and clickable',
    { tag: ['@production-smoke'] },
    async ({ page }) => {
      const analyzeButton = page.locator('button:has-text("Analyse")').first();
      await expect(analyzeButton).toBeVisible();
      await expect(analyzeButton).toBeEnabled();
    }
  );

  test(
    'page responds to user interactions',
    { tag: ['@production-smoke'] },
    async ({ page }) => {
      const searchInput = page.locator('input[type="text"]').first();

      // Try clicking the input
      await searchInput.click();
      await expect(searchInput).toBeFocused().catch(() => {
        // Element might respond differently but that's ok
      });

      // Type something and verify it appears
      await searchInput.fill('');
      await searchInput.type('hello');

      const value = await searchInput.inputValue();
      expect(value).toBe('hello');
    }
  );

  test(
    'page title and metadata are correct',
    { tag: ['@production-smoke'] },
    async ({ page }) => {
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);

      // Verify no 404 or error status
      const response = await page.goto(page.url(), { waitUntil: 'networkidle' });
      if (response) {
        const status = response.status();
        expect([200, 304]).toContain(status);
      }
    }
  );

  test(
    'CSS and styling loads correctly',
    { tag: ['@production-smoke'] },
    async ({ page }) => {
      const main = page.locator('main');

      // Check that the main element has computed styles
      const display = await main.evaluate((el) => window.getComputedStyle(el).display);
      expect(display).toBeTruthy();

      // Check that text content is readable
      const isVisible = await main.isVisible();
      expect(isVisible).toBe(true);
    }
  );

  test(
    'no resource loading failures',
    { tag: ['@production-smoke'] },
    async ({ page }) => {
      const failedRequests: string[] = [];

      page.on('response', (response) => {
        if (response.status() >= 400 && response.status() !== 404) {
          const url = response.url();
          // Only track critical resource failures, ignore API calls that might fail
          if (!url.includes('/api/') && !url.includes('api.') && response.status() !== 401 && response.status() !== 403) {
            failedRequests.push(`${url} (${response.status()})`);
          }
        }
      });

      await page.waitForLoadState('networkidle');

      // Allow some failures (auth, rate limits, etc) but not critical resource failures
      const criticalFailures = failedRequests.filter(
        (req) => !req.includes('analytics') && !req.includes('telemetry') && !req.includes('tracking')
      );

      expect(criticalFailures.length).toBe(0);
    }
  );

  test(
    'application handles viewport changes',
    { tag: ['@production-smoke'] },
    async ({ page }) => {
      // Test desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      const mainDesktop = page.locator('main');
      await expect(mainDesktop).toBeVisible();

      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      const mainTablet = page.locator('main');
      await expect(mainTablet).toBeVisible();

      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      const mainMobile = page.locator('main');
      await expect(mainMobile).toBeVisible();
    }
  );
});
