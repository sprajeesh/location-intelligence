import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavigateContainer } from './NavigateContainer';
import type { AddressResult, RouteOption, RouteTransportMode } from '@/types/api';

jest.mock('@/store');
jest.mock('@/hooks/useRoute');
jest.mock('@/components/RoutePanel', () => ({
  __esModule: true,
  default: ({
    routes,
    activeMode,
    isLoading,
    error,
    destinationName,
    onModeChange,
  }: {
    routes: RouteOption[] | null;
    activeMode: RouteTransportMode;
    isLoading: boolean;
    error: string | null;
    destinationName: string;
    onModeChange: (mode: RouteTransportMode) => void;
  }) => (
    <div data-testid="route-panel-mock">
      <span data-testid="destination">{destinationName}</span>
      <span data-testid="mode">{activeMode}</span>
      {isLoading && <span data-testid="loading" />}
      {error && <span data-testid="error">{error}</span>}
      <button data-testid="change-mode" onClick={() => onModeChange('walking')}>
        change
      </button>
      {routes?.map((_, i) => <div key={i} data-testid={`route-${i}`} />)}
    </div>
  ),
}));

import { useLocationStore } from '@/store';
import { useRoute } from '@/hooks/useRoute';

const mockUseLocationStore = useLocationStore as jest.MockedFunction<typeof useLocationStore>;
const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;

const MOCK_FROM: AddressResult = { displayName: '10 Willis Street, Wellington', lat: -41.285, lon: 174.776 };
const MOCK_TO: AddressResult = { displayName: 'Wellington Airport', lat: -41.327, lon: 174.805 };

const makeRoute = (durationS: number): RouteOption => ({
  durationS,
  distanceM: 5000,
  summary: '',
  coordinates: [[durationS, durationS + 1]],
  steps: [],
});

const makeStoreState = (overrides = {}) => ({
  navigateFrom: null as AddressResult | null,
  navigateTo: null as AddressResult | null,
  routeMode: 'driving' as RouteTransportMode,
  isNavigating: false,
  setRouteMode: jest.fn(),
  setActiveRoute: jest.fn(),
  selectedAddress: null,
  radiusKm: 5,
  distanceMode: 'driving' as const,
  analysisResult: null,
  isAnalyzing: false,
  visibleCategories: new Set<string>(),
  toasts: [],
  activeRoute: null,
  navigatingFeatureId: null,
  selectedFeature: null,
  setSelectedAddress: jest.fn(),
  setRadiusKm: jest.fn(),
  setDistanceMode: jest.fn(),
  setAnalysisResult: jest.fn(),
  setIsAnalyzing: jest.fn(),
  toggleCategoryVisibility: jest.fn(),
  clearVisibleCategories: jest.fn(),
  addToast: jest.fn(),
  removeToast: jest.fn(),
  clearToasts: jest.fn(),
  setNavigatingFeatureId: jest.fn(),
  setSelectedFeature: jest.fn(),
  setIsNavigating: jest.fn(),
  setNavigateFrom: jest.fn(),
  setNavigateTo: jest.fn(),
  exitNavigation: jest.fn(),
  ...overrides,
});

const makeRouteHookResult = (overrides = {}) => ({
  data: null as { routes: RouteOption[] } | null,
  isLoading: false,
  error: null as Error | null,
  ...overrides,
});

