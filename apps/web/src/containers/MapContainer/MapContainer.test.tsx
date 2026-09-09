import { render, screen } from '@testing-library/react';
import { MapContainer } from './MapContainer';
import { useLocationStore } from '@/store';
import { useCategories } from '@/hooks/useCategories';
import { useHazardCells } from '@/hooks/useHazardCells';
import { useParcelAtPoint } from '@/hooks/useParcelAtPoint';

jest.mock('@/store');
jest.mock('@/hooks/useCategories');
jest.mock('@/hooks/useHazardCells');
jest.mock('@/hooks/useParcelAtPoint');
jest.mock('@/hooks/useNavigate', () => ({
  useNavigate: () => jest.fn(),
}));
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));
jest.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle-stub" />,
}));
jest.mock('@/components/HazardLegend', () => ({
  HazardLegend: () => <div data-testid="hazard-legend-stub" />,
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
const mockUseHazardCells = useHazardCells as jest.MockedFunction<typeof useHazardCells>;
const mockUseParcelAtPoint = useParcelAtPoint as jest.MockedFunction<typeof useParcelAtPoint>;

const makeStoreState = (overrides = {}) => ({
  selectedAddress: null,
  analysisResult: null,
  visibleCategories: new Set<string>(),
  activeRoute: null,
  selectedFeature: null,
  routeMode: 'driving' as const,
  hazardLayerVisible: false,
  hazardCells: null,
  parcelFeature: null,
  theme: 'light' as const,
  isAnalyzing: false,
  setHoveredHazardCellId: jest.fn(),
  setSelectedHazardCellId: jest.fn(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  (global as unknown as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver;
  useMap.mockReturnValue(mockMap);
  mockMap.getContainer.mockReturnValue(mapContainerEl);
  mockUseLocationStore.mockReturnValue(makeStoreState());
  mockUseCategories.mockReturnValue({ categories: [], isLoading: false, isError: false } as any);
  mockUseHazardCells.mockReturnValue({ dataUpdatedAt: 0 } as any);
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

  describe('Hazard legend positioning', () => {
    it('is not rendered when the hazard layer is off', () => {
      render(<MapContainer />);
      expect(screen.queryByTestId('hazard-legend-stub')).not.toBeInTheDocument();
    });

    it('docks bottom-left on small screens, clear of the toolbar, and bottom-right on md+', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          hazardLayerVisible: true,
          hazardCells: { type: 'FeatureCollection', features: [] },
        }),
      );
      render(<MapContainer />);
      const wrapper = screen.getByTestId('hazard-legend-stub').parentElement as HTMLElement;
      expect(wrapper.className).toContain('bottom-10');
      expect(wrapper.className).toContain('left-3');
      expect(wrapper.className).toContain('md:bottom-3');
      expect(wrapper.className).toContain('md:right-3');
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
});
