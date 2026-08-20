import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResultsPanel from './ResultsPanel';
import type { AnalyzeResponse, Feature, ScoreResult } from '@/types/api';
import type { HazardResult } from '@/types/hazard';

jest.mock('@/store');
jest.mock('@/hooks/useAnalyze');
jest.mock('@/hooks/useAnalyzeCategories');
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
jest.mock('@/components/FacilityItem', () => ({
  __esModule: true,
  FacilityItem: ({ feature, onClick }: { feature: Feature; onClick: () => void }) => (
    <button data-testid={`facility-${feature.id}`} onClick={onClick}>
      {feature.name}
    </button>
  ),
}));
jest.mock('@/components/ScoreDisplay', () => ({
  __esModule: true,
  default: ({ score }: { score: ScoreResult }) => (
    <div data-testid="score-display">Overall: {score.overall}</div>
  ),
}));
jest.mock('@/components/HazardDisplay', () => ({
  __esModule: true,
  default: ({ hazard }: { hazard: HazardResult }) => (
    <div data-testid="hazard-display">Composite: {hazard.composite}</div>
  ),
}));
jest.mock('@/components/CategoryGroup', () => ({
  __esModule: true,
  CategoryGroup: ({
    id,
    label,
    count,
    onToggleExpand,
    onToggleVisibility,
    children,
  }: {
    id: string;
    label: string;
    count: number;
    onToggleExpand: () => void;
    onToggleVisibility: (e: React.MouseEvent) => void;
    children?: React.ReactNode;
  }) => (
    <div data-testid={`category-group-${id}`}>
      <button data-testid={`toggle-expand-${id}`} onClick={onToggleExpand}>
        {label} ({count})
      </button>
      <button
        data-testid={`toggle-visibility-${id}`}
        onClick={(e) => onToggleVisibility(e)}
      >
        Toggle Visibility
      </button>
      {children}
    </div>
  ),
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
  categories: [
    {
      category: 'education',
      status: 'scored',
      score: 72,
      facilities: [
        {
          facilityType: 'schools',
          status: 'scored',
          score: 72,
          nearestDistanceKm: 0.5,
          count: 3,
          explanation: '3 schools within 1.0 km by walk.',
        },
      ],
    },
    {
      category: 'transport',
      status: 'scored',
      score: 85,
      facilities: [
        {
          facilityType: 'bus_stops',
          status: 'scored',
          score: 85,
          nearestDistanceKm: 0.3,
          count: 2,
          explanation: '2 bus_stops within 1.0 km by walk.',
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
  hazard: null,
};

const mockHazard: HazardResult = {
  composite: 42,
  worstHazard: 55,
  worstHazardType: 'demo_hazard',
  anySevere: false,
  hazards: [],
  disclaimer: 'Illustrative hazard estimate.',
};

const makeStoreState = (overrides = {}) => ({
  analysisResult: null,
  isAnalyzing: false,
  radiusKm: 10,
  visibleCategories: new Set<string>(),
  toggleCategoryVisibility: jest.fn(),
  clearVisibleCategories: jest.fn(),
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
  ...overrides,
});

describe('ResultsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    it('does not render category groups while analyzing', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ isAnalyzing: true }));
      render(<ResultsPanel />);
      expect(screen.queryByTestId(/^category-group/)).not.toBeInTheDocument();
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

  describe('Empty results state', () => {
    it('renders no-facilities message when features array is empty', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          analysisResult: { ...mockAnalysisResult, features: [] },
          radiusKm: 10,
        })
      );
      render(<ResultsPanel />);
      expect(
        screen.getByText('No facilities found within 10km. Try increasing your search radius.')
      ).toBeInTheDocument();
    });

    it('renders the radius adjuster pre-expanded', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ analysisResult: { ...mockAnalysisResult, features: [] } })
      );
      render(<ResultsPanel />);
      expect(screen.getByTestId('radius-adjuster-expanded')).toHaveTextContent('true');
    });

    it('re-analyzes with the new radius when the adjuster search is triggered', async () => {
      const analyze = jest.fn();
      const setRadiusKm = jest.fn();
      const setAnalysisResult = jest.fn();
      const clearVisibleCategories = jest.fn();
      mockUseAnalyze.mockReturnValue({ mutate: analyze } as any);
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          analysisResult: { ...mockAnalysisResult, features: [] },
          selectedAddress: MOCK_ADDRESS,
          setRadiusKm,
          setAnalysisResult,
          clearVisibleCategories,
        })
      );
      render(<ResultsPanel />);
      await userEvent.click(screen.getByTestId('radius-adjuster-search'));

      expect(setRadiusKm).toHaveBeenCalledWith(8);
      expect(setAnalysisResult).toHaveBeenCalledWith(null);
      expect(clearVisibleCategories).toHaveBeenCalledTimes(1);
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
          analysisResult: { ...mockAnalysisResult, features: [] },
          selectedAddress: null,
        })
      );
      render(<ResultsPanel />);
      await userEvent.click(screen.getByTestId('radius-adjuster-search'));
      expect(analyze).not.toHaveBeenCalled();
    });

    it('still renders HazardDisplay when hazard is present but no facilities were found', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          analysisResult: { ...mockAnalysisResult, features: [], hazard: mockHazard },
        })
      );
      render(<ResultsPanel />);
      expect(screen.getByText('No facilities found within 10km. Try increasing your search radius.')).toBeInTheDocument();
      expect(screen.getByTestId('hazard-display')).toBeInTheDocument();
    });

    it('does not render HazardDisplay when there is no hazard and no facilities', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          analysisResult: { ...mockAnalysisResult, features: [], hazard: null },
        })
      );
      render(<ResultsPanel />);
      expect(screen.queryByTestId('hazard-display')).not.toBeInTheDocument();
    });
  });

  describe('Results state', () => {
    it('renders the radius adjuster collapsed by default', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel />);
      expect(screen.getByTestId('radius-adjuster-expanded')).toHaveTextContent('false');
    });

    it('renders a CategoryGroup for each distinct category on the Nearby Facilities tab', async () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel />);
      await userEvent.click(screen.getByRole('tab', { name: 'Nearby Facilities' }));
      expect(screen.getByTestId('category-group-schools')).toBeInTheDocument();
      expect(screen.getByTestId('category-group-bus_stops')).toBeInTheDocument();
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

    it('renders HazardDisplay, tucked away collapsed by default, when hazard is present alongside facilities', async () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          analysisResult: { ...mockAnalysisResult, hazard: mockHazard },
        })
      );
      render(<ResultsPanel />);
      expect(screen.queryByTestId('hazard-display')).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Hazard Score' }));
      expect(screen.getByTestId('hazard-display')).toBeInTheDocument();
    });

    it('does not render HazardDisplay when hazard is absent', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel />);
      expect(screen.queryByTestId('hazard-display')).not.toBeInTheDocument();
    });
  });

  describe('Category expansion', () => {
    it('shows FacilityItems after clicking toggle expand', async () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel />);
      await userEvent.click(screen.getByRole('tab', { name: 'Nearby Facilities' }));
      await userEvent.click(screen.getByTestId('toggle-expand-schools'));
      expect(screen.getByTestId('facility-school-1')).toBeInTheDocument();
    });

    it('hides FacilityItems after collapsing an expanded category', async () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel />);
      await userEvent.click(screen.getByRole('tab', { name: 'Nearby Facilities' }));
      await userEvent.click(screen.getByTestId('toggle-expand-schools'));
      expect(screen.getByTestId('facility-school-1')).toBeInTheDocument();
      await userEvent.click(screen.getByTestId('toggle-expand-schools'));
      expect(screen.queryByTestId('facility-school-1')).not.toBeInTheDocument();
    });

    it('expanding one category does not expand another', async () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel />);
      await userEvent.click(screen.getByRole('tab', { name: 'Nearby Facilities' }));
      await userEvent.click(screen.getByTestId('toggle-expand-schools'));
      expect(screen.getByTestId('facility-school-1')).toBeInTheDocument();
      expect(screen.queryByTestId('facility-bus-1')).not.toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('calls onFacilityClick with the feature when a facility item is clicked', async () => {
      const onFacilityClick = jest.fn();
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel onFacilityClick={onFacilityClick} />);
      await userEvent.click(screen.getByRole('tab', { name: 'Nearby Facilities' }));
      await userEvent.click(screen.getByTestId('toggle-expand-schools'));
      await userEvent.click(screen.getByTestId('facility-school-1'));
      expect(onFacilityClick).toHaveBeenCalledWith(mockFeatures[0]);
    });

    it('calls toggleCategoryVisibility from store when visibility is toggled', async () => {
      const toggleCategoryVisibility = jest.fn();
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ analysisResult: mockAnalysisResult, toggleCategoryVisibility })
      );
      render(<ResultsPanel />);
      await userEvent.click(screen.getByRole('tab', { name: 'Nearby Facilities' }));
      fireEvent.click(screen.getByTestId('toggle-visibility-schools'));
      expect(toggleCategoryVisibility).toHaveBeenCalledWith('schools');
    });
  });

  describe('Score / Nearby Facilities tabs', () => {
    it('defaults to the Score tab', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel />);
      expect(screen.getByRole('tab', { name: 'Score' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('score-display')).toBeInTheDocument();
      expect(screen.queryByTestId('category-group-schools')).not.toBeInTheDocument();
    });

    it('switches panels when Nearby Facilities is clicked, hiding Score content', async () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel />);
      await userEvent.click(screen.getByRole('tab', { name: 'Nearby Facilities' }));
      expect(screen.getByRole('tab', { name: 'Nearby Facilities' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.queryByTestId('score-display')).not.toBeInTheDocument();
      expect(screen.getByTestId('category-group-schools')).toBeInTheDocument();
    });

    it('resets back to the Score tab when a new address is searched', async () => {
      const { rerender } = render(<ResultsPanel />);
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ analysisResult: mockAnalysisResult, selectedAddress: MOCK_ADDRESS })
      );
      rerender(<ResultsPanel />);
      await userEvent.click(screen.getByRole('tab', { name: 'Nearby Facilities' }));
      expect(screen.getByRole('tab', { name: 'Nearby Facilities' })).toHaveAttribute('aria-selected', 'true');

      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          analysisResult: mockAnalysisResult,
          selectedAddress: { ...MOCK_ADDRESS, lat: MOCK_ADDRESS.lat + 1 },
        })
      );
      rerender(<ResultsPanel />);
      expect(screen.getByRole('tab', { name: 'Score' })).toHaveAttribute('aria-selected', 'true');
    });

    it('renders the radius adjuster regardless of the active tab', async () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel />);
      expect(screen.getByTestId('radius-adjuster-mock')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('tab', { name: 'Nearby Facilities' }));
      expect(screen.getByTestId('radius-adjuster-mock')).toBeInTheDocument();
    });
  });
});
