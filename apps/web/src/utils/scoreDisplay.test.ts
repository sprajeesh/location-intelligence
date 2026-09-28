import type { CategoryScoreResult, FacilityScoreResult, ScoreResult } from '@/types/api';
import {
  buildCategoryExplainItems,
  buildOverallExplainItems,
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
    contribution: [],
  });

  it('sorts a shuffled array into the canonical display order', () => {
    const shuffled = [
      makeCategory('recreation'),
      makeCategory('shopping'),
      makeCategory('education'),
      makeCategory('healthcare'),
      makeCategory('transport'),
      makeCategory('food_and_drink'),
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
    criteria: [],
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
      criteria: [],
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
      criteria: [],
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
      criteria: [],
    };
    expect(resolveFacilityDisplayStatus(facility)).toBe('scored');
  });
});

describe('buildCategoryExplainItems', () => {
  const category: CategoryScoreResult = {
    category: 'education',
    status: 'scored',
    score: 61,
    contribution: [
      { facilityType: 'schools', weightPct: 80, score: 65 },
      { facilityType: 'universities', weightPct: 0, score: null },
    ],
    facilities: [
      {
        facilityType: 'universities',
        status: 'not_checked',
        score: null,
        nearestDistanceKm: null,
        count: 0,
        explanation: 'University not checked for this address.',
        criteria: [{ label: 'University checked', satisfied: null, detail: 'University not checked for this address.' }],
      },
      {
        facilityType: 'schools',
        status: 'scored',
        score: 65,
        nearestDistanceKm: 0.5,
        count: 2,
        explanation: '2 schools within 1.0 km by walk.',
        criteria: [{ label: 'Schools within 1.0 km', satisfied: true, detail: '2 schools within 1.0 km.' }],
      },
    ],
  };

  it('orders items by the canonical facility display order, not API array order', () => {
    const items = buildCategoryExplainItems(category);
    expect(items.map((i) => i.key)).toEqual(['schools', 'universities']);
  });

  it('tags every item as kind "facility"', () => {
    const items = buildCategoryExplainItems(category);
    expect(items.every((i) => i.kind === 'facility')).toBe(true);
  });

  it('carries over each facility\'s status, score, and criteria unchanged', () => {
    const items = buildCategoryExplainItems(category);
    const schools = items.find((i) => i.key === 'schools')!;
    expect(schools.status).toBe('scored');
    expect(schools.score).toBe(65);
    expect(schools.criteria).toEqual(category.facilities[1]!.criteria);
  });

  it('looks up weightPct from the matching contribution entry', () => {
    const items = buildCategoryExplainItems(category);
    expect(items.find((i) => i.key === 'schools')!.weightPct).toBe(80);
    expect(items.find((i) => i.key === 'universities')!.weightPct).toBe(0);
  });

  it('defaults weightPct to 0 when no contribution entry matches', () => {
    const categoryWithoutContribution: CategoryScoreResult = { ...category, contribution: [] };
    const items = buildCategoryExplainItems(categoryWithoutContribution);
    expect(items.every((i) => i.weightPct === 0)).toBe(true);
  });
});

describe('buildOverallExplainItems', () => {
  const score: ScoreResult = {
    overall: 70,
    coverage: '2/6',
    contribution: [
      { category: 'transport', weightPct: 60, score: 85 },
      { category: 'education', weightPct: 40, score: 61 },
    ],
    categories: [
      { category: 'transport', status: 'scored', score: 85, facilities: [], contribution: [] },
      { category: 'education', status: 'scored', score: 61, facilities: [], contribution: [] },
    ],
  };

  it('orders items by the canonical category display order, not API array order', () => {
    const items = buildOverallExplainItems(score);
    expect(items.map((i) => i.key)).toEqual(['education', 'transport']);
  });

  it('tags every item as kind "category"', () => {
    const items = buildOverallExplainItems(score);
    expect(items.every((i) => i.kind === 'category')).toBe(true);
  });

  it('never populates criteria -- categories have no structured criteria of their own', () => {
    const items = buildOverallExplainItems(score);
    expect(items.every((i) => i.criteria.length === 0)).toBe(true);
  });

  it('looks up weightPct from the matching contribution entry', () => {
    const items = buildOverallExplainItems(score);
    expect(items.find((i) => i.key === 'education')!.weightPct).toBe(40);
    expect(items.find((i) => i.key === 'transport')!.weightPct).toBe(60);
  });
});
