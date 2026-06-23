import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavigateSearchContainer } from './NavigateSearchContainer';
import type { AddressResult } from '@/types/api';

jest.mock('@/store');
jest.mock('@/hooks/useAddressSearch');
jest.mock('@/components/NavigateSearchBar', () => ({
  __esModule: true,
  default: ({
    fromQuery,
    toQuery,
    onFromQueryChange,
    onToQueryChange,
    onFromSelect,
    onToSelect,
    onBack,
    fromSuggestions,
    toSuggestions,
  }: {
    fromQuery: string;
    toQuery: string;
    onFromQueryChange: (v: string) => void;
    onToQueryChange: (v: string) => void;
    onFromSelect: (a: AddressResult) => void;
    onToSelect: (a: AddressResult) => void;
    onBack: () => void;
    fromSuggestions: AddressResult[];
    toSuggestions: AddressResult[];
  }) => (
    <div data-testid="navigate-search-bar-mock">
      <input
        data-testid="from-input"
        value={fromQuery}
        onChange={(e) => onFromQueryChange(e.target.value)}
      />
      <input
        data-testid="to-input"
        value={toQuery}
        onChange={(e) => onToQueryChange(e.target.value)}
      />
      <button data-testid="back-button" onClick={onBack}>
        back
      </button>
      {fromSuggestions.map((s) => (
        <button
          key={s.displayName}
          data-testid={`from-suggestion-${s.displayName}`}
          onClick={() => onFromSelect(s)}
        >
          {s.displayName}
        </button>
      ))}
      {toSuggestions.map((s) => (
        <button
          key={s.displayName}
          data-testid={`to-suggestion-${s.displayName}`}
          onClick={() => onToSelect(s)}
        >
          {s.displayName}
        </button>
      ))}
    </div>
  ),
}));

import { useLocationStore } from '@/store';
import { useAddressSearch } from '@/hooks/useAddressSearch';

const mockUseLocationStore = useLocationStore as jest.MockedFunction<typeof useLocationStore>;
const mockUseAddressSearch = useAddressSearch as jest.MockedFunction<typeof useAddressSearch>;

const MOCK_FROM: AddressResult = { displayName: '10 Willis Street, Wellington', lat: -41.285, lon: 174.776 };
const MOCK_TO: AddressResult = { displayName: 'Wellington Airport', lat: -41.327, lon: 174.805 };
const MOCK_SUGGESTION: AddressResult = { displayName: '99 Other Street', lat: -41.29, lon: 174.79 };

const makeHookState = (overrides = {}) => ({
  query: '',
  setQuery: jest.fn(),
  suggestions: [] as AddressResult[],
  isLoading: false,
  error: null as string | null,
  ...overrides,
});

const makeStoreState = (overrides = {}) => ({
  navigateFrom: null as AddressResult | null,
  navigateTo: null as AddressResult | null,
  setNavigateFrom: jest.fn(),
  setNavigateTo: jest.fn(),
  exitNavigation: jest.fn(),
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
  isNavigating: false,
  routeMode: 'driving' as const,
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
  setRouteMode: jest.fn(),
  setActiveRoute: jest.fn(),
  ...overrides,
});

