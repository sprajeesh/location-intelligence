import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoutePanel, RoutePanelProps } from './RoutePanel';
import type { RouteOption, RouteTransportMode } from '@/types/api';

jest.mock('@/components/RouteModeSelector', () => ({
  __esModule: true,
  default: ({ activeMode, onModeChange }: { activeMode: RouteTransportMode; onModeChange: (m: RouteTransportMode) => void }) => (
    <button data-testid="mode-selector" onClick={() => onModeChange('walking')}>
      {activeMode}
    </button>
  ),
}));

jest.mock('@/components/RouteOptionCard', () => ({
  __esModule: true,
  default: ({
    route,
    isFastest,
    isExpanded,
    onToggle,
  }: {
    route: RouteOption;
    isFastest: boolean;
    isExpanded: boolean;
    onToggle: () => void;
  }) => (
    <div data-testid={`route-card-${route.durationS}`}>
      <button data-testid={`toggle-${route.durationS}`} onClick={onToggle}>
        toggle
      </button>
      {isFastest && <span data-testid="fastest-badge">fastest</span>}
      {isExpanded && <span data-testid="expanded-badge">expanded</span>}
    </div>
  ),
}));

const makeRoute = (durationS: number, distanceM = 1000): RouteOption => ({
  durationS,
  distanceM,
  summary: 'Test route',
  coordinates: [[-41.28, 174.77], [-41.29, 174.78]],
  steps: [],
});

const defaultProps: RoutePanelProps = {
  routes: null,
  activeMode: 'driving',
  isLoading: false,
  error: null,
  destinationName: 'Wellington Airport',
  onModeChange: jest.fn(),
};

describe('RoutePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('shows the destination name', () => {
      render(<RoutePanel {...defaultProps} />);
      expect(screen.getByText('Wellington Airport')).toBeInTheDocument();
    });

    it('renders RouteModeSelector with the active mode', () => {
      render(<RoutePanel {...defaultProps} activeMode="cycling" />);
      expect(screen.getByTestId('mode-selector')).toHaveTextContent('cycling');
    });

    it('renders one RouteOptionCard per route', () => {
      const routes = [makeRoute(300), makeRoute(500), makeRoute(700)];
      render(<RoutePanel {...defaultProps} routes={routes} />);
      expect(screen.getByTestId('route-card-300')).toBeInTheDocument();
      expect(screen.getByTestId('route-card-500')).toBeInTheDocument();
      expect(screen.getByTestId('route-card-700')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('shows "Finding route…" text while loading', () => {
      render(<RoutePanel {...defaultProps} isLoading />);
      expect(screen.getByText('Finding route…')).toBeInTheDocument();
    });

    it('does not render route cards while loading', () => {
      const routes = [makeRoute(300)];
      render(<RoutePanel {...defaultProps} routes={routes} isLoading />);
      expect(screen.queryByTestId('route-card-300')).not.toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('shows "Could not find a route." when there is an error', () => {
      render(<RoutePanel {...defaultProps} error="Network error" />);
      expect(screen.getByText('Could not find a route.')).toBeInTheDocument();
    });

    it('does not render route cards when there is an error', () => {
      const routes = [makeRoute(300)];
      render(<RoutePanel {...defaultProps} routes={routes} error="Network error" />);
      expect(screen.queryByTestId('route-card-300')).not.toBeInTheDocument();
    });
  });

  describe('Empty routes', () => {
    it('shows "No route available for this mode." when routes is an empty array', () => {
      render(<RoutePanel {...defaultProps} routes={[]} />);
      expect(screen.getByText('No route available for this mode.')).toBeInTheDocument();
    });
  });

  describe('Expansion', () => {
    it('first route card is expanded by default', () => {
      const routes = [makeRoute(300), makeRoute(500)];
      render(<RoutePanel {...defaultProps} routes={routes} />);
      const expandedBadges = screen.getAllByTestId('expanded-badge');
      expect(expandedBadges).toHaveLength(1);
      expect(screen.getByTestId('route-card-300')).toContainElement(expandedBadges[0] ?? null);
    });

    it('clicking a toggle expands a different card', async () => {
      const routes = [makeRoute(300), makeRoute(500)];
      render(<RoutePanel {...defaultProps} routes={routes} />);
      await userEvent.click(screen.getByTestId('toggle-500'));
      expect(screen.getByTestId('route-card-500')).toContainElement(
        screen.getByTestId('expanded-badge'),
      );
    });

    it('clicking the already-expanded card collapses it', async () => {
      const routes = [makeRoute(300), makeRoute(500)];
      render(<RoutePanel {...defaultProps} routes={routes} />);
      await userEvent.click(screen.getByTestId('toggle-300'));
      expect(screen.queryByTestId('expanded-badge')).not.toBeInTheDocument();
    });

    it('marks index 0 as fastest only when there are multiple routes', () => {
      const routes = [makeRoute(300), makeRoute(500)];
      render(<RoutePanel {...defaultProps} routes={routes} />);
      expect(screen.getByTestId('fastest-badge')).toBeInTheDocument();
    });

    it('does not mark any card as fastest when there is only one route', () => {
      render(<RoutePanel {...defaultProps} routes={[makeRoute(300)]} />);
      expect(screen.queryByTestId('fastest-badge')).not.toBeInTheDocument();
    });
  });

  describe('Auto-reset on prop change', () => {
    it('resets expanded index to 0 when activeMode changes', async () => {
      const routes = [makeRoute(300), makeRoute(500)];
      const { rerender } = render(<RoutePanel {...defaultProps} routes={routes} activeMode="driving" />);

      await userEvent.click(screen.getByTestId('toggle-500'));
      expect(screen.getByTestId('route-card-500')).toContainElement(
        screen.getByTestId('expanded-badge'),
      );

      rerender(<RoutePanel {...defaultProps} routes={routes} activeMode="walking" />);
      expect(screen.getByTestId('route-card-300')).toContainElement(
        screen.getByTestId('expanded-badge'),
      );
    });

    it('resets expanded index to 0 when routes change', async () => {
      const routes = [makeRoute(300), makeRoute(500)];
      const { rerender } = render(<RoutePanel {...defaultProps} routes={routes} />);

      await userEvent.click(screen.getByTestId('toggle-500'));
      expect(screen.getByTestId('route-card-500')).toContainElement(
        screen.getByTestId('expanded-badge'),
      );

      const newRoutes = [makeRoute(200), makeRoute(400)];
      rerender(<RoutePanel {...defaultProps} routes={newRoutes} />);
      expect(screen.getByTestId('route-card-200')).toContainElement(
        screen.getByTestId('expanded-badge'),
      );
    });
  });

  describe('Mode change', () => {
    it('calls onModeChange when RouteModeSelector fires', async () => {
      const onModeChange = jest.fn();
      render(<RoutePanel {...defaultProps} onModeChange={onModeChange} />);
      await userEvent.click(screen.getByTestId('mode-selector'));
      expect(onModeChange).toHaveBeenCalledWith('walking');
    });
  });
});
