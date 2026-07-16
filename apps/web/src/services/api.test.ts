import { normalizeAnalyzeResponse } from './api';

describe('normalizeAnalyzeResponse', () => {
  const wireResponse = {
    location: { lat: -37.388, lon: 175.829, displayName: '1 Queen Street, Waihi' },
    features: [
      {
        id: 'osm_way_98653174',
        name: 'Waihi College',
        category: 'schools',
        lat: -37.386,
        lon: 175.83,
        distanceKm: 0.515,
      },
    ],
    score: {
      overall: 16.0,
      coverage: '2/5',
      categories: [
        {
          category: 'education' as const,
          status: 'scored' as const,
          score: 28.0,
          facilities: [
            {
              facility_type: 'schools',
              status: 'scored' as const,
              score: 28.0,
              nearest_distance_km: 0.52,
              count: 4,
              explanation: '1 schools within 1.0 km by walk, plus 2 more up to 1.9 km away.',
            },
            {
              facility_type: 'universities',
              status: 'not_checked' as const,
              score: null,
              nearest_distance_km: null,
              count: 0,
              explanation: 'University not checked for this address.',
            },
          ],
        },
      ],
    },
    warnings: [],
  };

  it('remaps facility_type and nearest_distance_km to camelCase', () => {
    const result = normalizeAnalyzeResponse(wireResponse);
    const facility = result.score.categories[0]!.facilities[0]!;

    expect(facility.facilityType).toBe('schools');
    expect(facility.nearestDistanceKm).toBe(0.52);
    expect(facility).not.toHaveProperty('facility_type');
    expect(facility).not.toHaveProperty('nearest_distance_km');
  });

  it('passes through fields that are already camelCase/plain unchanged', () => {
    const result = normalizeAnalyzeResponse(wireResponse);

    expect(result.location).toEqual(wireResponse.location);
    expect(result.features).toEqual(wireResponse.features);
    expect(result.warnings).toEqual(wireResponse.warnings);
    expect(result.score.overall).toBe(16.0);
    expect(result.score.coverage).toBe('2/5');
    expect(result.score.categories[0]!.category).toBe('education');
    expect(result.score.categories[0]!.status).toBe('scored');
    expect(result.score.categories[0]!.score).toBe(28.0);
  });

  it('preserves null score/count/status fields for not_checked facilities', () => {
    const result = normalizeAnalyzeResponse(wireResponse);
    const notChecked = result.score.categories[0]!.facilities[1]!;

    expect(notChecked.status).toBe('not_checked');
    expect(notChecked.score).toBeNull();
    expect(notChecked.nearestDistanceKm).toBeNull();
    expect(notChecked.count).toBe(0);
    expect(notChecked.explanation).toBe('University not checked for this address.');
  });
});
