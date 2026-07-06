import { render, screen } from '@testing-library/react';
import { AnalysisContainer } from './AnalysisContainer';

jest.mock('@/store');
jest.mock('./ResultsPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="results-panel-mock" />,
}));
jest.mock('@/containers/NavigateContainer', () => ({
  __esModule: true,
  NavigateContainer: () => <div data-testid="navigate-container-mock" />,
}));

import { useLocationStore } from '@/store';

const mockUseLocationStore = useLocationStore as jest.MockedFunction<typeof useLocationStore>;

const makeStoreState = (overrides = {}) => ({
  selectedAddress: null,
  radiusKm: 10,
  distanceMode: 'driving' as const,
  analysisResult: null,
  isAnalyzing: false,
  isNavigating: false,
  visibleCategories: new Set<string>(),
  setSelectedAddress: jest.fn(),
  setRadiusKm: jest.fn(),
  setDistanceMode: jest.fn(),
  setAnalysisResult: jest.fn(),
  setIsAnalyzing: jest.fn(),
  toggleCategoryVisibility: jest.fn(),
  clearVisibleCategories: jest.fn(),
  toasts: [],
  addToast: jest.fn(),
  removeToast: jest.fn(),
  clearToasts: jest.fn(),
  ...overrides,
});

describe('AnalysisContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocationStore.mockReturnValue(makeStoreState());
  });

  describe('Rendering', () => {
    it('renders nothing when no address is selected', () => {
      const { container } = render(<AnalysisContainer />);
      expect(container).toBeEmptyDOMElement();
    });

    it('renders ResultsPanel when an address is selected', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          selectedAddress: { displayName: '123 Main St, Auckland', lat: -36.85, lon: 174.76 },
        })
      );
      render(<AnalysisContainer />);
      expect(screen.getByTestId('results-panel-mock')).toBeInTheDocument();
    });

    it('renders NavigateContainer when isNavigating is true', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          selectedAddress: { displayName: '123 Main St, Auckland', lat: -36.85, lon: 174.76 },
          isNavigating: true,
        })
      );
      render(<AnalysisContainer />);
      expect(screen.getByTestId('navigate-container-mock')).toBeInTheDocument();
      expect(screen.queryByTestId('results-panel-mock')).not.toBeInTheDocument();
    });
  });
});
