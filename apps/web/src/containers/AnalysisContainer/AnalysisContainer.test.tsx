import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalysisContainer } from './AnalysisContainer';

jest.mock('@/store');
jest.mock('./ResultsPanel', () => ({
  __esModule: true,
  default: ({ onIncreaseRadius }: { onIncreaseRadius?: () => void }) => (
    <div data-testid="results-panel-mock">
      <button data-testid="increase-radius-button" onClick={onIncreaseRadius}>
        Increase Radius
      </button>
    </div>
  ),
}));

import { useLocationStore } from '@/store';

const mockUseLocationStore = useLocationStore as jest.MockedFunction<typeof useLocationStore>;

const makeStoreState = (overrides = {}) => ({
  selectedAddress: null,
  radiusKm: 10,
  distanceMode: 'driving' as const,
  analysisResult: null,
  isAnalyzing: false,
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
  });

  describe('Radius increase', () => {
    it('calls setRadiusKm with radiusKm + 5 when onIncreaseRadius is triggered', async () => {
      const setRadiusKm = jest.fn();
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          selectedAddress: { displayName: '123 Main St, Auckland', lat: -36.85, lon: 174.76 },
          radiusKm: 10,
          setRadiusKm,
        })
      );
      render(<AnalysisContainer />);
      await userEvent.click(screen.getByTestId('increase-radius-button'));
      expect(setRadiusKm).toHaveBeenCalledWith(15);
    });

    it('increments correctly from a non-default radiusKm', async () => {
      const setRadiusKm = jest.fn();
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          selectedAddress: { displayName: '123 Main St, Auckland', lat: -36.85, lon: 174.76 },
          radiusKm: 20,
          setRadiusKm,
        })
      );
      render(<AnalysisContainer />);
      await userEvent.click(screen.getByTestId('increase-radius-button'));
      expect(setRadiusKm).toHaveBeenCalledWith(25);
    });
  });
});
