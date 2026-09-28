import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResultsPanel from './ResultsPanel';
import type { AnalyzeResponse, CategoryScoreResult, Feature, ScoreResult } from '@/types/api';

jest.mock('@/store');
jest.mock('@/hooks/useAnalyze');
jest.mock('@/hooks/useAnalyzeCategories');
jest.mock('@/hooks/useCategoryColorMap', () => ({
  useCategoryColorMap: () => ({ schools: '#F59E0B', bus_stops: '#3B82F6' }),
}));
const mockNavigate = jest.fn();
jest.mock('@/hooks/useNavigate', () => ({
  useNavigate: () => mockNavigate,
}));
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, opts?: { defaultValue?: string }) => {
    if (opts?.defaultValue) return opts.defaultValue;
    const map: Record<string, string> = {
      'results.title': 'Results',
    };
    return map[key] ?? key;
  },
}));
jest.mock('@/components/RadiusAdjuster', () => ({
  __esModule: true,
  RadiusAdjuster: ({
    initialValue,
    defaultExpanded,
    disabled,
    onSearch,
  }: {
    initialValue?: number;
    defaultExpanded?: boolean;
    disabled?: boolean;
    onSearch: (radius: number) => void;
  }) => (
    <div data-testid="radius-adjuster-mock">
      <span data-testid="radius-adjuster-value">{initialValue}</span>
      <span data-testid="radius-adjuster-expanded">{String(!!defaultExpanded)}</span>
      <span data-testid="radius-adjuster-disabled">{String(!!disabled)}</span>
      <button data-testid="radius-adjuster-search" onClick={() => onSearch(8)}>
        Search
      </button>
    </div>
  ),
}));
jest.mock('@/components/LoadingSkeleton', () => ({
  __esModule: true,
  default: ({ count }: { count: number }) => (
    <div data-testid="loading-skeleton">Loading ({count})</div>
  ),
}));
jest.mock('@/components/ScoreDisplay', () => ({
  __esModule: true,
  default: ({
    score,
    features,
    categoryColorMap,
    visibleFacilityIds,
    onToggleFacilityVisibility,
    onToggleCategoryVisibility,
    onFacilityClick,
    onNavigate,
    onExplainOverall,
    onExplainCategory,
  }: {
    score: ScoreResult;
    features?: Feature[];
    categoryColorMap?: Record<string, string>;
    visibleFacilityIds?: Set<string>;
    onToggleFacilityVisibility?: (feature: Feature) => void;
    onToggleCategoryVisibility?: (featureIds: string[], makeVisible: boolean) => void;
    onFacilityClick?: (feature: Feature) => void;
    onNavigate?: (feature: Feature) => void;
    onExplainOverall?: () => void;
    onExplainCategory?: (category: CategoryScoreResult) => void;
  }) => {
    const firstFeature = features?.[0];
    return (
    <div data-testid="score-display">
      <span>Overall: {score.overall}</span>
      <span data-testid="features-count">{features?.length ?? 0}</span>
      <span data-testid="has-color-map">{String(!!categoryColorMap && Object.keys(categoryColorMap).length > 0)}</span>
      {features?.map((feature) => (
        <button
          key={feature.id}
          data-testid={`toggle-facility-${feature.id}`}
          onClick={() => onToggleFacilityVisibility?.(feature)}
        >
          {visibleFacilityIds?.has(feature.id) ? 'Hide' : 'Show'} {feature.id}
        </button>
      ))}
      <button
        data-testid="toggle-category"
        onClick={() => onToggleCategoryVisibility?.(['school-1'], true)}
      >
        toggle category on
      </button>
      <button
        data-testid="toggle-category-off"
        onClick={() => onToggleCategoryVisibility?.(['school-1'], false)}
      >
        toggle category off
      </button>
      {firstFeature && (
        <>
          <button data-testid="facility-click" onClick={() => onFacilityClick?.(firstFeature)}>
            click facility
          </button>
          <button data-testid="navigate-btn" onClick={() => onNavigate?.(firstFeature)}>
            navigate
          </button>
        </>
      )}
      <button data-testid="explain-overall" onClick={() => onExplainOverall?.()}>
        explain overall
      </button>
      {score.categories.map((category) => (
        <button
          key={category.category}
          data-testid={`explain-category-${category.category}`}
          onClick={() => onExplainCategory?.(category)}
        >
          explain {category.category}
        </button>
      ))}
    </div>
    );
  },
}));

import { useLocationStore } from '@/store';
import { useAnalyze } from '@/hooks/useAnalyze';
import { useAnalyzeCategories } from '@/hooks/useAnalyzeCategories';

