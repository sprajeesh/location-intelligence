import { useLocationStore } from './index';
import type { Feature } from '@/types/api';
import type { ParcelFeature } from '@/types/parcel';

// Covers clearMapOverlays -- resets every facility marker, tooltip,
// navigation, and parcel overlay so a cleared/changed address search starts
// from a clean slate on the map.
describe('useLocationStore - clearMapOverlays', () => {
  const mockFeature = { id: 'school-1', lat: -36.85, lon: 174.76 } as Feature;
  const mockParcelFeature = {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [] },
    properties: {},
  } as unknown as ParcelFeature;

  beforeEach(() => {
    useLocationStore.setState({
      analysisResult: { features: [mockFeature] } as any,
      visibleFacilityIds: new Set(['school-1']),
      selectedFeature: mockFeature,
      activeRoute: [
        [-36.85, 174.76],
        [-36.86, 174.77],
      ],
      isNavigating: true,
      routeMode: 'walking',
      navigateFrom: { displayName: 'A', lat: -36.85, lon: 174.76 },
      navigateTo: { displayName: 'B', lat: -36.86, lon: 174.77 },
      parcelFeature: mockParcelFeature,
    });
  });

  it('clears facility markers, tooltip, route, navigation, and parcel state', () => {
    useLocationStore.getState().clearMapOverlays();

    const state = useLocationStore.getState();
    expect(state.analysisResult).toBeNull();
    expect(state.visibleFacilityIds.size).toBe(0);
    expect(state.selectedFeature).toBeNull();
    expect(state.activeRoute).toBeNull();
    expect(state.isNavigating).toBe(false);
    expect(state.routeMode).toBe('driving');
    expect(state.navigateFrom).toBeNull();
    expect(state.navigateTo).toBeNull();
    expect(state.parcelFeature).toBeNull();
  });

  it('leaves the selected address untouched', () => {
    const address = { displayName: 'Kept', lat: -36.85, lon: 174.76 };
    useLocationStore.setState({ selectedAddress: address });

    useLocationStore.getState().clearMapOverlays();

    expect(useLocationStore.getState().selectedAddress).toBe(address);
  });
});
