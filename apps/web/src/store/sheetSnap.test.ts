import { useLocationStore } from './index';

describe('mobile sheet snap state', () => {
  beforeEach(() => {
    useLocationStore.setState({ sheetSnap: 'half', isMapViewOnMobile: false, mapBottomInsetPx: 0 });
  });

  it('defaults to half with the map not in focus', () => {
    const s = useLocationStore.getState();
    expect(s.sheetSnap).toBe('half');
    expect(s.isMapViewOnMobile).toBe(false);
  });

  it('keeps isMapViewOnMobile true exactly at peek', () => {
    const { setSheetSnap } = useLocationStore.getState();
    setSheetSnap('peek');
    expect(useLocationStore.getState().isMapViewOnMobile).toBe(true);
    setSheetSnap('full');
    expect(useLocationStore.getState().isMapViewOnMobile).toBe(false);
  });

  it('maps the legacy map-view setter onto peek / half', () => {
    const { setIsMapViewOnMobile } = useLocationStore.getState();
    setIsMapViewOnMobile(true);
    expect(useLocationStore.getState().sheetSnap).toBe('peek');
    setIsMapViewOnMobile(false);
    expect(useLocationStore.getState().sheetSnap).toBe('half');
  });

  it('stores the map bottom inset', () => {
    useLocationStore.getState().setMapBottomInsetPx(333);
    expect(useLocationStore.getState().mapBottomInsetPx).toBe(333);
  });
});