const mockUseLocationStore = useLocationStore as jest.MockedFunction<typeof useLocationStore>;
const mockUseAnalyze = useAnalyze as jest.MockedFunction<typeof useAnalyze>;
const mockUseAnalyzeCategories = useAnalyzeCategories as jest.MockedFunction<typeof useAnalyzeCategories>;

const MOCK_ADDRESS = {
  displayName: '123 Main Street, Auckland',
  lat: -36.8485,
  lon: 174.7633,
};

const mockScore: ScoreResult = {
  overall: 77,
  coverage: '2/5',
  contribution: [],
  categories: [
    {
      category: 'education',
      status: 'scored',
      score: 72,
      contribution: [],
      facilities: [
        {
          facilityType: 'schools',
          status: 'scored',
          score: 72,
          nearestDistanceKm: 0.5,
          count: 3,
          explanation: '3 schools within 1.0 km by walk.',
          criteria: [],
        },
      ],
    },
    {
      category: 'transport',
      status: 'scored',
      score: 85,
      contribution: [],
      facilities: [
        {
          facilityType: 'bus_stops',
          status: 'scored',
          score: 85,
          nearestDistanceKm: 0.3,
          count: 2,
          explanation: '2 bus_stops within 1.0 km by walk.',
          criteria: [],
        },
      ],
    },
  ],
};

const mockFeatures: Feature[] = [
  {
    id: 'school-1',
    name: 'Auckland Primary',
    category: 'schools',
    lat: -36.85,
    lon: 174.76,
    distanceKm: 0.5,
  },
  {
    id: 'bus-1',
    name: 'Queen St Stop',
    category: 'bus_stops',
    lat: -36.84,
    lon: 174.77,
    distanceKm: 0.3,
  },
];

const mockAnalysisResult: AnalyzeResponse = {
  location: { lat: -36.85, lon: 174.76, displayName: '123 Main St' },
  features: mockFeatures,
  score: mockScore,
  warnings: [],
};

const makeStoreState = (overrides = {}) => ({
  analysisResult: null,
  isAnalyzing: false,
  radiusKm: 10,
  visibleFacilityIds: new Set<string>(),
  toggleFacilityVisibility: jest.fn(),
  setFacilitiesVisibility: jest.fn(),
  clearVisibleFacilityIds: jest.fn(),
  selectedAddress: null,
  distanceMode: 'driving' as const,
  setSelectedAddress: jest.fn(),
  setRadiusKm: jest.fn(),
  setDistanceMode: jest.fn(),
  setAnalysisResult: jest.fn(),
  setIsAnalyzing: jest.fn(),
  toasts: [],
  addToast: jest.fn(),
  removeToast: jest.fn(),
  clearToasts: jest.fn(),
  activeRoute: null,
  navigatingFeatureId: null,
  selectedFeature: null,
  setActiveRoute: jest.fn(),
  setNavigatingFeatureId: jest.fn(),
  setSelectedFeature: jest.fn(),
  setIsMapViewOnMobile: jest.fn(),
  ...overrides,
});

// Resets jsdom's window.innerWidth back to a desktop-sized default so mobile
// behaviour is opt-in per test.
const setViewportWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
};

