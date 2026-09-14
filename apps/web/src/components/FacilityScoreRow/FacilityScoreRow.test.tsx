import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FacilityScoreRow } from './FacilityScoreRow';
import type { Feature, FacilityScoreResult } from '@/types/api';

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

const notCheckedFacility: FacilityScoreResult = {
  facilityType: 'parks',
  status: 'not_checked',
  score: null,
  nearestDistanceKm: null,
  count: 0,
  explanation: 'Park not checked for this address.',
};

const noDataFoundFacility: FacilityScoreResult = {
  facilityType: 'hospitals',
  status: 'scored',
  score: 0,
  nearestDistanceKm: null,
  count: 0,
  explanation: 'No hospital found nearby.',
};

const scoredFacility: FacilityScoreResult = {
  facilityType: 'schools',
  status: 'scored',
  score: 28,
  nearestDistanceKm: 0.52,
  count: 4,
  explanation: '1 schools within 1.0 km by walk, plus 2 more up to 1.9 km away.',
};

describe('FacilityScoreRow', () => {
  it('renders a not_checked facility with a dashed treatment and no score', () => {
    render(<FacilityScoreRow facility={notCheckedFacility} />);
    const row = screen.getByTestId('facility-score-row-parks');
    expect(row).toHaveAttribute('data-status', 'not_checked');
    expect(row).toHaveClass('border-dashed');
    expect(screen.getByText('Not assessed')).toBeInTheDocument();
    expect(screen.getByText('Park not checked for this address.')).toBeInTheDocument();
  });

  it('renders a checked-but-nothing-found facility distinctly from not_checked', () => {
    render(<FacilityScoreRow facility={noDataFoundFacility} />);
    const row = screen.getByTestId('facility-score-row-hospitals');
    expect(row).toHaveAttribute('data-status', 'no_data_found');
    expect(row).not.toHaveClass('border-dashed');
    expect(screen.queryByText('Not assessed')).not.toBeInTheDocument();
    expect(screen.getByText('None found nearby')).toBeInTheDocument();
    expect(screen.getByText('No hospital found nearby.')).toBeInTheDocument();
  });

  it('renders a normally scored facility with the explanation verbatim', () => {
    render(<FacilityScoreRow facility={scoredFacility} />);
    const row = screen.getByTestId('facility-score-row-schools');
    expect(row).toHaveAttribute('data-status', 'scored');
    expect(row).not.toHaveClass('border-dashed');
    expect(screen.queryByText('Not assessed')).not.toBeInTheDocument();
    expect(screen.queryByText('None found nearby')).not.toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(
      screen.getByText('1 schools within 1.0 km by walk, plus 2 more up to 1.9 km away.')
    ).toBeInTheDocument();
  });

  describe('Type-level marker toggle', () => {
    const schoolFeatures: Feature[] = [
      { id: 'school-1', name: 'Auckland Primary', category: 'schools', lat: -36.85, lon: 174.76, distanceKm: 0.5 },
      { id: 'school-2', name: 'City Intermediate', category: 'schools', lat: -36.86, lon: 174.77, distanceKm: 0.9 },
    ];

    it('does not render an eye icon when there are no features', () => {
      render(<FacilityScoreRow facility={scoredFacility} onToggleTypeVisibility={jest.fn()} />);
      expect(screen.queryByRole('button', { name: /markers on map/i })).not.toBeInTheDocument();
    });

    it('does not render an eye icon when onToggleTypeVisibility is not provided', () => {
      render(<FacilityScoreRow facility={scoredFacility} features={schoolFeatures} />);
      expect(screen.queryByRole('button', { name: /markers on map/i })).not.toBeInTheDocument();
    });

    it('does not render an eye icon for a not_checked facility even with features passed', () => {
      render(
        <FacilityScoreRow
          facility={notCheckedFacility}
          features={schoolFeatures}
          onToggleTypeVisibility={jest.fn()}
        />,
      );
      expect(screen.queryByRole('button', { name: /markers on map/i })).not.toBeInTheDocument();
    });

    it('does not render an eye icon for a no-data-found facility', () => {
      render(
        <FacilityScoreRow facility={noDataFoundFacility} features={[]} onToggleTypeVisibility={jest.fn()} />,
      );
      expect(screen.queryByRole('button', { name: /markers on map/i })).not.toBeInTheDocument();
    });

    it('renders a "Show" eye icon when none of the type\'s features are visible', () => {
      render(
        <FacilityScoreRow
          facility={scoredFacility}
          features={schoolFeatures}
          visibleFacilityIds={new Set()}
          onToggleTypeVisibility={jest.fn()}
        />,
      );
      expect(screen.getByRole('button', { name: /show schools markers on map/i })).toBeInTheDocument();
    });

    it('renders a "Hide" eye icon, pressed, when every one of the type\'s features is visible', () => {
      render(
        <FacilityScoreRow
          facility={scoredFacility}
          features={schoolFeatures}
          visibleFacilityIds={new Set(['school-1', 'school-2'])}
          onToggleTypeVisibility={jest.fn()}
        />,
      );
      const button = screen.getByRole('button', { name: /hide schools markers on map/i });
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('renders a "Show" eye icon (not pressed) when only some of the type\'s features are visible', () => {
      render(
        <FacilityScoreRow
          facility={scoredFacility}
          features={schoolFeatures}
          visibleFacilityIds={new Set(['school-1'])}
          onToggleTypeVisibility={jest.fn()}
        />,
      );
      const button = screen.getByRole('button', { name: /show schools markers on map/i });
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });

    it('calls onToggleTypeVisibility with every feature id for this type and the target state', async () => {
      const onToggleTypeVisibility = jest.fn();
      render(
        <FacilityScoreRow
          facility={scoredFacility}
          features={schoolFeatures}
          visibleFacilityIds={new Set()}
          onToggleTypeVisibility={onToggleTypeVisibility}
        />,
      );
      await userEvent.click(screen.getByRole('button', { name: /show schools markers on map/i }));
      expect(onToggleTypeVisibility).toHaveBeenCalledWith(['school-1', 'school-2'], true);
    });

    it('toggles off (hides) when every feature of the type is already visible', async () => {
      const onToggleTypeVisibility = jest.fn();
      render(
        <FacilityScoreRow
          facility={scoredFacility}
          features={schoolFeatures}
          visibleFacilityIds={new Set(['school-1', 'school-2'])}
          onToggleTypeVisibility={onToggleTypeVisibility}
        />,
      );
      await userEvent.click(screen.getByRole('button', { name: /hide schools markers on map/i }));
      expect(onToggleTypeVisibility).toHaveBeenCalledWith(['school-1', 'school-2'], false);
    });
  });

  describe('Nested individual facilities', () => {
    const schoolFeatures: Feature[] = [
      { id: 'school-1', name: 'Auckland Primary', category: 'schools', lat: -36.85, lon: 174.76, distanceKm: 0.5 },
      { id: 'school-2', name: 'City Intermediate', category: 'schools', lat: -36.86, lon: 174.77, distanceKm: 0.9 },
      { id: 'school-3', name: 'Eastside College', category: 'schools', lat: -36.87, lon: 174.78, distanceKm: 1.2 },
      { id: 'school-4', name: 'Westside High', category: 'schools', lat: -36.88, lon: 174.79, distanceKm: 1.8 },
    ];

    it('does not render a nested list when no features are given', () => {
      render(<FacilityScoreRow facility={scoredFacility} />);
      expect(screen.queryByText('Auckland Primary')).not.toBeInTheDocument();
    });

    it('does not render a nested list for a not_checked facility even if features are passed', () => {
      render(<FacilityScoreRow facility={notCheckedFacility} features={schoolFeatures} />);
      expect(screen.queryByText('Auckland Primary')).not.toBeInTheDocument();
    });

    it('does not render a nested list for a no-data-found facility', () => {
      render(<FacilityScoreRow facility={noDataFoundFacility} features={[]} />);
      expect(screen.queryByText('Auckland Primary')).not.toBeInTheDocument();
    });

    it('renders up to 3 individual facilities with a "+N more" line beyond that', () => {
      render(<FacilityScoreRow facility={scoredFacility} features={schoolFeatures} />);
      expect(screen.getByText('Auckland Primary')).toBeInTheDocument();
      expect(screen.getByText('City Intermediate')).toBeInTheDocument();
      expect(screen.getByText('Eastside College')).toBeInTheDocument();
      expect(screen.queryByText('Westside High')).not.toBeInTheDocument();
      expect(screen.getByText('+1 more nearby')).toBeInTheDocument();
    });

    it('calls onToggleFacilityVisibility with the feature when its eye icon is clicked', async () => {
      const onToggleFacilityVisibility = jest.fn();
      render(
        <FacilityScoreRow
          facility={scoredFacility}
          features={schoolFeatures}
          visibleFacilityIds={new Set()}
          onToggleFacilityVisibility={onToggleFacilityVisibility}
        />,
      );
      await userEvent.click(
        screen.getByRole('button', { name: /show auckland primary marker on map/i }),
      );
      expect(onToggleFacilityVisibility).toHaveBeenCalledWith(schoolFeatures[0]);
    });

    it('reflects visibleFacilityIds per individual facility', () => {
      render(
        <FacilityScoreRow
          facility={scoredFacility}
          features={schoolFeatures}
          visibleFacilityIds={new Set(['school-1'])}
          onToggleFacilityVisibility={jest.fn()}
        />,
      );
      expect(screen.getByRole('button', { name: /hide auckland primary marker on map/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /show city intermediate marker on map/i })).toBeInTheDocument();
    });

    it('calls onFacilityClick when a facility row is clicked', async () => {
      const onFacilityClick = jest.fn();
      render(
        <FacilityScoreRow facility={scoredFacility} features={schoolFeatures} onFacilityClick={onFacilityClick} />,
      );
      await userEvent.click(screen.getByRole('button', { name: /auckland primary, 0.5 km away/i }));
      expect(onFacilityClick).toHaveBeenCalledWith(schoolFeatures[0]);
    });
  });
});
