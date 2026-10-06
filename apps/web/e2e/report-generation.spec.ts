import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * Report generation, with every backend call mocked at the network edge so the
 * flow is deterministic: search -> analyse -> "Generate report" -> toast -> PDF.
 */

const ADDRESS = { displayName: '1 Queen Street, Auckland', lat: -36.848, lon: 174.763 };
const JOB_ID = '7f1c2a9e-4d3b-4e8a-9a55-0d6f1d2b3c4d';
const PDF_BYTES = Buffer.from('%PDF-1.4\n% e2e fixture\n%%EOF');

const analyzeResponse = {
  location: ADDRESS,
  features: [
    { id: 'osm_node_1', name: 'Ponsonby Primary', category: 'schools', lat: -36.85, lon: 174.76, distanceKm: 0.4 },
  ],
  warnings: [],
  score: {
    overall: 62,
    coverage: '1/5',
    contribution: [{ category: 'education', weight_pct: 100, score: 62 }],
    categories: [
      {
        category: 'education',
        status: 'scored',
        score: 62,
        contribution: [{ facility_type: 'schools', weight_pct: 100, score: 62 }],
        facilities: [
          {
            facility_type: 'schools',
            status: 'scored',
            score: 62,
            nearest_distance_km: 0.4,
            count: 1,
            explanation: 'Nearest school is 0.4 km away by walk.',
            criteria: [],
            proximity_score: 80,
            density_score: 38,
            proximity_weight: 0.5,
            density_weight: 0.5,
            leg: null,
          },
        ],
      },
    ],
  },
};

async function mockBackend(page: Page, opts: { reportStatuses?: string[] } = {}) {
  const statuses = [...(opts.reportStatuses ?? ['running', 'ready'])];
  const calls = { create: 0, download: 0 };

  await page.route('**/api/search/address*', (route) =>
    route.fulfill({ json: [ADDRESS] }),
  );
  await page.route('**/api/categories', (route) =>
    route.fulfill({
      json: [
        { id: 'schools', label: 'Schools', implemented: true, color: '#F59E0B', isDefault: true, compositeCategory: 'education' },
      ],
    }),
  );
  await page.route('**/api/category-weights', (route) => route.fulfill({ json: { education: 1 } }));
  await page.route('**/api/location/analyze', (route) => route.fulfill({ json: analyzeResponse }));
  await page.route('**/api/reports', (route) => {
    calls.create += 1;
    return route.fulfill({ status: 202, json: { jobId: JOB_ID, status: 'queued' } });
  });
  await page.route(`**/api/reports/${JOB_ID}`, (route) => {
    const status = statuses.length > 1 ? statuses.shift()! : statuses[0]!;
    return route.fulfill({
      json: {
        jobId: JOB_ID,
        status,
        error: status === 'failed' ? 'Address not found' : null,
        filename: 'intelligence-report-1-queen-street-auckland.pdf',
      },
    });
  });
  await page.route(`**/api/reports/${JOB_ID}/download`, (route) => {
    calls.download += 1;
    return route.fulfill({
      status: 200,
      body: PDF_BYTES,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="intelligence-report-1-queen-street-auckland.pdf"',
      },
    });
  });
  return calls;
}

async function analyseAddress(page: Page) {
  await page.goto('/');
  const search = page.locator('input[type="text"]').first();
  await search.fill('1 Queen');
  await page.locator('[role="listbox"] [role="option"]').first().click();
  const analyse = page.locator('button:has-text("Analyse")').first();
  if (await analyse.isVisible({ timeout: 2000 }).catch(() => false)) {
    await analyse.click();
  }
}

test.describe('Address intelligence report', () => {
  test(
    'generate -> toast -> download delivers a PDF',
    { tag: ['@critical', '@regression'] },
    async ({ page }) => {
      const calls = await mockBackend(page);
      await analyseAddress(page);

      const generate = page.getByRole('button', { name: 'Generate report' });
      await expect(generate).toBeVisible({ timeout: 15000 });
      await expect(generate).toBeEnabled();
      await generate.click();

      await expect(page.getByRole('button', { name: /Generating report/ })).toBeDisabled();

      const toast = page.getByRole('alert').filter({ hasText: 'Your report is ready.' });
      await expect(toast).toBeVisible({ timeout: 15000 });

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        toast.getByRole('button', { name: 'Download' }).click(),
      ]);
      expect(download.suggestedFilename()).toBe('intelligence-report-1-queen-street-auckland.pdf');
      expect(calls.create).toBe(1);
      expect(calls.download).toBe(1);
    },
  );

  test(
    'a failed job shows an error toast with Retry',
    { tag: ['@regression'] },
    async ({ page }) => {
      await mockBackend(page, { reportStatuses: ['failed'] });
      await analyseAddress(page);

      await page.getByRole('button', { name: 'Generate report' }).click();
      const toast = page.getByRole('alert').filter({ hasText: "Couldn't generate the report." });
      await expect(toast).toBeVisible({ timeout: 15000 });
      await expect(toast).toContainText('Address not found');
      await expect(toast.getByRole('button', { name: 'Retry' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Generate report' })).toBeEnabled();
    },
  );
});
