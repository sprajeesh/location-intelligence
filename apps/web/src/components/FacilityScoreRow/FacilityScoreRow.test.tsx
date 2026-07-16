import { render, screen } from '@testing-library/react';
import { FacilityScoreRow } from './FacilityScoreRow';
import type { FacilityScoreResult } from '@/types/api';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
}));

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
});
