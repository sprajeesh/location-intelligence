import { render, screen, fireEvent } from '@testing-library/react';
import { MapContainer } from './MapContainer';
import { useLocationStore } from '@/store';
import { useCategories } from '@/hooks/useCategories';
import { useParcelAtPoint } from '@/hooks/useParcelAtPoint';

jest.mock('@/store');
jest.mock('@/hooks/useCategories');
jest.mock('@/hooks/useParcelAtPoint');
jest.mock('react-dom/server', () => ({
  renderToStaticMarkup: (_element: React.ReactElement) => '<svg mock="true"></svg>',
}));
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));
jest.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle-stub" />,
}));
jest.mock('@/containers/SettingsContainer', () => ({
  SettingsContainer: () => <div data-testid="settings-container-stub" />,
}));
jest.mock('@/components/FeatureInfoCard', () => ({
  FeatureInfoCard: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="feature-info-card-stub" onClick={onClose}>
      Feature Info
    </div>
  ),
}));
jest.mock('@/components/FacilityRouteModePicker', () => ({
  FacilityRouteModePicker: ({ onBackToResults }: { onBackToResults?: () => void }) => (
    <div data-testid="facility-route-mode-picker-stub">
      {onBackToResults && <button onClick={onBackToResults}>Back to results</button>}
    </div>
  ),
}));
jest.mock('@/containers/MapToolbarContainer', () => ({
  MapToolbarContainer: () => <div data-testid="map-toolbar-stub" />,
  TILE_LAYER_URLS: { default: 'https://tiles.example/default/{z}/{x}/{y}.png' },
  TILE_LAYER_ATTRIBUTIONS: { default: '' },
  TILE_LAYER_MAX_ZOOM: { default: 19 },
}));

// Mirrors the mocking pattern in MapToolbarContainer.test.tsx: a bare
// useMap mock here, mockMap declared afterward, then wired together in
// beforeEach -- referencing mockMap directly inside this factory would trip
// over jest's module-factory hoisting.
jest.mock('react-leaflet', () => {
  const ReactActual = require('react');
  return {
    MapContainer: ReactActual.forwardRef(
      ({ children }: { children?: React.ReactNode }, _ref: unknown) => <div>{children}</div>,
    ),
    TileLayer: () => null,
    Marker: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Popup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Polyline: () => null,
    GeoJSON: () => null,
    ScaleControl: () => null,
    useMap: jest.fn(),
  };
});

const { useMap } = require('react-leaflet') as { useMap: jest.Mock };

const mapContainerEl = document.createElement('div');
const mockMap = {
  getContainer: jest.fn(() => mapContainerEl),
  getPane: jest.fn(() => undefined),
  createPane: jest.fn(() => ({ style: {} })),
  flyTo: jest.fn(),
  flyToBounds: jest.fn(),
  panTo: jest.fn(),
  fitBounds: jest.fn(),
  invalidateSize: jest.fn(),
  closePopup: jest.fn(),
};

// jsdom has no ResizeObserver -- stub one that captures its callback so
// tests can trigger a "container resized" notification manually.
let resizeCallback: () => void = () => {};
const observe = jest.fn();
const disconnect = jest.fn();
class MockResizeObserver {
  constructor(cb: () => void) {
    resizeCallback = cb;
  }
  observe = observe;
  disconnect = disconnect;
  unobserve = jest.fn();
}

const mockUseLocationStore = useLocationStore as jest.MockedFunction<typeof useLocationStore>;
const mockUseCategories = useCategories as jest.MockedFunction<typeof useCategories>;
const mockUseParcelAtPoint = useParcelAtPoint as jest.MockedFunction<typeof useParcelAtPoint>;

