import { useLocationStore } from './index';

// Covers just the facility-marker-visibility slice of the store -- the part
// touched by merging the Nearby Facilities tab's marker toggle into the
// Score tab (category-level bulk toggle + individual facility toggle).
describe('useLocationStore - facility visibility', () => {
  beforeEach(() => {
    useLocationStore.setState({ visibleFacilityIds: new Set() });
  });

  it('starts with no facilities visible', () => {
    expect(useLocationStore.getState().visibleFacilityIds.size).toBe(0);
  });

  it('toggleFacilityVisibility shows a hidden facility', () => {
    useLocationStore.getState().toggleFacilityVisibility('school-1');
    expect(useLocationStore.getState().visibleFacilityIds.has('school-1')).toBe(true);
  });

  it('toggleFacilityVisibility hides an already-visible facility', () => {
    useLocationStore.getState().toggleFacilityVisibility('school-1');
    useLocationStore.getState().toggleFacilityVisibility('school-1');
    expect(useLocationStore.getState().visibleFacilityIds.has('school-1')).toBe(false);
  });

  it('toggleFacilityVisibility only affects the given facility', () => {
    useLocationStore.getState().toggleFacilityVisibility('school-1');
    useLocationStore.getState().toggleFacilityVisibility('school-2');
    useLocationStore.getState().toggleFacilityVisibility('school-1');
    expect(useLocationStore.getState().visibleFacilityIds.has('school-1')).toBe(false);
    expect(useLocationStore.getState().visibleFacilityIds.has('school-2')).toBe(true);
  });

  it('setFacilitiesVisibility(ids, true) shows every given facility at once', () => {
    useLocationStore.getState().setFacilitiesVisibility(['school-1', 'school-2'], true);
    const { visibleFacilityIds } = useLocationStore.getState();
    expect(visibleFacilityIds.has('school-1')).toBe(true);
    expect(visibleFacilityIds.has('school-2')).toBe(true);
  });

  it('setFacilitiesVisibility(ids, false) hides every given facility at once, leaving others untouched', () => {
    useLocationStore.getState().setFacilitiesVisibility(['school-1', 'school-2', 'bus-1'], true);
    useLocationStore.getState().setFacilitiesVisibility(['school-1', 'school-2'], false);
    const { visibleFacilityIds } = useLocationStore.getState();
    expect(visibleFacilityIds.has('school-1')).toBe(false);
    expect(visibleFacilityIds.has('school-2')).toBe(false);
    expect(visibleFacilityIds.has('bus-1')).toBe(true);
  });

  it('clearVisibleFacilityIds resets to an empty set', () => {
    useLocationStore.getState().setFacilitiesVisibility(['school-1', 'school-2'], true);
    useLocationStore.getState().clearVisibleFacilityIds();
    expect(useLocationStore.getState().visibleFacilityIds.size).toBe(0);
  });
});
