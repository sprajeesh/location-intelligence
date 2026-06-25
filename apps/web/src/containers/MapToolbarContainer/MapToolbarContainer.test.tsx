import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MapToolbarContainer } from './MapToolbarContainer';
import { useLocationStore } from '@/store';

jest.mock('react-leaflet', () => ({
  useMap: jest.fn(),
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

    it('renders zoom in and zoom out buttons', () => {
      render(<MapToolbarContainer {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
    });

    it('renders zoom to features button', () => {
      render(<MapToolbarContainer {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Zoom to features' })).toBeInTheDocument();
    });

    it('renders current location button', () => {
      render(<MapToolbarContainer {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Current location' })).toBeInTheDocument();
    });

    it('renders the layer selector', () => {
      render(<MapToolbarContainer {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Map layers' })).toBeInTheDocument();
    });

    it('renders separators between button groups', () => {
      const { container } = render(<MapToolbarContainer {...defaultProps} />);
      const separators = container.querySelectorAll('[role="separator"]');
      expect(separators).toHaveLength(2);
    });
  });

  describe('Zoom controls', () => {
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
          score: { education: null, healthcare: null, transport: null, shopping: null, overall: null, coverage: '0/4' },
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
          score: { education: 72, healthcare: null, transport: null, shopping: null, overall: 72, coverage: '1/4' },
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
          score: { education: 72, healthcare: null, transport: 85, shopping: null, overall: 77, coverage: '2/4' },
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
          score: { education: null, healthcare: null, transport: null, shopping: null, overall: null, coverage: '0/4' },
          warnings: [],
        },
      });
      render(<MapToolbarContainer {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Zoom to features' }));
      expect(mockMap.fitBounds).not.toHaveBeenCalled();
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
          coords: { latitude: -36.85, longitude: 174.76, accuracy: 10, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
          timestamp: Date.now(),
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
