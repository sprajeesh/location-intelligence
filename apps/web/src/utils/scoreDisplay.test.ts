import type { CategoryScoreResult, FacilityScoreResult } from '@/types/api';
import {
  CATEGORY_DISPLAY_ORDER,
  formatScoreValue,
  getScoreColorTier,
  parseCoverage,
  resolveFacilityDisplayStatus,
  sortCategoriesForDisplay,
  sortFacilitiesForDisplay,
} from './scoreDisplay';

describe('formatScoreValue', () => {
  it('renders a dash for null', () => {
    expect(formatScoreValue(null)).toBe('—');
  });

  it('rounds to the nearest integer', () => {
    expect(formatScoreValue(28.4)).toBe('28');
    expect(formatScoreValue(28.6)).toBe('29');
  });

  it('renders zero as "0", not a dash', () => {
    expect(formatScoreValue(0)).toBe('0');
  });
});

describe('parseCoverage', () => {
  it('parses a well-formed coverage string', () => {
    expect(parseCoverage('2/5')).toEqual({ scored: 2, total: 5 });
  });

  it('falls back to zeros for a malformed string', () => {
    expect(parseCoverage('')).toEqual({ scored: 0, total: 0 });
    expect(parseCoverage('garbage')).toEqual({ scored: 0, total: 0 });
  });
});

describe('getScoreColorTier', () => {
  it('returns unscored for null', () => {
    expect(getScoreColorTier(null)).toBe('unscored');
  });

  it('handles the good/moderate/poor boundaries', () => {
    expect(getScoreColorTier(70)).toBe('good');
    expect(getScoreColorTier(69)).toBe('moderate');
    expect(getScoreColorTier(50)).toBe('moderate');
    expect(getScoreColorTier(49)).toBe('poor');
    expect(getScoreColorTier(0)).toBe('poor');
  });
});

describe('sortCategoriesForDisplay', () => {
  const makeCategory = (category: CategoryScoreResult['category']): CategoryScoreResult => ({
    category,
    status: 'scored',
    score: 50,
    facilities: [],
  });

  it('sorts a shuffled array into the canonical display order', () => {
    const shuffled = [
      makeCategory('recreation'),
      makeCategory('shopping'),
      makeCategory('education'),
      makeCategory('healthcare'),
      makeCategory('transport'),
    ];

    const sorted = sortCategoriesForDisplay(shuffled).map((c) => c.category);
    expect(sorted).toEqual(CATEGORY_DISPLAY_ORDER);
  });
});

describe('sortFacilitiesForDisplay', () => {
  const makeFacility = (facilityType: string): FacilityScoreResult => ({
    facilityType,
    status: 'scored',
    score: 50,
    nearestDistanceKm: 1,
    count: 1,
    explanation: '',
  });

  it('sorts facilities within a category into the canonical order', () => {
    const shuffled = [makeFacility('universities'), makeFacility('schools')];
    const sorted = sortFacilitiesForDisplay('education', shuffled).map((f) => f.facilityType);
    expect(sorted).toEqual(['schools', 'universities']);
  });
});

describe('resolveFacilityDisplayStatus', () => {
  it('returns not_checked when the facility was never evaluated', () => {
    const facility: FacilityScoreResult = {
      facilityType: 'parks',
      status: 'not_checked',
      score: null,
      nearestDistanceKm: null,
      count: 0,
      explanation: 'Park not checked for this address.',
    };
    expect(resolveFacilityDisplayStatus(facility)).toBe('not_checked');
  });

  it('returns no_data_found when checked but nothing was found', () => {
    const facility: FacilityScoreResult = {
      facilityType: 'hospitals',
      status: 'scored',
      score: 0,
      nearestDistanceKm: null,
      count: 0,
      explanation: 'No hospital found nearby.',
    };
    expect(resolveFacilityDisplayStatus(facility)).toBe('no_data_found');
  });

  it('returns scored when checked and something was found, even at a low score', () => {
    const facility: FacilityScoreResult = {
      facilityType: 'bus_stops',
      status: 'scored',
      score: 0,
      nearestDistanceKm: 1.63,
      count: 1,
      explanation: 'Nearest bus stop is 1.6 km away by walk.',
    };
    expect(resolveFacilityDisplayStatus(facility)).toBe('scored');
  });
});
