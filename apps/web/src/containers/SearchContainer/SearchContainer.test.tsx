import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchContainer } from './SearchContainer';
import type { AddressResult } from '@/types/api';

jest.mock('@/hooks/useAddressSearch');
jest.mock('@/hooks/useAnalyze');
jest.mock('@/store');
jest.mock('@/components/SearchBar', () => ({
  SearchBar: ({
    query,
    suggestions,
    isLoading,
    error,
    onQueryChange,
    onSelectAddress,
    onClear,
  }: any) => (
    <div data-testid="search-bar-mock">
      <input
        data-testid="search-input"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search"
      />
      <div data-testid="loading-state">{isLoading ? 'Loading' : 'Not loading'}</div>
      <div data-testid="error-state">{error || 'No error'}</div>
      <button
        data-testid="clear-button"
        onClick={onClear}
      >
        Clear
      </button>
      <div data-testid="suggestions-list">
        {suggestions.map((s: AddressResult) => (
          <button
            key={`${s.lat}-${s.lon}`}
            data-testid={`suggestion-${s.displayName}`}
            onClick={() => onSelectAddress(s)}
          >
            {s.displayName}
          </button>
        ))}
      </div>
    </div>
  ),
}));

import { useAddressSearch } from '@/hooks/useAddressSearch';
import { useAnalyze } from '@/hooks/useAnalyze';
import { useLocationStore } from '@/store';

const mockUseAddressSearch = useAddressSearch as jest.MockedFunction<
  typeof useAddressSearch
>;
const mockUseAnalyze = useAnalyze as jest.MockedFunction<typeof useAnalyze>;
const mockUseLocationStore = useLocationStore as jest.MockedFunction<
  typeof useLocationStore
>;

