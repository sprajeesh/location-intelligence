import { render, screen } from '@testing-library/react';
import { HomeContainer } from './HomeContainer';

jest.mock('@/store');
jest.mock('@/containers/SearchContainer', () => ({
  SearchContainer: () => <div data-testid="search-container-mock" />,
}));
jest.mock('@/containers/NavigateSearchContainer', () => ({
  NavigateSearchContainer: () => <div data-testid="navigate-search-container-mock" />,
}));
jest.mock('@/containers/AnalysisContainer', () => ({
  AnalysisContainer: () => <div data-testid="analysis-container-mock" />,
}));
jest.mock('@/containers/MapContainer', () => ({
  MapContainerDynamic: () => <div data-testid="map-container-mock" />,
}));
jest.mock('@/containers/SettingsContainer', () => ({
  SettingsContainer: () => <div data-testid="settings-container-mock" />,
}));

import { useLocationStore } from '@/store';

const mockUseLocationStore = useLocationStore as jest.MockedFunction<typeof useLocationStore>;

const MOCK_ADDRESS = { displayName: '123 Main St, Auckland', lat: -36.85, lon: 174.76 };

const makeStoreState = (overrides = {}) => ({
  selectedAddress: null,
  isNavigating: false,
  ...overrides,
});

// HomeContainer always renders exactly two top-level children under its
// root: the search+results panel slot, then the map slot.
const getSlots = (container: HTMLElement) => {
  const root = container.firstElementChild as HTMLElement;
  return {
    panelWrapper: root.children[0] as HTMLElement,
    mapWrapper: root.children[1] as HTMLElement,
  };
};

describe('HomeContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocationStore.mockReturnValue(makeStoreState());
  });

  describe('Before an address is selected', () => {
    it('keeps the search column floating over the map (pointer-events-none overlay)', () => {
      const { container } = render(<HomeContainer />);
      const { panelWrapper } = getSlots(container);
      expect(panelWrapper.className).toContain('absolute inset-0');
      expect(panelWrapper.className).toContain('pointer-events-none');
      expect(panelWrapper.className).not.toContain('border-b');
    });

    it('renders SearchContainer, not NavigateSearchContainer', () => {
      render(<HomeContainer />);
      expect(screen.getByTestId('search-container-mock')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate-search-container-mock')).not.toBeInTheDocument();
    });

    it('renders the map inside a full-bleed wrapper', () => {
      const { container } = render(<HomeContainer />);
      const { mapWrapper } = getSlots(container);
      expect(mapWrapper).toContainElement(screen.getByTestId('map-container-mock'));
    });
  });

  describe('Once an address is selected', () => {
    beforeEach(() => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ selectedAddress: MOCK_ADDRESS }));
    });

    it('pins the panel as a flush, non-overlapping sidebar/mobile-split block', () => {
      const { container } = render(<HomeContainer />);
      const { panelWrapper } = getSlots(container);
      expect(panelWrapper.className).not.toContain('pointer-events-none');
      expect(panelWrapper.className).not.toContain('absolute inset-0');
      expect(panelWrapper.className).toContain('border-b');
      expect(panelWrapper.className).toContain('h-[60vh]');
      expect(panelWrapper.className).toContain('md:w-[360px]');
    });

    it('still renders SearchContainer at the top of the panel when not navigating', () => {
      render(<HomeContainer />);
      expect(screen.getByTestId('search-container-mock')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate-search-container-mock')).not.toBeInTheDocument();
    });

    it('swaps in NavigateSearchContainer once navigating, in the same slot', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ selectedAddress: MOCK_ADDRESS, isNavigating: true })
      );
      render(<HomeContainer />);
      expect(screen.getByTestId('navigate-search-container-mock')).toBeInTheDocument();
      expect(screen.queryByTestId('search-container-mock')).not.toBeInTheDocument();
    });

    it('renders AnalysisContainer in the panel slot', () => {
      render(<HomeContainer />);
      expect(screen.getByTestId('analysis-container-mock')).toBeInTheDocument();
    });
  });

  describe('Map sizing', () => {
    it('gives the map the same flex-resizing wrapper regardless of panel state', () => {
      const { container, rerender } = render(<HomeContainer />);
      const before = getSlots(container).mapWrapper.className;

      mockUseLocationStore.mockReturnValue(makeStoreState({ selectedAddress: MOCK_ADDRESS }));
      rerender(<HomeContainer />);
      const after = getSlots(container).mapWrapper.className;

      expect(before).toBe(after);
      expect(after).toContain('flex-1');
      expect(after).toContain('min-w-0');
      expect(after).toContain('min-h-0');
    });
  });
});
