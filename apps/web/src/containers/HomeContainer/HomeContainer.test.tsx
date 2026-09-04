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
jest.mock('@/components/PanelCollapseButton/PanelCollapseButton', () => ({
  __esModule: true,
  default: ({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) => (
    <button
      data-testid="panel-collapse-button"
      data-collapsed={isCollapsed}
      onClick={onToggle}
    >
      Toggle
    </button>
  ),
}));

import { useLocationStore } from '@/store';

const mockUseLocationStore = useLocationStore as jest.MockedFunction<typeof useLocationStore>;

const MOCK_ADDRESS = { displayName: '123 Main St, Auckland', lat: -36.85, lon: 174.76 };

const makeStoreState = (overrides = {}) => ({
  selectedAddress: null,
  isNavigating: false,
  isPanelCollapsed: false,
  togglePanelCollapsed: jest.fn(),
  ...overrides,
});

// HomeContainer always renders exactly two top-level children under its
// root: the search+results panel slot, then the map slot. Within the panel
// slot, the first div with flex flex-col class is the inner content wrapper.
const getSlots = (container: HTMLElement) => {
  const root = container.firstElementChild as HTMLElement;
  const panelWrapper = root.children[0] as HTMLElement;

  // Find the inner flex div (skip the button which is a direct child of panelWrapper)
  let innerFlexDiv: HTMLElement | null = null;
  for (let i = 0; i < panelWrapper.children.length; i++) {
    const child = panelWrapper.children[i] as HTMLElement;
    // Look for a div with the flex flex-col classes - skip button elements
    if (
      child.tagName === 'DIV' &&
      child.className &&
      child.className.includes('flex') &&
      child.className.includes('flex-col')
    ) {
      innerFlexDiv = child;
      break;
    }
  }

  return {
    panelWrapper,
    searchHeader: innerFlexDiv?.children[0] as HTMLElement,
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
      expect(panelWrapper.className).toContain('h-[60vh]');
      expect(panelWrapper.className).toContain('md:w-[360px]');
    });

    it('has a right-edge border on the panel wrapper', () => {
      const { container } = render(<HomeContainer />);
      const { panelWrapper } = getSlots(container);
      expect(panelWrapper.className).toContain('border-r');
      expect(panelWrapper.className).toContain('border-slate-200');
    });

    it('puts a right-edge divider on the search header on md+, with no bottom border anywhere', () => {
      const { container } = render(<HomeContainer />);
      const { searchHeader } = getSlots(container);
      expect(searchHeader.className).toContain('border-slate-200');
      expect(searchHeader.className).toContain('md:border-r');
      expect(searchHeader.className).not.toContain('border-b');
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

  describe('Panel collapse/expand', () => {
    beforeEach(() => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ selectedAddress: MOCK_ADDRESS }));
    });

    it('renders the collapse button when a panel is active', () => {
      render(<HomeContainer />);
      expect(screen.getByTestId('panel-collapse-button')).toBeInTheDocument();
    });

    it('does not render the collapse button when no panel is active', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState());
      render(<HomeContainer />);
      expect(screen.queryByTestId('panel-collapse-button')).not.toBeInTheDocument();
    });

    it('shows the collapse button with expanded state', () => {
      render(<HomeContainer />);
      const button = screen.getByTestId('panel-collapse-button');
      expect(button).toHaveAttribute('data-collapsed', 'false');
    });

    it('shows the collapse button with collapsed state', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ selectedAddress: MOCK_ADDRESS, isPanelCollapsed: true })
      );
      render(<HomeContainer />);
      const button = screen.getByTestId('panel-collapse-button');
      expect(button).toHaveAttribute('data-collapsed', 'true');
    });

    it('hides panel when collapsed on desktop', () => {
      const togglePanelCollapsed = jest.fn();
      mockUseLocationStore.mockReturnValue(
        makeStoreState({
          selectedAddress: MOCK_ADDRESS,
          isPanelCollapsed: true,
          togglePanelCollapsed,
        })
      );
      const { container } = render(<HomeContainer />);
      const root = container.firstElementChild as HTMLElement;
      const panelWrapper = root.children[0] as HTMLElement;
      expect(panelWrapper.className).toContain('hidden');
    });

    it('shows full width panel when expanded on desktop', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ selectedAddress: MOCK_ADDRESS, isPanelCollapsed: false })
      );
      const { container } = render(<HomeContainer />);
      const { panelWrapper } = getSlots(container);
      expect(panelWrapper.className).toContain('md:w-[360px]');
    });
  });
});
