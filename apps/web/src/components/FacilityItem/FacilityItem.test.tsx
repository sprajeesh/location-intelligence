import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FacilityItem from './FacilityItem';
import type { Feature } from '@/types/api';

jest.mock('next-intl', () => {
  const messages = require('@/i18n/en.json');
  const resolve = (key: string) =>
    key.split('.').reduce<unknown>((obj, segment) => (obj as Record<string, unknown> | undefined)?.[segment], messages);
  return {
    useTranslations: () => (key: string, opts?: Record<string, unknown> & { defaultValue?: string }) => {
      const template = resolve(key) ?? opts?.defaultValue ?? key;
      if (typeof template !== 'string' || !opts) return template;
      return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(opts[name] ?? ''));
    },
  };
});

const feature: Feature = {
  id: 'osm_node_1',
  name: 'Wellington East School',
  category: 'schools',
  lat: -41.28,
  lon: 174.78,
  distanceKm: 1.234,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('FacilityItem', () => {
  describe('Rendering', () => {
    it('renders the facility name and formatted distance', () => {
      render(<FacilityItem feature={feature} markerColor="#10B981" />);
      expect(screen.getByText('Wellington East School')).toBeInTheDocument();
      expect(screen.getByText('1.2 km')).toBeInTheDocument();
    });

    it('does not render a navigate button when onNavigate is not provided', () => {
      render(<FacilityItem feature={feature} markerColor="#10B981" />);
      expect(screen.queryByRole('button', { name: /navigate to/i })).not.toBeInTheDocument();
    });

    it('renders a navigate button when onNavigate is provided', () => {
      render(<FacilityItem feature={feature} markerColor="#10B981" onNavigate={jest.fn()} />);
      expect(screen.getByRole('button', { name: /navigate to wellington east school/i })).toBeInTheDocument();
    });
  });

  describe('Click handling', () => {
    it('calls onClick when the main row is clicked', async () => {
      const onClick = jest.fn();
      render(<FacilityItem feature={feature} markerColor="#10B981" onClick={onClick} />);
      await userEvent.click(screen.getByRole('button', { name: /wellington east school, 1.2 km away/i }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onNavigate with the feature when the navigate button is clicked, without also firing onClick', async () => {
      const onClick = jest.fn();
      const onNavigate = jest.fn();
      render(
        <FacilityItem feature={feature} markerColor="#10B981" onClick={onClick} onNavigate={onNavigate} />,
      );
      await userEvent.click(screen.getByRole('button', { name: /navigate to wellington east school/i }));
      expect(onNavigate).toHaveBeenCalledWith(feature);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Visibility toggle', () => {
    it('does not render an eye icon when onToggleVisibility is not provided', () => {
      render(<FacilityItem feature={feature} markerColor="#10B981" isVisible={true} />);
      expect(screen.queryByRole('button', { name: /marker/i })).not.toBeInTheDocument();
    });

    it('does not render an eye icon when isVisible is not provided', () => {
      render(<FacilityItem feature={feature} markerColor="#10B981" onToggleVisibility={jest.fn()} />);
      expect(screen.queryByRole('button', { name: /marker/i })).not.toBeInTheDocument();
    });

    it('renders an eye icon when onToggleVisibility is provided', () => {
      render(
        <FacilityItem feature={feature} markerColor="#10B981" isVisible={false} onToggleVisibility={jest.fn()} />,
      );
      expect(screen.getByRole('button', { name: /show wellington east school marker on map/i })).toBeInTheDocument();
    });

    it('shows "Hide" label when visible', () => {
      render(
        <FacilityItem feature={feature} markerColor="#10B981" isVisible={true} onToggleVisibility={jest.fn()} />,
      );
      expect(screen.getByRole('button', { name: /hide wellington east school marker on map/i })).toBeInTheDocument();
    });

    it('calls onToggleVisibility when the eye icon is clicked, without also firing onClick', async () => {
      const onClick = jest.fn();
      const onToggleVisibility = jest.fn();
      render(
        <FacilityItem
          feature={feature}
          markerColor="#10B981"
          isVisible={false}
          onClick={onClick}
          onToggleVisibility={onToggleVisibility}
        />,
      );
      await userEvent.click(screen.getByRole('button', { name: /show wellington east school marker on map/i }));
      expect(onToggleVisibility).toHaveBeenCalledTimes(1);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('exposes aria-pressed reflecting isVisible', () => {
      render(
        <FacilityItem feature={feature} markerColor="#10B981" isVisible={true} onToggleVisibility={jest.fn()} />,
      );
      expect(
        screen.getByRole('button', { name: /hide wellington east school marker on map/i }),
      ).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Accessibility', () => {
    it('gives the main row an accessible name with name and distance', () => {
      render(<FacilityItem feature={feature} markerColor="#10B981" />);
      expect(screen.getByLabelText('Wellington East School, 1.2 km away')).toBeInTheDocument();
    });

    it('does not expose the main row as a button when onClick is not provided', () => {
      render(<FacilityItem feature={feature} markerColor="#10B981" />);
      expect(screen.queryByRole('button', { name: /wellington east school, 1.2 km away/i })).not.toBeInTheDocument();
    });

    it('exposes the main row as a button with the same accessible name when onClick is provided', () => {
      render(<FacilityItem feature={feature} markerColor="#10B981" onClick={jest.fn()} />);
      expect(screen.getByRole('button', { name: 'Wellington East School, 1.2 km away' })).toBeInTheDocument();
    });

    it('gives the navigate button both an aria-label and a title', () => {
      render(<FacilityItem feature={feature} markerColor="#10B981" onNavigate={jest.fn()} />);
      const navButton = screen.getByRole('button', { name: /navigate to wellington east school/i });
      expect(navButton).toHaveAttribute('title', 'Show route to Wellington East School');
    });
  });
});
