import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MapToolbarContainer } from './MapToolbarContainer';
import { useLocationStore } from '@/store';
import * as useIsDesktopModule from '@/hooks/useIsDesktop';
import en from '@/i18n/en.json';

jest.mock('next-intl', () => ({
  useTranslations: (ns?: string) => (key: string) =>
    key.split('.').reduce<unknown>(
      (node, part) => (node as Record<string, unknown>)[part],
      ns ? (en as Record<string, unknown>)[ns] : en,
    ),
}));

jest.mock('react-leaflet', () => ({
  useMap: jest.fn(),
}));

jest.mock('@/hooks/useIsDesktop', () => ({
  useIsDesktop: jest.fn(() => true),
}));

const mockMap = {
  zoomIn: jest.fn(),
  zoomOut: jest.fn(),
  fitBounds: jest.fn(),
  flyTo: jest.fn(),
};

const { useMap } = require('react-leaflet') as { useMap: jest.Mock };
useMap.mockReturnValue(mockMap);

const defaultProps = {
  activeLayer: 'default' as const,
  onLayerChange: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  useLocationStore.setState({
    selectedAddress: null,
    analysisResult: null,
  });
});

describe('MapToolbarContainer', () => {
  describe('Rendering', () => {
    it('renders the toolbar with role=toolbar', () => {
      render(<MapToolbarContainer {...defaultProps} />);
      expect(screen.getByRole('toolbar', { name: 'Map controls' })).toBeInTheDocument();
    });

    it('renders zoom in and zoom out buttons on desktop', () => {
      jest.spyOn(useIsDesktopModule, 'useIsDesktop').mockReturnValue(true);
      render(<MapToolbarContainer {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
    });

    it('hides zoom in and zoom out buttons on mobile', () => {
      jest.spyOn(useIsDesktopModule, 'useIsDesktop').mockReturnValue(false);
      render(<MapToolbarContainer {...defaultProps} />);
      expect(screen.queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Zoom out' })).not.toBeInTheDocument();
    });

    it('renders zoom to features button', () => {
      jest.spyOn(useIsDesktopModule, 'useIsDesktop').mockReturnValue(true);
      render(<MapToolbarContainer {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Zoom to features' })).toBeInTheDocument();
    });

    it('renders current location button', () => {
      render(<MapToolbarContainer {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Current location' })).toBeInTheDocument();
    });

    it('renders the layer selector', () => {
      jest.spyOn(useIsDesktopModule, 'useIsDesktop').mockReturnValue(true);
      render(<MapToolbarContainer {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Map layers' })).toBeInTheDocument();
    });

    it('renders separators between button groups on desktop', () => {
      jest.spyOn(useIsDesktopModule, 'useIsDesktop').mockReturnValue(true);
      const { container } = render(<MapToolbarContainer {...defaultProps} />);
      const separators = container.querySelectorAll('[role="separator"]');
      expect(separators).toHaveLength(3);
    });

    it('shows only Locate and a "more" toggle on mobile until expanded', async () => {
      jest.spyOn(useIsDesktopModule, 'useIsDesktop').mockReturnValue(false);
      const { container } = render(<MapToolbarContainer {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Current location' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Zoom to features' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Map layers' })).not.toBeInTheDocument();
      expect(container.querySelectorAll('[role="separator"]')).toHaveLength(0);

      await userEvent.click(screen.getByRole('button', { name: 'More map controls' }));
      expect(screen.getByRole('button', { name: 'Zoom to features' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove all markers' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Map layers' })).toBeInTheDocument();
      expect(container.querySelectorAll('[role="separator"]')).toHaveLength(2);

      await userEvent.click(screen.getByRole('button', { name: 'Fewer map controls' }));
      expect(screen.queryByRole('button', { name: 'Zoom to features' })).not.toBeInTheDocument();
    });
  });

  describe('Zoom controls', () => {
    beforeEach(() => {
      jest.spyOn(useIsDesktopModule, 'useIsDesktop').mockReturnValue(true);
    });

    it('calls map.zoomIn when zoom in is clicked', async () => {
      const user = userEvent.setup();
      render(<MapToolbarContainer {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Zoom in' }));
      expect(mockMap.zoomIn).toHaveBeenCalledTimes(1);
    });

    it('calls map.zoomOut when zoom out is clicked', async () => {
      const user = userEvent.setup();
      render(<MapToolbarContainer {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Zoom out' }));
      expect(mockMap.zoomOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('Zoom to features', () => {
    it('is disabled when no analysis result exists', () => {
      render(<MapToolbarContainer {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Zoom to features' })).toBeDisabled();
    });

    it('is disabled when analysis result has no features', () => {
      useLocationStore.setState({
        analysisResult: {
          location: { lat: 0, lon: 0, displayName: 'Test' },
          features: [],
          score: { overall: null, coverage: '0/5', categories: [], contribution: [] },
          warnings: [],
        },
      });
      render(<MapToolbarContainer {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Zoom to features' })).toBeDisabled();
    });

    it('is enabled when analysis result has features', () => {
      useLocationStore.setState({
        analysisResult: {
          location: { lat: 0, lon: 0, displayName: 'Test' },
          features: [
            { id: '1', name: 'Feature 1', category: 'schools', lat: -36.85, lon: 174.76, distanceKm: 1.2 },
          ],
          score: { overall: 72, coverage: '1/5', categories: [], contribution: [] },
          warnings: [],
        },
      });
      render(<MapToolbarContainer {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Zoom to features' })).toBeEnabled();
    });

    it('calls fitBounds with features and address when clicked', async () => {
      const user = userEvent.setup();
      useLocationStore.setState({
        selectedAddress: { displayName: 'Test Address', lat: -36.848, lon: 174.763 },
        analysisResult: {
          location: { lat: -36.848, lon: 174.763, displayName: 'Test' },
          features: [
            { id: '1', name: 'Feature 1', category: 'schools', lat: -36.85, lon: 174.76, distanceKm: 1.2 },
            { id: '2', name: 'Feature 2', category: 'bus_stops', lat: -36.86, lon: 174.77, distanceKm: 2.0 },
          ],
          score: { overall: 77, coverage: '2/5', categories: [], contribution: [] },
          warnings: [],
        },
      });
      render(<MapToolbarContainer {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Zoom to features' }));
      expect(mockMap.fitBounds).toHaveBeenCalledWith(
        expect.any(Object),
        { padding: [50, 50] },
      );
    });

    it('does not call fitBounds when features are empty', async () => {
      const user = userEvent.setup();
      useLocationStore.setState({
        analysisResult: {
          location: { lat: 0, lon: 0, displayName: 'Test' },
          features: [],
          score: { overall: null, coverage: '0/5', categories: [], contribution: [] },
          warnings: [],
        },
      });
      render(<MapToolbarContainer {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Zoom to features' }));
      expect(mockMap.fitBounds).not.toHaveBeenCalled();
    });
  });

  describe('Report a missing place', () => {
    it('is shown', () => {
      render(<MapToolbarContainer {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Report a missing place' })).toBeInTheDocument();
    });

    it('starts placement mode when clicked', async () => {
      render(<MapToolbarContainer {...defaultProps} />);
      await userEvent.click(screen.getByRole('button', { name: 'Report a missing place' }));
      expect(useLocationStore.getState().correctionMode).toBe('placing');
    });
  });

  describe('Remove all markers', () => {
    const facility = { id: '1', name: 'Feature 1', category: 'schools', lat: -36.85, lon: 174.76, distanceKm: 1.2 };

    beforeEach(() => {
      useLocationStore.setState({
        visibleFacilityIds: new Set(),
        activeRoute: null,
        selectedFeature: null,
        isNavigating: false,
        navigateFrom: null,
        navigateTo: null,
      });
    });

    it('is disabled when no markers are visible', () => {
      render(<MapToolbarContainer {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Remove all markers' })).toBeDisabled();
    });

    it('is enabled when at least one marker is visible', () => {
      useLocationStore.setState({ visibleFacilityIds: new Set(['1']) });
      render(<MapToolbarContainer {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Remove all markers' })).toBeEnabled();
    });

    it('hides all markers, keeps analysis data and the searched address when clicked', async () => {
      const user = userEvent.setup();
      const selectedAddress = { displayName: 'Test Address', lat: -36.848, lon: 174.763 };
      useLocationStore.setState({
        selectedAddress,
        analysisResult: {
          location: { lat: -36.848, lon: 174.763, displayName: 'Test' },
          features: [facility],
          score: { overall: 72, coverage: '1/5', categories: [], contribution: [] },
          warnings: [],
        },
        visibleFacilityIds: new Set(['1']),
      });
      render(<MapToolbarContainer {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Remove all markers' }));

      const state = useLocationStore.getState();
      expect(state.visibleFacilityIds.size).toBe(0);
      expect(state.analysisResult?.features).toHaveLength(1);
      expect(state.selectedAddress).toEqual(selectedAddress);
    });

    it('clears the active route and open feature popup and exits navigation', async () => {
      const user = userEvent.setup();
      useLocationStore.setState({
        visibleFacilityIds: new Set(['1']),
        activeRoute: [[-36.848, 174.763], [-36.85, 174.76]],
        selectedFeature: facility,
        isNavigating: true,
        navigateFrom: { displayName: 'From', lat: -36.848, lon: 174.763 },
        navigateTo: { displayName: 'To', lat: -36.85, lon: 174.76 },
      });
      render(<MapToolbarContainer {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Remove all markers' }));

      const state = useLocationStore.getState();
      expect(state.activeRoute).toBeNull();
      expect(state.selectedFeature).toBeNull();
      expect(state.isNavigating).toBe(false);
      expect(state.navigateFrom).toBeNull();
      expect(state.navigateTo).toBeNull();
    });

    it('sits directly after Zoom to features', () => {
      render(<MapToolbarContainer {...defaultProps} />);
      const zoom = screen.getByRole('button', { name: 'Zoom to features' });
      const remove = screen.getByRole('button', { name: 'Remove all markers' });
      expect(zoom.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(remove.nextElementSibling).toBe(
        screen.getByRole('button', { name: 'Current location' }),
      );
    });
  });

  describe('Current location', () => {
    it('calls geolocation.getCurrentPosition when clicked', async () => {
      const user = userEvent.setup();
      const mockGetCurrentPosition = jest.fn();
      Object.defineProperty(navigator, 'geolocation', {
        value: { getCurrentPosition: mockGetCurrentPosition },
        writable: true,
      });
      render(<MapToolbarContainer {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Current location' }));
      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);
    });

    it('flies to the obtained position', async () => {
      const user = userEvent.setup();
      let successCallback: (position: GeolocationPosition) => void;
      const mockGetCurrentPosition = jest.fn((success) => {
        successCallback = success;
      });
      Object.defineProperty(navigator, 'geolocation', {
        value: { getCurrentPosition: mockGetCurrentPosition },
        writable: true,
      });
      render(<MapToolbarContainer {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Current location' }));

      act(() => {
        successCallback!({
          coords: {
            latitude: -36.85,
            longitude: 174.76,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON() {
              return this;
            },
          },
          timestamp: Date.now(),
          toJSON() {
            return this;
          },
        });
      });

      expect(mockMap.flyTo).toHaveBeenCalledWith([-36.85, 174.76], 15, { duration: 1.5 });
    });

    it('disables the button while locating', async () => {
      const user = userEvent.setup();
      const mockGetCurrentPosition = jest.fn(() => {});
      Object.defineProperty(navigator, 'geolocation', {
        value: { getCurrentPosition: mockGetCurrentPosition },
        writable: true,
      });
      render(<MapToolbarContainer {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Current location' }));
      expect(screen.getByRole('button', { name: 'Locating...' })).toBeDisabled();
    });

    it('does nothing when geolocation is not available', async () => {
      const user = userEvent.setup();
      Object.defineProperty(navigator, 'geolocation', {
        value: undefined,
        writable: true,
      });
      render(<MapToolbarContainer {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Current location' }));
      expect(mockMap.flyTo).not.toHaveBeenCalled();
    });
  });

  describe('Layer selector integration', () => {
    it('calls onLayerChange when a layer is selected', async () => {
      const user = userEvent.setup();
      const onLayerChange = jest.fn();
      render(<MapToolbarContainer {...defaultProps} onLayerChange={onLayerChange} />);
      await user.click(screen.getByRole('button', { name: 'Map layers' }));
      await user.click(screen.getByRole('menuitem', { name: /Satellite/ }));
      expect(onLayerChange).toHaveBeenCalledWith('satellite');
    });
  });

  describe('Event propagation', () => {
    it('stops propagation on mousedown', () => {
      render(<MapToolbarContainer {...defaultProps} />);
      const toolbar = screen.getByRole('toolbar');
      const event = new MouseEvent('mousedown', { bubbles: true });
      jest.spyOn(event, 'stopPropagation');
      toolbar.dispatchEvent(event);
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('stops propagation on touchstart', () => {
      render(<MapToolbarContainer {...defaultProps} />);
      const toolbar = screen.getByRole('toolbar');
      const event = new Event('touchstart', { bubbles: true });
      jest.spyOn(event, 'stopPropagation');
      toolbar.dispatchEvent(event);
      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });
});
