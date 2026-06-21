import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResultsPanel from './ResultsPanel';
import type { AnalyzeResponse, Feature, ScoreResult } from '@/types/api';

jest.mock('@/store');
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, opts?: { defaultValue?: string }) => {
    if (opts?.defaultValue) return opts.defaultValue;
    const map: Record<string, string> = {
      'results.title': 'Results',
    };
    return map[key] ?? key;
  },
}));
jest.mock('@/components/LoadingSkeleton', () => ({
  __esModule: true,
  default: ({ count }: { count: number }) => (
    <div data-testid="loading-skeleton">Loading ({count})</div>
  ),
}));
jest.mock('@/components/FacilityItem', () => ({
  __esModule: true,
  default: ({ feature, onClick }: { feature: Feature; onClick: () => void }) => (
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
jest.mock('@/components/CategoryGroup', () => ({
  __esModule: true,
  default: ({
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

const mockUseLocationStore = useLocationStore as jest.MockedFunction<typeof useLocationStore>;

const mockScore: ScoreResult = {
  education: 72,
  healthcare: null,
  transport: 85,
  shopping: null,
  overall: 77,
  coverage: '2/4',
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
  ...overrides,
});

describe('ResultsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocationStore.mockReturnValue(makeStoreState());
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

    it('calls onIncreaseRadius when the increase radius button is clicked', async () => {
      const onIncreaseRadius = jest.fn();
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ analysisResult: { ...mockAnalysisResult, features: [] } })
      );
      render(<ResultsPanel onIncreaseRadius={onIncreaseRadius} />);
      await userEvent.click(screen.getByRole('button', { name: /increase/i }));
      expect(onIncreaseRadius).toHaveBeenCalledTimes(1);
    });
  });

  describe('Results state', () => {
    it('renders a CategoryGroup for each distinct category', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel />);
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
  });

  describe('Category expansion', () => {
    it('shows FacilityItems after clicking toggle expand', async () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel />);
      await userEvent.click(screen.getByTestId('toggle-expand-schools'));
      expect(screen.getByTestId('facility-school-1')).toBeInTheDocument();
    });

    it('hides FacilityItems after collapsing an expanded category', async () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel />);
      await userEvent.click(screen.getByTestId('toggle-expand-schools'));
      expect(screen.getByTestId('facility-school-1')).toBeInTheDocument();
      await userEvent.click(screen.getByTestId('toggle-expand-schools'));
      expect(screen.queryByTestId('facility-school-1')).not.toBeInTheDocument();
    });

    it('expanding one category does not expand another', async () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ analysisResult: mockAnalysisResult }));
      render(<ResultsPanel />);
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
      await userEvent.click(screen.getByTestId('toggle-expand-schools'));
      await userEvent.click(screen.getByTestId('facility-school-1'));
      expect(onFacilityClick).toHaveBeenCalledWith(mockFeatures[0]);
    });

    it('calls toggleCategoryVisibility from store when visibility is toggled', () => {
      const toggleCategoryVisibility = jest.fn();
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ analysisResult: mockAnalysisResult, toggleCategoryVisibility })
      );
      render(<ResultsPanel />);
      fireEvent.click(screen.getByTestId('toggle-visibility-schools'));
      expect(toggleCategoryVisibility).toHaveBeenCalledWith('schools');
    });
  });
});