describe('SearchContainer', () => {
  const mockSuggestions: AddressResult[] = [
    {
      displayName: '123 Main Street, Auckland',
      lat: -36.8485,
      lon: 174.7633,
    },
    {
      displayName: '456 Queen Street, Auckland',
      lat: -36.8427,
      lon: 174.7675,
    },
  ];

  const mockAddressResult: AddressResult = {
    displayName: '123 Main Street, Auckland',
    lat: -36.8485,
    lon: 174.7633,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAddressSearch.mockReturnValue({
      query: '',
      setQuery: jest.fn(),
      suggestions: [],
      isLoading: false,
      error: null,
    });

    mockUseAnalyze.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
    } as any);

    mockUseLocationStore.mockReturnValue({
      selectedAddress: null,
      radiusKm: 10,
      distanceMode: 'driving',
      analysisResult: null,
      isAnalyzing: false,
      visibleCategories: new Set(),
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
    });
  });

  describe('Rendering', () => {
    it('renders the SearchBar component', () => {
      render(<SearchContainer />);
      expect(screen.getByTestId('search-bar-mock')).toBeInTheDocument();
    });

    it('renders the search input', () => {
      render(<SearchContainer />);
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });
  });

  describe('Props Passing', () => {
    it('passes query from useAddressSearch to SearchBar', () => {
      mockUseAddressSearch.mockReturnValue({
        query: 'Main Street',
        setQuery: jest.fn(),
        suggestions: [],
        isLoading: false,
        error: null,
      });

      render(<SearchContainer />);
      const input = screen.getByTestId('search-input') as HTMLInputElement;
      expect(input.value).toBe('Main Street');
    });

    it('displays current query even when address is selected', () => {
      mockUseAddressSearch.mockReturnValue({
        query: 'Main',
        setQuery: jest.fn(),
        suggestions: [],
        isLoading: false,
        error: null,
      });

      mockUseLocationStore.mockReturnValue({
        selectedAddress: mockAddressResult,
        radiusKm: 10,
        distanceMode: 'driving',
        analysisResult: null,
        isAnalyzing: false,
        visibleCategories: new Set(),
        setSelectedAddress: jest.fn(),
        setRadiusKm: jest.fn(),
        setDistanceMode: jest.fn(),
        setAnalysisResult: jest.fn(),
        setIsAnalyzing: jest.fn(),
        toggleCategoryVisibility: jest.fn(),
        toasts: [],
        addToast: jest.fn(),
        removeToast: jest.fn(),
        clearToasts: jest.fn(),
      });

      render(<SearchContainer />);
      const input = screen.getByTestId('search-input') as HTMLInputElement;
      // displayValue is always the current query, not selectedAddress displayName
      expect(input.value).toBe('Main');
    });

    it('falls back to query from hook when no selectedAddress', () => {
      mockUseAddressSearch.mockReturnValue({
        query: 'Main Street',
        setQuery: jest.fn(),
        suggestions: [],
        isLoading: false,
        error: null,
      });

      mockUseLocationStore.mockReturnValue({
        selectedAddress: null,
        radiusKm: 10,
        distanceMode: 'driving',
        analysisResult: null,
        isAnalyzing: false,
        visibleCategories: new Set(),
        setSelectedAddress: jest.fn(),
        setRadiusKm: jest.fn(),
        setDistanceMode: jest.fn(),
        setAnalysisResult: jest.fn(),
        setIsAnalyzing: jest.fn(),
        toggleCategoryVisibility: jest.fn(),
        toasts: [],
        addToast: jest.fn(),
        removeToast: jest.fn(),
        clearToasts: jest.fn(),
      });

      render(<SearchContainer />);
      const input = screen.getByTestId('search-input') as HTMLInputElement;
      expect(input.value).toBe('Main Street');
    });

    it('passes suggestions from useAddressSearch to SearchBar', () => {
      mockUseAddressSearch.mockReturnValue({
        query: 'Main',
        setQuery: jest.fn(),
        suggestions: mockSuggestions,
        isLoading: false,
        error: null,
      });

      render(<SearchContainer />);
      mockSuggestions.forEach((suggestion) => {
        expect(
          screen.getByTestId(`suggestion-${suggestion.displayName}`)
        ).toBeInTheDocument();
      });
    });

    it('passes isLoading state to SearchBar', () => {
      mockUseAddressSearch.mockReturnValue({
        query: '',
        setQuery: jest.fn(),
        suggestions: [],
        isLoading: true,
        error: null,
      });

      render(<SearchContainer />);
      expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading');
    });

    it('passes error state to SearchBar', () => {
      mockUseAddressSearch.mockReturnValue({
        query: '',
        setQuery: jest.fn(),
        suggestions: [],
        isLoading: false,
        error: 'API Error occurred',
      });

      render(<SearchContainer />);
      expect(screen.getByTestId('error-state')).toHaveTextContent(
        'API Error occurred'
      );
    });
  });

  describe('Event Handlers', () => {
    it('calls setQuery when onQueryChange is fired', async () => {
      const setQuery = jest.fn();
      mockUseAddressSearch.mockReturnValue({
        query: '',
        setQuery,
        suggestions: [],
        isLoading: false,
        error: null,
      });

      render(<SearchContainer />);
      const input = screen.getByTestId('search-input');

      fireEvent.change(input, { target: { value: 'Main' } });

      expect(setQuery).toHaveBeenCalledWith('Main');
    });

    it('calls setSelectedAddress and setQuery when address is selected', async () => {
      const setQuery = jest.fn();
      const setSelectedAddress = jest.fn();

      mockUseAddressSearch.mockReturnValue({
        query: '',
        setQuery,
        suggestions: mockSuggestions,
        isLoading: false,
        error: null,
      });

      mockUseLocationStore.mockReturnValue({
        selectedAddress: null,
        radiusKm: 10,
        distanceMode: 'driving',
        analysisResult: null,
        isAnalyzing: false,
        visibleCategories: new Set(),
        setSelectedAddress,
        setRadiusKm: jest.fn(),
        setDistanceMode: jest.fn(),
        setAnalysisResult: jest.fn(),
        setIsAnalyzing: jest.fn(),
        toggleCategoryVisibility: jest.fn(),
        toasts: [],
        addToast: jest.fn(),
        removeToast: jest.fn(),
        clearToasts: jest.fn(),
      });

      render(<SearchContainer />);
      const suggestionButton = screen.getByTestId(
        `suggestion-${mockSuggestions[0].displayName}`
      );

      await userEvent.click(suggestionButton);

      expect(setSelectedAddress).toHaveBeenCalledWith(mockSuggestions[0]);
      expect(setQuery).toHaveBeenCalledWith(mockSuggestions[0].displayName);
    });

    it('calls both setQuery and setSelectedAddress on onClear', async () => {
      const setQuery = jest.fn();
      const setSelectedAddress = jest.fn();

      mockUseAddressSearch.mockReturnValue({
        query: 'Main Street',
        setQuery,
        suggestions: [],
        isLoading: false,
        error: null,
      });

      mockUseLocationStore.mockReturnValue({
        selectedAddress: mockAddressResult,
        radiusKm: 10,
        distanceMode: 'driving',
        analysisResult: null,
        isAnalyzing: false,
        visibleCategories: new Set(),
        setSelectedAddress,
        setRadiusKm: jest.fn(),
        setDistanceMode: jest.fn(),
        setAnalysisResult: jest.fn(),
        setIsAnalyzing: jest.fn(),
        toggleCategoryVisibility: jest.fn(),
        toasts: [],
        addToast: jest.fn(),
        removeToast: jest.fn(),
        clearToasts: jest.fn(),
      });

      render(<SearchContainer />);
      const clearButton = screen.getByTestId('clear-button');

      await userEvent.click(clearButton);

      expect(setQuery).toHaveBeenCalledWith('');
      expect(setSelectedAddress).toHaveBeenCalledWith(null);
    });
  });

  describe('Business Logic', () => {
    it('displays current query and clears selectedAddress when user types different value', async () => {
      const setQuery = jest.fn();
      const setSelectedAddress = jest.fn();

      mockUseAddressSearch.mockReturnValue({
        query: 'Main',
        setQuery,
        suggestions: [],
        isLoading: false,
        error: null,
      });

      mockUseLocationStore.mockReturnValue({
        selectedAddress: mockAddressResult,
        radiusKm: 10,
        distanceMode: 'driving',
        analysisResult: null,
        isAnalyzing: false,
        visibleCategories: new Set(),
        setSelectedAddress,
        setRadiusKm: jest.fn(),
        setDistanceMode: jest.fn(),
        setAnalysisResult: jest.fn(),
        setIsAnalyzing: jest.fn(),
        toggleCategoryVisibility: jest.fn(),
        toasts: [],
        addToast: jest.fn(),
        removeToast: jest.fn(),
        clearToasts: jest.fn(),
      });

      render(<SearchContainer />);
      const input = screen.getByTestId('search-input');

      // displayValue is always the current query
      expect((input as HTMLInputElement).value).toBe('Main');

      // Typing something different from selectedAddress displayName clears the selectedAddress
      fireEvent.change(input, { target: { value: 'Different' } });

      expect(setQuery).toHaveBeenCalledWith('Different');
      expect(setSelectedAddress).toHaveBeenCalledWith(null);
    });

    it('maintains selectedAddress through multiple operations', async () => {
      const setQuery = jest.fn();
      const setSelectedAddress = jest.fn();

      mockUseAddressSearch.mockReturnValue({
        query: 'Main',
        setQuery,
        suggestions: mockSuggestions,
        isLoading: false,
        error: null,
      });

      mockUseLocationStore.mockReturnValue({
        selectedAddress: null,
        radiusKm: 10,
        distanceMode: 'driving',
        analysisResult: null,
        isAnalyzing: false,
        visibleCategories: new Set(),
        setSelectedAddress,
        setRadiusKm: jest.fn(),
        setDistanceMode: jest.fn(),
        setAnalysisResult: jest.fn(),
        setIsAnalyzing: jest.fn(),
        toggleCategoryVisibility: jest.fn(),
        toasts: [],
        addToast: jest.fn(),
        removeToast: jest.fn(),
        clearToasts: jest.fn(),
      });

      render(<SearchContainer />);

      const suggestionButton = screen.getByTestId(
        `suggestion-${mockSuggestions[0].displayName}`
      );
      await userEvent.click(suggestionButton);

      expect(setSelectedAddress).toHaveBeenCalledWith(mockSuggestions[0]);
      expect(setQuery).toHaveBeenCalledWith(mockSuggestions[0].displayName);
    });
  });
});
