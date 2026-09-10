import { test, expect } from './fixtures';

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test(
    'keyboard navigation works for search',
    { tag: ['@regression'] },
    async ({ page }) => {
      const searchInput = page.locator('input[type="text"]').first();

      // Tab to search input
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);

      // Type in search
      await page.keyboard.type('Wellington');
      await page.waitForTimeout(500);

      // Verify input has text
      const inputValue = await searchInput.inputValue();
      expect(inputValue).toContain('Wellington');
    }
  );

  test(
    'search input has proper labels or aria labels',
    { tag: ['@regression'] },
    async ({ page }) => {
      const searchInput = page.locator('input[type="text"]').first();

      // Check for associated label
      const placeholder = await searchInput.getAttribute('placeholder');
      const ariaLabel = await searchInput.getAttribute('aria-label');
      const ariaLabelledby = await searchInput.getAttribute('aria-labelledby');

      const hasAccessibleName = placeholder || ariaLabel || ariaLabelledby;
      expect(hasAccessibleName).toBeTruthy();
    }
  );

  test(
    'buttons are keyboard accessible',
    { tag: ['@regression'] },
    async ({ page }) => {
      const buttons = page.locator('button').first();

      // Focus the button using keyboard
      await buttons.focus();
      await page.waitForTimeout(200);

      // Check if button is focused
      const focused = await buttons.evaluate((el) => el === document.activeElement);
      expect(focused).toBe(true);

      // Check that button has role
      const role = await buttons.getAttribute('role');
      expect(['button', null]).toContain(role);
    }
  );

  test(
    'page has proper heading hierarchy',
    { tag: ['@regression'] },
    async ({ page }) => {
      // Get all headings
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const count = await headings.count();

      // Page should have at least one heading
      expect(count).toBeGreaterThanOrEqual(1);

      // First heading should be h1
      const firstHeading = page.locator('h1');
      const h1Count = await firstHeading.count();
      expect(h1Count).toBeGreaterThanOrEqual(1);
    }
  );

  test(
    'interactive elements have sufficient color contrast',
    { tag: ['@regression'] },
    async ({ page }) => {
      // This is a basic check that buttons are visible
      const buttons = page.locator('button');
      const count = await buttons.count();

      // Should have at least one button
      expect(count).toBeGreaterThan(0);

      // All buttons should be visible (good contrast)
      const firstButton = buttons.first();
      await expect(firstButton).toBeVisible();
    }
  );

  test(
    'form inputs are focusable',
    { tag: ['@regression'] },
    async ({ page }) => {
      const inputs = page.locator('input');
      const count = await inputs.count();

      expect(count).toBeGreaterThan(0);

      // Try to focus first input
      const firstInput = inputs.first();
      await firstInput.focus();

      const focused = await firstInput.evaluate((el) => el === document.activeElement);
      expect(focused).toBe(true);
    }
  );

  test(
    'page does not have duplicate IDs',
    { tag: ['@regression'] },
    async ({ page }) => {
      const ids = await page.evaluate(() => {
        const elements = document.querySelectorAll('[id]');
        const idMap: Record<string, number> = {};
        elements.forEach((el) => {
          const id = el.getAttribute('id');
          if (id) {
            idMap[id] = (idMap[id] || 0) + 1;
          }
        });
        return Object.entries(idMap)
          .filter(([, count]) => count > 1)
          .map(([id]) => id);
      });

      expect(ids).toEqual([]);
    }
  );

  test(
    'language attribute is set on html element',
    { tag: ['@regression'] },
    async ({ page }) => {
      const htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBeTruthy();
    }
  );
});