describe('NavigateContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocationStore.mockReturnValue(makeStoreState());
    mockUseRoute.mockReturnValue(makeRouteHookResult() as ReturnType<typeof useRoute>);
  });

  describe('Rendering', () => {
    it('renders the RoutePanel', () => {
      render(<NavigateContainer />);
      expect(screen.getByTestId('route-panel-mock')).toBeInTheDocument();
    });

    it('passes empty string as destinationName when navigateTo is null', () => {
      render(<NavigateContainer />);
      expect(screen.getByTestId('destination')).toHaveTextContent('');
    });

    it('passes navigateTo displayName as destinationName', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ navigateFrom: MOCK_FROM, navigateTo: MOCK_TO, isNavigating: true }),
      );
      render(<NavigateContainer />);
      expect(screen.getByTestId('destination')).toHaveTextContent('Wellington Airport');
    });

    it('passes the active routeMode to RoutePanel', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ routeMode: 'cycling' as RouteTransportMode }),
      );
      render(<NavigateContainer />);
      expect(screen.getByTestId('mode')).toHaveTextContent('cycling');
    });
  });

  describe('useRoute wiring', () => {
    it('is called with from/to coordinates and routeMode', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          navigateFrom: MOCK_FROM,
          navigateTo: MOCK_TO,
          routeMode: 'driving' as RouteTransportMode,
          isNavigating: true,
        }),
      );
      render(<NavigateContainer />);
      expect(mockUseRoute).toHaveBeenCalledWith(
        MOCK_FROM.lat,
        MOCK_FROM.lon,
        MOCK_TO.lat,
        MOCK_TO.lon,
        'driving',
        true,
      );
    });

    it('is called with enabled=false when navigateFrom is null', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ navigateFrom: null, navigateTo: MOCK_TO, isNavigating: true }),
      );
      render(<NavigateContainer />);
      expect(mockUseRoute).toHaveBeenCalledWith(
        undefined,
        undefined,
        MOCK_TO.lat,
        MOCK_TO.lon,
        'driving',
        false,
      );
    });

    it('is called with enabled=false when navigateTo is null', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ navigateFrom: MOCK_FROM, navigateTo: null, isNavigating: true }),
      );
      render(<NavigateContainer />);
      expect(mockUseRoute).toHaveBeenCalledWith(
        MOCK_FROM.lat,
        MOCK_FROM.lon,
        undefined,
        undefined,
        'driving',
        false,
      );
    });

    it('is called with enabled=false when isNavigating is false', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ navigateFrom: MOCK_FROM, navigateTo: MOCK_TO, isNavigating: false }),
      );
      render(<NavigateContainer />);
      expect(mockUseRoute).toHaveBeenCalledWith(
        MOCK_FROM.lat,
        MOCK_FROM.lon,
        MOCK_TO.lat,
        MOCK_TO.lon,
        'driving',
        false,
      );
    });
  });

  describe('setActiveRoute effect', () => {
    it('calls setActiveRoute with the fastest route coordinates when data loads', () => {
      const setActiveRoute = jest.fn();
      const routes = [makeRoute(300), makeRoute(150), makeRoute(500)];
      mockUseLocationStore.mockReturnValue(makeStoreState({ setActiveRoute }));
      mockUseRoute.mockReturnValue(
        makeRouteHookResult({ data: { routes } }) as ReturnType<typeof useRoute>,
      );

      render(<NavigateContainer />);
      // fastest is durationS: 150 at index 1
      expect(setActiveRoute).toHaveBeenCalledWith(routes[1]!.coordinates);
    });

    it('does not call setActiveRoute when data is null', () => {
      const setActiveRoute = jest.fn();
      mockUseLocationStore.mockReturnValue(makeStoreState({ setActiveRoute }));
      mockUseRoute.mockReturnValue(
        makeRouteHookResult({ data: null }) as ReturnType<typeof useRoute>,
      );
      render(<NavigateContainer />);
      expect(setActiveRoute).not.toHaveBeenCalled();
    });

    it('does not call setActiveRoute when data.routes is empty', () => {
      const setActiveRoute = jest.fn();
      mockUseLocationStore.mockReturnValue(makeStoreState({ setActiveRoute }));
      mockUseRoute.mockReturnValue(
        makeRouteHookResult({ data: { routes: [] } }) as ReturnType<typeof useRoute>,
      );
      render(<NavigateContainer />);
      expect(setActiveRoute).not.toHaveBeenCalled();
    });
  });

  describe('Mode change', () => {
    it('calls setRouteMode with the new mode', async () => {
      const setRouteMode = jest.fn();
      mockUseLocationStore.mockReturnValue(makeStoreState({ setRouteMode }));
      render(<NavigateContainer />);
      await userEvent.click(screen.getByTestId('change-mode'));
      expect(setRouteMode).toHaveBeenCalledWith('walking');
    });

    it('calls setActiveRoute(null) on mode change to clear the previous polyline', async () => {
      const setActiveRoute = jest.fn();
      mockUseLocationStore.mockReturnValue(makeStoreState({ setActiveRoute }));
      render(<NavigateContainer />);
      await userEvent.click(screen.getByTestId('change-mode'));
      expect(setActiveRoute).toHaveBeenCalledWith(null);
    });
  });

  describe('Loading and error passthrough', () => {
    it('forwards isLoading to RoutePanel', () => {
      mockUseRoute.mockReturnValue(
        makeRouteHookResult({ isLoading: true }) as ReturnType<typeof useRoute>,
      );
      render(<NavigateContainer />);
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('forwards error message to RoutePanel', () => {
      mockUseRoute.mockReturnValue(
        makeRouteHookResult({ error: new Error('Fetch failed') }) as ReturnType<typeof useRoute>,
      );
      render(<NavigateContainer />);
      expect(screen.getByTestId('error')).toHaveTextContent('Fetch failed');
    });
  });
});