const makeStoreState = (overrides = {}) => ({
  selectedAddress: null,
  analysisResult: null,
  visibleFacilityIds: new Set<string>(),
  activeRoute: null,
  selectedFeature: null,
  routeMode: 'driving' as const,
  isNavigating: false,
  parcelFeature: null,
  theme: 'light' as const,
  isAnalyzing: false,
  isMapViewOnMobile: false,
  setIsMapViewOnMobile: jest.fn(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  (global as unknown as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver;
  useMap.mockReturnValue(mockMap);
  mockMap.getContainer.mockReturnValue(mapContainerEl);
  mockUseLocationStore.mockReturnValue(makeStoreState());
  // MapContainer also reads a few fields directly via useLocationStore.getState()
  // (see fitBoundsToMapContent) rather than through the hook -- zustand's real
  // hook carries this as a static, but the module auto-mock doesn't, so it's
  // stubbed here for the tests below that have non-empty visibleFacilityIds
  // and therefore actually trigger a fit-bounds pass.
  (mockUseLocationStore as unknown as { getState: () => unknown }).getState = () => ({
    selectedAddress: null,
    parcelFeature: null,
    activeRoute: null,
  });
  mockUseCategories.mockReturnValue({ categories: [], isLoading: false, isError: false } as any);
  mockUseParcelAtPoint.mockReturnValue({ isFetching: false, data: null, isError: false } as any);
});

describe('MapContainer', () => {
  describe('Map resize handling', () => {
    it('observes the map container for size changes', () => {
      render(<MapContainer />);
      expect(observe).toHaveBeenCalledWith(mapContainerEl);
    });

    it('invalidates the map size when the container is reported as resized', () => {
      render(<MapContainer />);
      resizeCallback();
      expect(mockMap.invalidateSize).toHaveBeenCalled();
    });

    it('disconnects the observer on unmount', () => {
      const { unmount } = render(<MapContainer />);
      unmount();
      expect(disconnect).toHaveBeenCalled();
    });
  });

  describe('Toolbar positioning', () => {
    it('is vertically centered on the right edge on all screen sizes', () => {
      render(<MapContainer />);
      const wrapper = screen.getByTestId('theme-toggle-stub').parentElement as HTMLElement;
      expect(wrapper.className).toContain('right-3');
      expect(wrapper.className).toContain('top-1/2');
      expect(wrapper.className).toContain('-translate-y-1/2');
      expect(wrapper).toContainElement(screen.getByTestId('settings-container-stub'));
      expect(wrapper).toContainElement(screen.getByTestId('theme-toggle-stub'));
      expect(wrapper).toContainElement(screen.getByTestId('map-toolbar-stub'));
    });
  });

  describe('Feature info card', () => {
    it('does not display the feature info card by default, even when a parcel feature is present', () => {
      const mockParcelFeature = {
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [] },
        properties: {
          id: 123,
          appellation: 'Test Lot',
          parcel_intent: 'Test Intent',
          titles: 'TEST/123',
          land_district: 'Test',
          topology_type: 'Primary',
          affected_surveys: null,
          statutory_actions: null,
          survey_area: null,
          calc_area: 1000,
        },
      };
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          parcelFeature: mockParcelFeature,
        }),
      );
      render(<MapContainer />);
      expect(screen.queryByTestId('feature-info-card-stub')).not.toBeInTheDocument();
    });

    it('does not display the feature info card when no parcel feature is present', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ parcelFeature: null }));
      render(<MapContainer />);
      expect(screen.queryByTestId('feature-info-card-stub')).not.toBeInTheDocument();
    });
  });

  describe('Facility markers', () => {
    const analysisResult = {
      location: { lat: -36.85, lon: 174.76, displayName: '123 Main St' },
      features: [
        { id: 'school-1', name: 'Auckland Primary', category: 'schools', lat: -36.85, lon: 174.76, distanceKm: 0.5 },
        { id: 'bus-1', name: 'Queen St Stop', category: 'bus_stops', lat: -36.84, lon: 174.77, distanceKm: 0.3 },
      ],
      score: { overall: 50, coverage: '1/5', categories: [] },
      warnings: [],
    };

    it('only renders markers whose feature id is in visibleFacilityIds', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ analysisResult, visibleFacilityIds: new Set(['school-1']) }),
      );
      render(<MapContainer />);
      expect(screen.getByText('Auckland Primary')).toBeInTheDocument();
      expect(screen.queryByText('Queen St Stop')).not.toBeInTheDocument();
    });

    it('renders no facility markers when visibleFacilityIds is empty, even with two facilities of the same type', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ analysisResult, visibleFacilityIds: new Set() }),
      );
      render(<MapContainer />);
      expect(screen.queryByText('Auckland Primary')).not.toBeInTheDocument();
      expect(screen.queryByText('Queen St Stop')).not.toBeInTheDocument();
    });

    it('renders every visible facility marker, independent of the others sharing its facility type', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ analysisResult, visibleFacilityIds: new Set(['school-1', 'bus-1']) }),
      );
      render(<MapContainer />);
      expect(screen.getByText('Auckland Primary')).toBeInTheDocument();
      expect(screen.getByText('Queen St Stop')).toBeInTheDocument();
    });

    it('renders known detail fields when present, as a link for website, and omits absent fields', () => {
      const withDetails = {
        ...analysisResult,
        features: [
          {
            ...analysisResult.features[0],
            details: { phone: '09-123-4567', website: 'https://example.org' },
          },
        ],
      };
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ analysisResult: withDetails, visibleFacilityIds: new Set(['school-1']) }),
      );
      render(<MapContainer />);

      expect(screen.getByText('09-123-4567')).toBeInTheDocument();
      const websiteLink = screen.getByRole('link', { name: 'https://example.org' });
      expect(websiteLink).toHaveAttribute('href', 'https://example.org');
      expect(websiteLink).toHaveAttribute('target', '_blank');
      // Only fields present in `details` render -- no row for e.g. cuisine/emergency.
      expect(screen.queryByText('map.markerPopup.details.cuisine:')).not.toBeInTheDocument();
    });

    it('renders website as plain text, not a link, when it is malformed or protocol-only', () => {
      const withDetails = {
        ...analysisResult,
        features: [
          {
            ...analysisResult.features[0],
            details: { website: 'https://' },
          },
        ],
      };
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ analysisResult: withDetails, visibleFacilityIds: new Set(['school-1']) }),
      );
      render(<MapContainer />);

      expect(screen.getByText('https://')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'https://' })).not.toBeInTheDocument();
    });

    it('renders a description row when present', () => {
      const withDetails = {
        ...analysisResult,
        features: [
          { ...analysisResult.features[0], details: { description: 'A local primary school' } },
        ],
      };
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ analysisResult: withDetails, visibleFacilityIds: new Set(['school-1']) }),
      );
      render(<MapContainer />);
      expect(screen.getByText('A local primary school')).toBeInTheDocument();
    });

    it('renders a thumbnail image when details.image is a valid http(s) URL', () => {
      const withDetails = {
        ...analysisResult,
        features: [
          {
            ...analysisResult.features[0],
            details: { image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Foo.jpg' },
          },
        ],
      };
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ analysisResult: withDetails, visibleFacilityIds: new Set(['school-1']) }),
      );
      render(<MapContainer />);
      const image = screen.getByRole('img', { name: 'Auckland Primary' });
      expect(image).toHaveAttribute(
        'src',
        'https://commons.wikimedia.org/wiki/Special:FilePath/Foo.jpg',
      );
    });

    it('does not render a thumbnail image when details.image is malformed', () => {
      const withDetails = {
        ...analysisResult,
        features: [{ ...analysisResult.features[0], details: { image: 'not-a-url' } }],
      };
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ analysisResult: withDetails, visibleFacilityIds: new Set(['school-1']) }),
      );
      render(<MapContainer />);
      expect(screen.queryByRole('img', { name: 'Auckland Primary' })).not.toBeInTheDocument();
    });

    it('renders no detail rows when the feature has no details', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ analysisResult, visibleFacilityIds: new Set(['school-1']) }),
      );
      render(<MapContainer />);
      expect(screen.queryByText('map.markerPopup.details.phone:')).not.toBeInTheDocument();
    });
  });

  describe('Mobile "back to results" control in facility popup', () => {
    const analysisResult = {
      location: { lat: -36.85, lon: 174.76, displayName: '123 Main St' },
      features: [
        { id: 'school-1', name: 'Auckland Primary', category: 'schools', lat: -36.85, lon: 174.76, distanceKm: 0.5 },
      ],
      score: { overall: 50, coverage: '1/5', categories: [] },
      warnings: [],
    };

    const setInnerWidth = (width: number) => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      });
    };

    afterEach(() => {
      setInnerWidth(1024);
    });

    it('is hidden on desktop, where the results panel and map are both already visible', () => {
      setInnerWidth(1024);
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ analysisResult, visibleFacilityIds: new Set(['school-1']) }),
      );
      render(<MapContainer />);
      expect(screen.queryByRole('button', { name: 'Back to results' })).not.toBeInTheDocument();
    });

    it('switches back to the results panel on mobile', () => {
      setInnerWidth(500);
      const setIsMapViewOnMobile = jest.fn();
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          analysisResult,
          visibleFacilityIds: new Set(['school-1']),
          setIsMapViewOnMobile,
        }),
      );
      render(<MapContainer />);
      fireEvent.click(screen.getByRole('button', { name: 'Back to results' }));
      expect(setIsMapViewOnMobile).toHaveBeenCalledWith(false);
    });
  });

  describe('Navigation popup cleanup', () => {
    it('does not close the popup while navigation is active', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ isNavigating: true }));
      render(<MapContainer />);
      expect(mockMap.closePopup).not.toHaveBeenCalled();
    });

    it('closes the popup once navigation exits', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ isNavigating: true }));
      const { rerender } = render(<MapContainer />);
      expect(mockMap.closePopup).not.toHaveBeenCalled();

      mockUseLocationStore.mockReturnValue(makeStoreState({ isNavigating: false }));
      rerender(<MapContainer />);
      expect(mockMap.closePopup).toHaveBeenCalledTimes(1);
    });

    it('does not close the popup again on unrelated re-renders once navigation has already ended', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ isNavigating: false }));
      const { rerender } = render(<MapContainer />);
      expect(mockMap.closePopup).toHaveBeenCalledTimes(1);

      mockUseLocationStore.mockReturnValue(makeStoreState({ isNavigating: false }));
      rerender(<MapContainer />);
      expect(mockMap.closePopup).toHaveBeenCalledTimes(1);
    });
  });
});