describe('NavigateSearchContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: both hook instances return empty state
    mockUseAddressSearch.mockReturnValue(makeHookState());
    mockUseLocationStore.mockReturnValue(makeStoreState());
  });

  describe('Rendering', () => {
    it('renders the NavigateSearchBar component', () => {
      render(<NavigateSearchContainer />);
      expect(screen.getByTestId('navigate-search-bar-mock')).toBeInTheDocument();
    });
  });

  describe('Seed on mount', () => {
    it('calls fromSearch.setQuery with navigateFrom.displayName on mount', () => {
      const fromSetQuery = jest.fn();
      // First call → fromSearch, subsequent → toSearch
      mockUseAddressSearch
        .mockReturnValueOnce(makeHookState({ setQuery: fromSetQuery }))
        .mockReturnValue(makeHookState());
      mockUseLocationStore.mockReturnValue(makeStoreState({ navigateFrom: MOCK_FROM }));

      render(<NavigateSearchContainer />);
      expect(fromSetQuery).toHaveBeenCalledWith(MOCK_FROM.displayName);
    });

    it('calls toSearch.setQuery with navigateTo.displayName on mount', () => {
      const toSetQuery = jest.fn();
      mockUseAddressSearch
        .mockReturnValueOnce(makeHookState())
        .mockReturnValue(makeHookState({ setQuery: toSetQuery }));
      mockUseLocationStore.mockReturnValue(makeStoreState({ navigateTo: MOCK_TO }));

      render(<NavigateSearchContainer />);
      expect(toSetQuery).toHaveBeenCalledWith(MOCK_TO.displayName);
    });

    it('does not call setQuery when store values are null', () => {
      const fromSetQuery = jest.fn();
      const toSetQuery = jest.fn();
      mockUseAddressSearch
        .mockReturnValueOnce(makeHookState({ setQuery: fromSetQuery }))
        .mockReturnValue(makeHookState({ setQuery: toSetQuery }));

      render(<NavigateSearchContainer />);
      expect(fromSetQuery).not.toHaveBeenCalled();
      expect(toSetQuery).not.toHaveBeenCalled();
    });
  });

  describe('Query passthrough', () => {
    it('from-input reflects fromSearch.query', () => {
      mockUseAddressSearch
        .mockReturnValueOnce(makeHookState({ query: 'Willis' }))
        .mockReturnValue(makeHookState());
      render(<NavigateSearchContainer />);
      expect((screen.getByTestId('from-input') as HTMLInputElement).value).toBe('Willis');
    });

    it('to-input reflects toSearch.query', () => {
      mockUseAddressSearch
        .mockReturnValueOnce(makeHookState())
        .mockReturnValue(makeHookState({ query: 'Lambton' }));
      render(<NavigateSearchContainer />);
      expect((screen.getByTestId('to-input') as HTMLInputElement).value).toBe('Lambton');
    });
  });

  describe('Suggestions passthrough', () => {
    it('renders from suggestions from the from hook', () => {
      mockUseAddressSearch
        .mockReturnValueOnce(makeHookState({ suggestions: [MOCK_SUGGESTION] }))
        .mockReturnValue(makeHookState());
      render(<NavigateSearchContainer />);
      expect(screen.getByTestId(`from-suggestion-${MOCK_SUGGESTION.displayName}`)).toBeInTheDocument();
    });

    it('renders to suggestions from the to hook', () => {
      mockUseAddressSearch
        .mockReturnValueOnce(makeHookState())
        .mockReturnValue(makeHookState({ suggestions: [MOCK_SUGGESTION] }));
      render(<NavigateSearchContainer />);
      expect(screen.getByTestId(`to-suggestion-${MOCK_SUGGESTION.displayName}`)).toBeInTheDocument();
    });
  });

  describe('From address selection', () => {
    it('calls setNavigateFrom with the selected address', async () => {
      const setNavigateFrom = jest.fn();
      mockUseAddressSearch
        .mockReturnValueOnce(makeHookState({ suggestions: [MOCK_SUGGESTION] }))
        .mockReturnValue(makeHookState());
      mockUseLocationStore.mockReturnValue(makeStoreState({ setNavigateFrom }));

      render(<NavigateSearchContainer />);
      await userEvent.click(screen.getByTestId(`from-suggestion-${MOCK_SUGGESTION.displayName}`));
      expect(setNavigateFrom).toHaveBeenCalledWith(MOCK_SUGGESTION);
    });

    it('calls fromSearch.setQuery with the selected address displayName', async () => {
      const fromSetQuery = jest.fn();
      mockUseAddressSearch
        .mockReturnValueOnce(makeHookState({ setQuery: fromSetQuery, suggestions: [MOCK_SUGGESTION] }))
        .mockReturnValue(makeHookState());

      render(<NavigateSearchContainer />);
      await userEvent.click(screen.getByTestId(`from-suggestion-${MOCK_SUGGESTION.displayName}`));
      expect(fromSetQuery).toHaveBeenCalledWith(MOCK_SUGGESTION.displayName);
    });
  });

  describe('To address selection', () => {
    it('calls setNavigateTo with the selected address', async () => {
      const setNavigateTo = jest.fn();
      mockUseAddressSearch
        .mockReturnValueOnce(makeHookState())
        .mockReturnValue(makeHookState({ suggestions: [MOCK_SUGGESTION] }));
      mockUseLocationStore.mockReturnValue(makeStoreState({ setNavigateTo }));

      render(<NavigateSearchContainer />);
      await userEvent.click(screen.getByTestId(`to-suggestion-${MOCK_SUGGESTION.displayName}`));
      expect(setNavigateTo).toHaveBeenCalledWith(MOCK_SUGGESTION);
    });

    it('calls toSearch.setQuery with the selected address displayName', async () => {
      const toSetQuery = jest.fn();
      mockUseAddressSearch
        .mockReturnValueOnce(makeHookState())
        .mockReturnValue(makeHookState({ setQuery: toSetQuery, suggestions: [MOCK_SUGGESTION] }));

      render(<NavigateSearchContainer />);
      await userEvent.click(screen.getByTestId(`to-suggestion-${MOCK_SUGGESTION.displayName}`));
      expect(toSetQuery).toHaveBeenCalledWith(MOCK_SUGGESTION.displayName);
    });
  });

  describe('Back button', () => {
    it('calls exitNavigation when back is clicked', async () => {
      const exitNavigation = jest.fn();
      mockUseLocationStore.mockReturnValue(makeStoreState({ exitNavigation }));

      render(<NavigateSearchContainer />);
      await userEvent.click(screen.getByTestId('back-button'));
      expect(exitNavigation).toHaveBeenCalledTimes(1);
    });
  });
});
