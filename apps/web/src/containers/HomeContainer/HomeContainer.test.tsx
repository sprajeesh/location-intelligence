import { render, screen } from '@testing-library/react';
import { HomeContainer } from './HomeContainer';

jest.mock('@/store');
jest.mock('@/hooks/useAddressSearch');
jest.mock('@/hooks/useIsDesktop');
jest.mock('@/hooks/useAnalyzeCategories', () => ({ useAnalyzeCategories: () => ['schools'] }));
jest.mock('@/hooks/useAnalyzeCategoryWeights', () => ({ useAnalyzeCategoryWeights: () => ({ schools: 1 }) }));
jest.mock('@/hooks/useReportAction', () => ({
  useReportAction: () => ({
    generating: false,
    ready: false,
    disabled: true,
    onClick: jest.fn(),
  }),
}));
jest.mock('@/containers/SearchContainer', () => ({
  SearchContainer: ({ leading }: { leading?: React.ReactNode }) => (
    <div data-testid="search-container-mock">{leading}</div>
  ),
}));
jest.mock('@/containers/AnalysisContainer', () => ({
  AnalysisContainer: () => <div data-testid="analysis-container-mock" />,
}));
jest.mock('@/containers/MapContainer', () => ({
  MapContainerDynamic: () => <div data-testid="map-container-mock" />,
}));
jest.mock('@/components/MobileMenu', () => ({
  MobileMenu: () => <div data-testid="mobile-menu-mock" />,
}));
jest.mock('@/containers/SettingsContainer', () => ({
  SettingsContainer: () => <div data-testid="settings-container-mock" />,
}));
jest.mock('@/components/ReportButton', () => ({
  ReportButton: () => <button data-testid="report-button-mock">Report</button>,
}));
jest.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle-mock" />,
}));
jest.mock('next-intl', () => ({
  useTranslations: () => (_key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _key,
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
import { useAddressSearch } from '@/hooks/useAddressSearch';
import { useIsDesktop } from '@/hooks/useIsDesktop';

const mockUseLocationStore = useLocationStore as jest.MockedFunction<typeof useLocationStore>;
const mockUseAddressSearch = useAddressSearch as jest.MockedFunction<typeof useAddressSearch>;
const mockUseIsDesktop = useIsDesktop as jest.MockedFunction<typeof useIsDesktop>;

const MOCK_ADDRESS = { displayName: '123 Main St, Auckland', lat: -36.85, lon: 174.76 };

const makeStoreState = (overrides = {}) => ({
  selectedAddress: null,
  isNavigating: false,
  isPanelCollapsed: false,
  togglePanelCollapsed: jest.fn(),
  setPanelCollapsed: jest.fn(),
  sheetSnap: 'half',
  setSheetSnap: jest.fn(),
  setMapBottomInsetPx: jest.fn(),
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
    mockUseAddressSearch.mockReturnValue({
      query: '',
      setQuery: jest.fn(),
      suggestions: [],
      isLoading: false,
      error: null,
    });
    mockUseIsDesktop.mockReturnValue(true); // Default to desktop
  });

  describe('Before an address is selected', () => {
    it('keeps the search column floating over the map (pointer-events-none overlay)', () => {
      const { container } = render(<HomeContainer />);
      const { panelWrapper } = getSlots(container);
      expect(panelWrapper.className).toContain('absolute inset-0');
      expect(panelWrapper.className).toContain('pointer-events-none');
      expect(panelWrapper.className).not.toContain('border-b');
    });

    it('renders SearchContainer', () => {
      render(<HomeContainer />);
      expect(screen.getByTestId('search-container-mock')).toBeInTheDocument();
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
      expect(panelWrapper.className).toContain('h-full');
      expect(panelWrapper.className).toContain('md:w-[360px]');
    });

    it('has a right-edge border on the panel wrapper', () => {
      const { container } = render(<HomeContainer />);
      const { panelWrapper } = getSlots(container);
      expect(panelWrapper.className).toContain('border-r');
      expect(panelWrapper.className).toContain('border-slate-200');
    });

    it('puts a bottom border on mobile and right-edge divider on md+', () => {
      const { container } = render(<HomeContainer />);
      const { searchHeader } = getSlots(container);
      expect(searchHeader.className).toContain('border-slate-200');
      expect(searchHeader.className).toContain('border-b');
      expect(searchHeader.className).toContain('md:border-r');
      expect(searchHeader.className).toContain('md:border-b-0');
    });

    it('still renders SearchContainer at the top of the panel', () => {
      render(<HomeContainer />);
      expect(screen.getByTestId('search-container-mock')).toBeInTheDocument();
    });

    it('keeps rendering SearchContainer while navigating, in the same slot', () => {
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ selectedAddress: MOCK_ADDRESS, isNavigating: true })
      );
      render(<HomeContainer />);
      expect(screen.getByTestId('search-container-mock')).toBeInTheDocument();
    });

    it('renders AnalysisContainer in the panel slot', () => {
      render(<HomeContainer />);
      expect(screen.getByTestId('analysis-container-mock')).toBeInTheDocument();
    });
  });

  describe('Controls group', () => {
    it('keeps Theme/Scoring out of the mobile layout (they live in MobileMenu)', () => {
      mockUseIsDesktop.mockReturnValue(false);
      mockUseLocationStore.mockReturnValue(makeStoreState({ selectedAddress: MOCK_ADDRESS }));
      render(<HomeContainer />);
      expect(screen.queryByTestId('theme-toggle-mock')).not.toBeInTheDocument();
      expect(screen.queryByTestId('settings-container-mock')).not.toBeInTheDocument();
      expect(screen.getByTestId('report-button-mock')).toBeInTheDocument();
    });

    it('offers the mobile menu without Report before an address is selected', () => {
      mockUseIsDesktop.mockReturnValue(false);
      mockUseLocationStore.mockReturnValue(makeStoreState());
      render(<HomeContainer />);
      expect(screen.getByTestId('mobile-menu-mock')).toBeInTheDocument();
      expect(screen.queryByTestId('report-button-mock')).not.toBeInTheDocument();
      expect(screen.queryByTestId('theme-toggle-mock')).not.toBeInTheDocument();
    });

    it('floats the search and menu at the top of the map on mobile', () => {
      mockUseIsDesktop.mockReturnValue(false);
      mockUseLocationStore.mockReturnValue(makeStoreState({ selectedAddress: MOCK_ADDRESS }));
      render(<HomeContainer />);
      const search = screen.getByTestId('search-container-mock');
      const overlay = search.closest('.absolute.top-0') as HTMLElement;
      expect(overlay).toHaveClass('pointer-events-none');
      expect(overlay.querySelector('[data-testid="mobile-menu-mock"]')).not.toBeNull();
    });
  });

  describe('Mobile results sheet', () => {
    beforeEach(() => {
      mockUseIsDesktop.mockReturnValue(false);
    });

    it('keeps the map visible and mounts results once, inside the sheet', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState({ selectedAddress: MOCK_ADDRESS }));
      render(<HomeContainer />);
      expect(screen.getByTestId('map-container-mock')).toBeInTheDocument();
      expect(screen.getAllByTestId('analysis-container-mock')).toHaveLength(1);
      expect(screen.getAllByTestId('search-container-mock')).toHaveLength(1);
      const sheet = screen.getByRole('region', { name: 'Results' });
      expect(sheet).toContainElement(screen.getByTestId('analysis-container-mock'));
    });

    it('does not render the sheet before an address is selected, or on desktop', () => {
      mockUseLocationStore.mockReturnValue(makeStoreState());
      const { unmount } = render(<HomeContainer />);
      expect(screen.queryByRole('region', { name: 'Results' })).not.toBeInTheDocument();
      unmount();
      mockUseIsDesktop.mockReturnValue(true);
      mockUseLocationStore.mockReturnValue(makeStoreState({ selectedAddress: MOCK_ADDRESS }));
      render(<HomeContainer />);
      expect(screen.queryByRole('region', { name: 'Results' })).not.toBeInTheDocument();
    });

    it('hides the sheet content at peek and reports the sheet height as the map inset', () => {
      const setMapBottomInsetPx = jest.fn();
      mockUseLocationStore.mockReturnValue(
        makeStoreState({ selectedAddress: MOCK_ADDRESS, sheetSnap: 'peek', setMapBottomInsetPx }),
      );
      render(<HomeContainer />);
      expect(screen.getByTestId('analysis-container-mock').parentElement).toHaveAttribute('aria-hidden', 'true');
      expect(setMapBottomInsetPx).toHaveBeenCalledWith(104);
    });

    it('resets the map inset when leaving the mobile layout', () => {
      const setMapBottomInsetPx = jest.fn();
      mockUseIsDesktop.mockReturnValue(true);
      mockUseLocationStore.mockReturnValue(makeStoreState({ selectedAddress: MOCK_ADDRESS, setMapBottomInsetPx }));
      render(<HomeContainer />);
      expect(setMapBottomInsetPx).toHaveBeenCalledWith(0);
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
