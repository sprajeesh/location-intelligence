import { getHazardCellColor, HAZARD_COLOR_STOPS } from './hazardColor';

describe('getHazardCellColor', () => {
  it('returns the safest (lowest) color for a score of 0', () => {
    expect(getHazardCellColor(0)).toBe(HAZARD_COLOR_STOPS[0]!.color);
  });

  it('returns the most severe color for a score of 100', () => {
    expect(getHazardCellColor(100)).toBe(HAZARD_COLOR_STOPS[HAZARD_COLOR_STOPS.length - 1]!.color);
  });

  it('picks the correct stop for a mid-range score', () => {
    // 50 falls in the (43-57] "Moderate" bucket
    expect(getHazardCellColor(50)).toBe('#f7f7f7');
  });

  it('is inclusive at stop boundaries', () => {
    expect(getHazardCellColor(14)).toBe('#2166ac');
    expect(getHazardCellColor(14.01)).toBe('#67a9cf');
  });

  it('falls back to the most severe color above the highest stop', () => {
    expect(getHazardCellColor(150)).toBe(HAZARD_COLOR_STOPS[HAZARD_COLOR_STOPS.length - 1]!.color);
  });
});