describe('ResultsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setViewportWidth(1024);
    mockUseLocationStore.mockReturnValue(makeStoreState());
    mockUseAnalyzeCategories.mockReturnValue(undefined);
    mockUseAnalyze.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
    } as any);
  });

  describe('Loading state', () => {
    it('renders skeleton when isAnalyzing is true', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ isAnalyzing: true }));
      render(<ResultsPanel />);
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('does not render the score display while analyzing', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ isAnalyzing: true }));
      render(<ResultsPanel />);
      expect(screen.queryByTestId('score-display')).not.toBeInTheDocument();
    });
  });

  describe('No analysis state', () => {
    it('renders search prompt when analysisResult is null', () => {
      render(<ResultsPanel />);
      expect(screen.getByText('Search an address to get started')).toBeInTheDocument();
    });

    it('does not render skeleton when not analyzing', () => {
      render(<ResultsPanel />);
      expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
    });
  });

  describe('Empty results state (score present, no facilities)', () => {
    const emptyFacilitiesResult = { ...mockAnalysisResult, features: [] };

    it('still renders the score display', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: emptyFacilitiesResult }));
      render(<ResultsPanel />);
      expect(screen.getByTestId('score-display')).toBeInTheDocument();
    });

    it('does not show the no-facilities message', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ analysisResult: emptyFacilitiesResult, radiusKm: 10 })
      );
      render(<ResultsPanel />);
      expect(
        screen.queryByText('No facilities found within 10km. Try increasing your search radius.')
      ).not.toBeInTheDocument();
    });
  });

  describe('Fully empty state (no score, no facilities)', () => {
    const fullyEmptyResult = { ...mockAnalysisResult, features: [], score: null as any };

    it('renders no-facilities message when there is no score and no features', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ analysisResult: fullyEmptyResult, radiusKm: 10 })
      );
      render(<ResultsPanel />);
      expect(
        screen.getByText('No facilities found within 10km. Try increasing your search radius.')
      ).toBeInTheDocument();
    });

    it('renders the radius adjuster pre-expanded', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: fullyEmptyResult }));
      render(<ResultsPanel />);
      expect(screen.getByTestId('radius-adjuster-expanded')).toHaveTextContent('true');
    });

    it('re-analyzes with the new radius when the adjuster search is triggered', async () => {
      const analyze = jest.fn();
      const setRadiusKm = jest.fn();
      const setAnalysisResult = jest.fn();
      const clearVisibleFacilityIds = jest.fn();
      mockUseAnalyze.mockReturnValue({ mutate: analyze } as any);
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          analysisResult: fullyEmptyResult,
          selectedAddress: MOCK_ADDRESS,
          setRadiusKm,
          setAnalysisResult,
          clearVisibleFacilityIds,
        })
      );
      render(<ResultsPanel />);
      await userEvent.click(screen.getByTestId('radius-adjuster-search'));

      expect(setRadiusKm).toHaveBeenCalledWith(8);
      expect(setAnalysisResult).toHaveBeenCalledWith(null);
      expect(clearVisibleFacilityIds).toHaveBeenCalledTimes(1);
      expect(analyze).toHaveBeenCalledWith({
        address: MOCK_ADDRESS.displayName,
        lat: MOCK_ADDRESS.lat,
        lon: MOCK_ADDRESS.lon,
        radiusKm: 8,
        distanceMode: 'driving',
      });
    });

    it('does not call analyze when no address is selected', async () => {
      const analyze = jest.fn();
      mockUseAnalyze.mockReturnValue({ mutate: analyze } as any);
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          analysisResult: fullyEmptyResult,
          selectedAddress: null,
        })
      );
      render(<ResultsPanel />);
      await userEvent.click(screen.getByTestId('radius-adjuster-search'));
      expect(analyze).not.toHaveBeenCalled();
    });
  });

  describe('Results state', () => {
    it('renders the radius adjuster collapsed by default', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel />);
      expect(screen.getByTestId('radius-adjuster-expanded')).toHaveTextContent('false');
    });

    it('renders ScoreDisplay when score is present', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel />);
      expect(screen.getByTestId('score-display')).toBeInTheDocument();
    });

    it('does not render ScoreDisplay when score is absent', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          analysisResult: { ...mockAnalysisResult, score: null as any },
        })
      );
      render(<ResultsPanel />);
      expect(screen.queryByTestId('score-display')).not.toBeInTheDocument();
    });

    it('passes the analysis features and category color map down to ScoreDisplay', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel />);
      expect(screen.getByTestId('features-count')).toHaveTextContent('2');
      expect(screen.getByTestId('has-color-map')).toHaveTextContent('true');
    });

    it('no longer renders a tabbed Score / Nearby Facilities interface', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel />);
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
      expect(screen.queryByText('Nearby Facilities')).not.toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('calls onFacilityClick with the feature when a facility is clicked via ScoreDisplay', async () => {
      const onFacilityClick = jest.fn();
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel onFacilityClick={onFacilityClick} />);
      await userEvent.click(screen.getByTestId('facility-click'));
      expect(onFacilityClick).toHaveBeenCalledWith(mockFeatures[0]);
    });

    it('sets the selected feature and clears the active route on facility click', async () => {
      const setSelectedFeature = jest.fn();
      const setActiveRoute = jest.fn();
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ analysisResult: mockAnalysisResult, setSelectedFeature, setActiveRoute })
      );
      render(<ResultsPanel />);
      await userEvent.click(screen.getByTestId('facility-click'));
      expect(setSelectedFeature).toHaveBeenCalledWith(mockFeatures[0]);
      expect(setActiveRoute).toHaveBeenCalledWith(null);
    });

    it('forwards navigate calls from ScoreDisplay to useNavigate', async () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel />);
      await userEvent.click(screen.getByTestId('navigate-btn'));
      expect(mockNavigate).toHaveBeenCalledWith(mockFeatures[0]);
    });

    describe('individual facility visibility toggle', () => {
      it('calls toggleFacilityVisibility with the feature id', async () => {
        const toggleFacilityVisibility = jest.fn();
        mockUseLocationStore.mockReturnValue(
          makeStoreState({ analysisResult: mockAnalysisResult, toggleFacilityVisibility })
        );
        render(<ResultsPanel />);
        await userEvent.click(screen.getByTestId('toggle-facility-school-1'));
        expect(toggleFacilityVisibility).toHaveBeenCalledWith('school-1');
      });

      it('switches to mobile map view when showing a marker on a small screen', async () => {
        setViewportWidth(500);
        const setIsMapViewOnMobile = jest.fn();
        mockUseLocationStore.mockReturnValue(
          makeStoreState({ analysisResult: mockAnalysisResult, setIsMapViewOnMobile })
        );
        render(<ResultsPanel />);
        await userEvent.click(screen.getByTestId('toggle-facility-school-1'));
        expect(setIsMapViewOnMobile).toHaveBeenCalledWith(true);
      });

      it('does not switch to mobile map view on a desktop-sized screen', async () => {
        setViewportWidth(1280);
        const setIsMapViewOnMobile = jest.fn();
        mockUseLocationStore.mockReturnValue(
          makeStoreState({ analysisResult: mockAnalysisResult, setIsMapViewOnMobile })
        );
        render(<ResultsPanel />);
        await userEvent.click(screen.getByTestId('toggle-facility-school-1'));
        expect(setIsMapViewOnMobile).not.toHaveBeenCalled();
      });

      it('does not switch to mobile map view when hiding an already-visible marker', async () => {
        setViewportWidth(500);
        const setIsMapViewOnMobile = jest.fn();
        mockUseLocationStore.mockReturnValue(
          makeStoreState({
            analysisResult: mockAnalysisResult,
            visibleFacilityIds: new Set(['school-1']),
            setIsMapViewOnMobile,
          })
        );
        render(<ResultsPanel />);
        await userEvent.click(screen.getByTestId('toggle-facility-school-1'));
        expect(setIsMapViewOnMobile).not.toHaveBeenCalled();
      });
    });

    describe('category-level bulk visibility toggle', () => {
      it('calls setFacilitiesVisibility with the feature ids and target state', async () => {
        const setFacilitiesVisibility = jest.fn();
        mockUseLocationStore.mockReturnValue(
          makeStoreState({ analysisResult: mockAnalysisResult, setFacilitiesVisibility })
        );
        render(<ResultsPanel />);
        await userEvent.click(screen.getByTestId('toggle-category'));
        expect(setFacilitiesVisibility).toHaveBeenCalledWith(['school-1'], true);
      });

      it('switches to mobile map view when showing a category on a small screen', async () => {
        setViewportWidth(500);
        const setIsMapViewOnMobile = jest.fn();
        mockUseLocationStore.mockReturnValue(
          makeStoreState({ analysisResult: mockAnalysisResult, setIsMapViewOnMobile })
        );
        render(<ResultsPanel />);
        await userEvent.click(screen.getByTestId('toggle-category'));
        expect(setIsMapViewOnMobile).toHaveBeenCalledWith(true);
      });

      it('does not switch to mobile map view when hiding a category', async () => {
        setViewportWidth(500);
        const setIsMapViewOnMobile = jest.fn();
        mockUseLocationStore.mockReturnValue(
          makeStoreState({ analysisResult: mockAnalysisResult, setIsMapViewOnMobile })
        );
        render(<ResultsPanel />);
        await userEvent.click(screen.getByTestId('toggle-category-off'));
        expect(setIsMapViewOnMobile).not.toHaveBeenCalled();
      });
    });

    it('re-analyzes with the new radius when the adjuster search is triggered', async () => {
      const analyze = jest.fn();
      const setRadiusKm = jest.fn();
      const setAnalysisResult = jest.fn();
      const clearVisibleFacilityIds = jest.fn();
      mockUseAnalyze.mockReturnValue({ mutate: analyze } as any);
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          analysisResult: mockAnalysisResult,
          selectedAddress: MOCK_ADDRESS,
          setRadiusKm,
          setAnalysisResult,
          clearVisibleFacilityIds,
        })
      );
      render(<ResultsPanel />);
      await userEvent.click(screen.getByTestId('radius-adjuster-search'));

      expect(setRadiusKm).toHaveBeenCalledWith(8);
      expect(setAnalysisResult).toHaveBeenCalledWith(null);
      expect(clearVisibleFacilityIds).toHaveBeenCalledTimes(1);
      expect(analyze).toHaveBeenCalledWith({
        address: MOCK_ADDRESS.displayName,
        lat: MOCK_ADDRESS.lat,
        lon: MOCK_ADDRESS.lon,
        radiusKm: 8,
        distanceMode: 'driving',
      });
    });
  });

  // ResultsPanel owns the explain-modal open/close state (not ScoreDisplay/
  // CategoryScoreCard, which stay pure/prop-driven -- see their own tests)
  // and portals ScoreExplainModal to document.body so it isn't confined by
  // the results panel's row-entrance animation. RTL's screen queries search
  // document.body by default, so the portaled dialog is found the same way
  // as anything rendered inside the test's own container.
  describe('Score explanation modal', () => {
    beforeEach(() => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
    });

    it('does not render a dialog until an explain button is clicked', () => {
      render(<ResultsPanel />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens the modal for the overall score', async () => {
      render(<ResultsPanel />);
      await userEvent.click(screen.getByTestId('explain-overall'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Location Score')).toBeInTheDocument();
    });

    it('opens the modal for a specific category', async () => {
      render(<ResultsPanel />);
      await userEvent.click(screen.getByTestId('explain-category-education'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('education')).toBeInTheDocument();
    });

    it('closes the modal and can reopen it for a different target', async () => {
      render(<ResultsPanel />);
      await userEvent.click(screen.getByTestId('explain-category-education'));
      await userEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await userEvent.click(screen.getByTestId('explain-category-transport'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('transport')).toBeInTheDocument();
    });

    it('drills down from a category row inside the overall modal into that category\'s own explanation', async () => {
      render(<ResultsPanel />);
      await userEvent.click(screen.getByTestId('explain-overall'));
      expect(screen.getByText('Location Score')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Explain the education score' }));

      expect(screen.getByText('education')).toBeInTheDocument();
      expect(screen.queryByText('Location Score')).not.toBeInTheDocument();
    });

    it('does not offer drill-down rows inside a category modal (no deeper level to explain)', async () => {
      render(<ResultsPanel />);
      await userEvent.click(screen.getByTestId('explain-category-education'));
      expect(screen.queryByRole('button', { name: /^Explain the .* score$/ })).not.toBeInTheDocument();
    });

    it('renders the dialog as a direct child of document.body, not nested inside the panel', async () => {
      const { container } = render(<ResultsPanel />);
      await userEvent.click(screen.getByTestId('explain-overall'));
      const dialog = screen.getByRole('dialog');
      expect(container.contains(dialog)).toBe(false);
      expect(document.body.contains(dialog)).toBe(true);
    });
  });

  // ResultsPanel only ever renders once an address is selected, i.e. only
  // ever inside the pinned sidebar/mobile-split layout (see HomeContainer),
  // so every render branch must use SurfacePanel's flush "sidebar" variant
  // rather than the floating-card default -- never both.
  describe('Styling (pinned sidebar, not a floating card)', () => {
    it('uses the sidebar variant while loading', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ isAnalyzing: true }));
      const { container } = render(<ResultsPanel />);
      const panel = container.firstElementChild as HTMLElement;
      expect(panel.className).toContain('border-slate-200');
      expect(panel.className).not.toContain('rounded-xl');
      expect(panel.className).not.toContain('pointer-events-auto');
    });

    it('uses the sidebar variant with no analysis result', () => {
      const { container } = render(<ResultsPanel />);
      const panel = container.firstElementChild as HTMLElement;
      expect(panel.className).toContain('border-slate-200');
      expect(panel.className).not.toContain('rounded-xl');
      expect(panel.className).not.toContain('pointer-events-auto');
    });

    it('uses the sidebar variant in the fully-empty state', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ analysisResult: { ...mockAnalysisResult, features: [], score: null as any } })
      );
      const { container } = render(<ResultsPanel />);
      const panel = container.firstElementChild as HTMLElement;
      expect(panel.className).toContain('border-slate-200');
      expect(panel.className).not.toContain('rounded-xl');
      expect(panel.className).not.toContain('pointer-events-auto');
    });

    it('uses the sidebar variant for the main results view', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel />);
      const panel = screen.getByRole('region', { name: 'Results' });
      expect(panel.className).toContain('border-slate-200');
      expect(panel.className).not.toContain('rounded-xl');
      expect(panel.className).not.toContain('pointer-events-auto');
    });
  });
});
