import { test as baseTest, expect } from '@playwright/test';

type Fixtures = {};

export const test = baseTest.extend<Fixtures>({});

export { expect };

/**
 * Common test data for E2E tests
 */
export const TEST_DATA = {
  addresses: {
    valid: {
      displayName: 'Parliament House, Wellington',
      lat: -41.2865,
      lon: 174.7762,
    },
    newZealand: {
      displayName: 'Auckland City Centre',
      lat: -37.0082,
      lon: 174.7850,
    },
    southernArea: {
      displayName: 'Dunedin Central',
      lat: -45.8787,
      lon: 170.5028,
    },
  },
};

/**
 * Common selectors used across tests
 */
export const selectors = {
  searchInput: '[placeholder*="address" i], [placeholder*="search" i]',
  searchButton: 'button:has-text("Analyse")',
  scoreDisplay: '[data-testid="location-score"], text=/Score|Location Score/i',
  facilitiesPanel: '[data-testid="facilities-panel"], text=/Facilities/i',
  loadingState: 'text=/Loading|Analyzing/i',
  errorMessage: '[data-testid="error-message"], text=/Error|Something went wrong/i',
  mapContainer: '[data-testid="map-container"], iframe[src*="leaflet"]',
  categorySection: '[data-testid="category-section"]',
  facilityItem: '[data-testid="facility-item"]',
  radiusAdjuster: '[data-testid="radius-adjuster"]',
  tabScore: 'button:has-text("Score")',
  tabFacilities: 'button:has-text("Facilities")',
};

/**
 * Helper to wait for the analysis to complete
 */
export async function waitForAnalysisComplete(page: any, timeout = 30000) {
  await page.waitForLoadState('networkidle', { timeout });
  await page.waitForTimeout(500); // Small buffer for UI updates
}

/**
 * Helper to enter and search for an address
 */
export async function searchAddress(page: any, addressQuery: string) {
  const searchInput = page.locator('input[type="text"]').first();
  await searchInput.fill(addressQuery);
  await page.waitForTimeout(500); // Wait for suggestions to appear

  // Look for the first suggestion in the dropdown
  const firstSuggestion = page.locator('[role="option"], li:has-text("Parliament"), li:first').first();
  if (await firstSuggestion.isVisible({ timeout: 5000 }).catch(() => false)) {
    await firstSuggestion.click();
  } else {
    // If no dropdown, just press Enter
    await searchInput.press('Enter');
  }
}

/**
 * Helper to analyze the selected address
 */
export async function analyzeAddress(page: any) {
  const analyzeButton = page.locator('button:has-text("Analyse")').first();
  await analyzeButton.click();
  await waitForAnalysisComplete(page);
}

/**
 * Helper to verify location score is displayed
 */
export async function verifyScoreDisplayed(page: any) {
  // Look for score display in various forms
  const scoreLocators = [
    page.locator('[data-testid="location-score"]'),
    page.locator('text=/Score.*\/.*10/'),
    page.locator('text=/Location Score/'),
  ];

  for (const locator of scoreLocators) {
    if (await locator.isVisible({ timeout: 5000 }).catch(() => false)) {
      return true;
    }
  }
  return false;
}

/**
 * Helper to get visible facility items
 */
export async function getFacilityItems(page: any) {
  const items = page.locator('[data-testid="facility-item"], li:has([data-testid="facility-item"]), div:has-text(/Distance:|km/i)');
  return items;
}

/**
 * Helper to check if facilities are displayed
 */
export async function verifyFacilitiesDisplayed(page: any) {
  const facilities = await getFacilityItems(page);
  const count = await facilities.count();
  return count > 0;
}
