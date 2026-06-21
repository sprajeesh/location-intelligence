import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadiusSelectorContainer } from './RadiusSelectorContainer';

jest.mock('@/store');
jest.mock('@/hooks/useAnalyze');
jest.mock('@/components/RadiusSelector', () => ({
  __esModule: true,
  RadiusSelector: ({
    value,
    onChange,
    disabled,
  }: {
    value: number;
    onChange: (v: number) => void;
    disabled: boolean;
  }) => (
    <div data-testid="radius-selector-mock">
      <span data-testid="radius-value">{value}</span>
      <span data-testid="disabled-state">{String(disabled)}</span>
      <button data-testid="change-to-3" onClick={() => onChange(3)}>
        Change to 3
      </button>
      <button data-testid="change-to-7" onClick={() => onChange(7)}>
        Change to 7
      </button>
    </div>
  ),
}));

import { useLocationStore } from '@/store';
import { useAnalyze } from '@/hooks/useAnalyze';

const mockUseLocationStore = useLocationStore as jest.MockedFunction<typeof useLocationStore>;
const mockUseAnalyze = useAnalyze as jest.MockedFunction<typeof useAnalyze>;

const MOCK_ADDRESS = {
  displayName: '123 Main Street, Auckland',
  lat: -36.8485,
  lon: 174.7633,
};

const makeStoreState = (overrides = {}) => ({
  radiusKm: 5,
  selectedAddress: null,
  isAnalyzing: false,
  distanceMode: 'driving' as const,
  setRadiusKm: jest.fn(),
  setAnalysisResult: jest.fn(),
  clearVisibleCategories: jest.fn(),
  analysisResult: null,
  visibleCategories: new Set<string>(),
  setSelectedAddress: jest.fn(),
  setDistanceMode: jest.fn(),
  setIsAnalyzing: jest.fn(),
  toggleCategoryVisibility: jest.fn(),
  toasts: [],
  addToast: jest.fn(),
  removeToast: jest.fn(),
  clearToasts: jest.fn(),
  ...overrides,
});

describe('RadiusSelectorContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAnalyze.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
    } as any);
    mockUseLocationStore.mockReturnValue(makeStoreState());
  });

  describe('Rendering', () => {
    it('renders the RadiusSelector component', () => {
      render(<RadiusSelectorContainer />);
      expect(screen.getByTestId('radius-selector-mock')).toBeInTheDocument();
    });

    it('passes radiusKm from the store as value', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ radiusKm: 10 }));
      render(<RadiusSelectorContainer />);
      expect(screen.getByTestId('radius-value')).toHaveTextContent('10');
    });

    it('passes disabled=false when isAnalyzing is false', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ isAnalyzing: false }));
      render(<RadiusSelectorContainer />);
      expect(screen.getByTestId('disabled-state')).toHaveTextContent('false');
    });

    it('passes disabled=true when isAnalyzing is true', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ isAnalyzing: true }));
      render(<RadiusSelectorContainer />);
      expect(screen.getByTestId('disabled-state')).toHaveTextContent('true');
    });
  });

  describe('Radius change — no selected address', () => {
    it('calls setRadiusKm with the new radius', async () => {
      const setRadiusKm = jest.fn();
      mockUseLocationStore.mockReturnValue(makeStoreState({ setRadiusKm }));
      render(<RadiusSelectorContainer />);
      await userEvent.click(screen.getByTestId('change-to-3'));
      expect(setRadiusKm).toHaveBeenCalledWith(3);
    });

    it('calls setAnalysisResult(null) to clear stale results', async () => {
      const setAnalysisResult = jest.fn();
      mockUseLocationStore.mockReturnValue(makeStoreState({ setAnalysisResult }));
      render(<RadiusSelectorContainer />);
      await userEvent.click(screen.getByTestId('change-to-3'));
      expect(setAnalysisResult).toHaveBeenCalledWith(null);
    });

    it('calls clearVisibleCategories to reset map markers', async () => {
      const clearVisibleCategories = jest.fn();
      mockUseLocationStore.mockReturnValue(makeStoreState({ clearVisibleCategories }));
      render(<RadiusSelectorContainer />);
      await userEvent.click(screen.getByTestId('change-to-3'));
      expect(clearVisibleCategories).toHaveBeenCalledTimes(1);
    });

    it('does not call analyze when no address is selected', async () => {
      const analyze = jest.fn();
      mockUseAnalyze.mockReturnValue({ mutate: analyze } as any);
      mockUseLocationStore.mockReturnValue(makeStoreState({ selectedAddress: null }));
      render(<RadiusSelectorContainer />);
      await userEvent.click(screen.getByTestId('change-to-3'));
      expect(analyze).not.toHaveBeenCalled();
    });
  });

  describe('Radius change — with selected address', () => {
    it('calls analyze with the full correct payload', async () => {
      const analyze = jest.fn();
      mockUseAnalyze.mockReturnValue({ mutate: analyze } as any);
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ selectedAddress: MOCK_ADDRESS, distanceMode: 'driving' })
      );
      render(<RadiusSelectorContainer />);
      await userEvent.click(screen.getByTestId('change-to-3'));
      expect(analyze).toHaveBeenCalledWith({
        address: MOCK_ADDRESS.displayName,
        lat: MOCK_ADDRESS.lat,
        lon: MOCK_ADDRESS.lon,
        radiusKm: 3,
        categories: ['schools', 'bus_stops'],
        distanceMode: 'driving',
      });
    });

    it('uses the new radius in the analyze payload, not the previous store value', async () => {
      const analyze = jest.fn();
      mockUseAnalyze.mockReturnValue({ mutate: analyze } as any);
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ selectedAddress: MOCK_ADDRESS, radiusKm: 5 })
      );
      render(<RadiusSelectorContainer />);
      await userEvent.click(screen.getByTestId('change-to-7'));
      expect(analyze).toHaveBeenCalledWith(expect.objectContaining({ radiusKm: 7 }));
    });

    it('forwards the current distanceMode to analyze', async () => {
      const analyze = jest.fn();
      mockUseAnalyze.mockReturnValue({ mutate: analyze } as any);
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ selectedAddress: MOCK_ADDRESS, distanceMode: 'walking' })
      );
      render(<RadiusSelectorContainer />);
      await userEvent.click(screen.getByTestId('change-to-3'));
      expect(analyze).toHaveBeenCalledWith(expect.objectContaining({ distanceMode: 'walking' }));
    });

    it('clears state and triggers analyze in the same change handler', async () => {
      const analyze = jest.fn();
      const setRadiusKm = jest.fn();
      const setAnalysisResult = jest.fn();
      const clearVisibleCategories = jest.fn();
      mockUseAnalyze.mockReturnValue({ mutate: analyze } as any);
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          selectedAddress: MOCK_ADDRESS,
          setRadiusKm,
          setAnalysisResult,
          clearVisibleCategories,
        })
      );
      render(<RadiusSelectorContainer />);
      await userEvent.click(screen.getByTestId('change-to-3'));
      expect(setRadiusKm).toHaveBeenCalledWith(3);
      expect(setAnalysisResult).toHaveBeenCalledWith(null);
      expect(clearVisibleCategories).toHaveBeenCalledTimes(1);
      expect(analyze).toHaveBeenCalledTimes(1);
    });
  });
});
