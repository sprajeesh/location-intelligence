import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScoreDisplay } from './ScoreDisplay';
import type { ScoreResult } from '@/types/api';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, opts?: { defaultValue?: string; count?: number; total?: number }) => {
    if (key === 'score.coverage' && opts) {
      return `Based on ${opts.count} of ${opts.total} categories`;
    }
    return opts?.defaultValue ?? key;
  },
}));

// Mirrors the live 9-facility-type example: all 5 categories present, a mix
// of not_checked and scored (including a checked-zero case).
const fullScore: ScoreResult = {
  overall: 21.0,
  coverage: '5/5',
  contribution: [],
  categories: [
    {
      category: 'shopping',
      status: 'scored',
      score: 6.7,
      contribution: [],
      facilities: [
        {
          facilityType: 'supermarkets',
          status: 'scored',
          score: 6.7,
          nearestDistanceKm: 1.64,
          count: 2,
          explanation: 'Nearest supermarket is 1.6 km away by walk, 1 alternative beyond 1.1 km.',
          criteria: [],
        },
      ],
    },
    {
      category: 'education',
      status: 'scored',
      score: 23.8,
      contribution: [],
      facilities: [
        {
          facilityType: 'schools',
          status: 'scored',
          score: 28.0,
          nearestDistanceKm: 0.52,
          count: 4,
          explanation: '1 schools within 1.0 km by walk, plus 2 more up to 1.9 km away.',
          criteria: [],
        },
        {
          facilityType: 'universities',
          status: 'scored',
          score: 0,
          nearestDistanceKm: null,
          count: 0,
          explanation: 'No university found nearby.',
          criteria: [],
        },
      ],
    },
    {
      category: 'healthcare',
      status: 'scored',
      score: 3.5,
      contribution: [],
      facilities: [
        {
          facilityType: 'hospitals',
          status: 'scored',
          score: 0,
          nearestDistanceKm: null,
          count: 0,
          explanation: 'No hospital found nearby.',
          criteria: [],
        },
        {
          facilityType: 'pharmacies',
          status: 'scored',
          score: 9.9,
          nearestDistanceKm: 1.44,
          count: 2,
          explanation: 'Nearest pharmacy is 1.4 km away by walk, 1 alternative beyond 1.0 km.',
          criteria: [],
        },
      ],
    },
    {
      category: 'recreation',
      status: 'scored',
      score: 17.4,
      contribution: [],
      facilities: [
        {
          facilityType: 'parks',
          status: 'not_checked',
          score: null,
          nearestDistanceKm: null,
          count: 0,
          explanation: 'Park not checked for this address.',
          criteria: [],
        },
        {
          facilityType: 'libraries',
          status: 'scored',
          score: 17.4,
          nearestDistanceKm: 1.47,
          count: 2,
          explanation: '1 libraries within 1.5 km by walk, plus 1 more up to 1.6 km away.',
          criteria: [],
        },
      ],
    },
    {
      category: 'transport',
      status: 'scored',
      score: 32.7,
      contribution: [],
      facilities: [
        {
          facilityType: 'bus_stops',
          status: 'scored',
          score: 0,
          nearestDistanceKm: 1.63,
          count: 1,
          explanation: 'Nearest bus stop is 1.6 km away by walk.',
          criteria: [],
        },
        {
          facilityType: 'railway_stations',
          status: 'scored',
          score: 59.5,
          nearestDistanceKm: 1.55,
          count: 1,
          explanation: 'Nearest railway station is 1.5 km away by drive.',
          criteria: [],
        },
      ],
    },
  ],
};

describe('ScoreDisplay', () => {
  it('renders all five categories regardless of order or status', () => {
    render(<ScoreDisplay score={fullScore} />);
    expect(screen.getByTestId('category-score-card-education')).toBeInTheDocument();
    expect(screen.getByTestId('category-score-card-transport')).toBeInTheDocument();
    expect(screen.getByTestId('category-score-card-healthcare')).toBeInTheDocument();
    expect(screen.getByTestId('category-score-card-shopping')).toBeInTheDocument();
    expect(screen.getByTestId('category-score-card-recreation')).toBeInTheDocument();
  });

  it('renders categories in the canonical display order regardless of API array order', () => {
    render(<ScoreDisplay score={fullScore} />);
    const cards = screen.getAllByTestId(/^category-score-card-/);
    const order = cards.map((c) => c.getAttribute('data-testid'));
    expect(order).toEqual([
      'category-score-card-education',
      'category-score-card-transport',
      'category-score-card-healthcare',
      'category-score-card-shopping',
      'category-score-card-recreation',
    ]);
  });

  it('renders the parsed coverage badge', () => {
    render(<ScoreDisplay score={fullScore} />);
    expect(screen.getByText('Based on 5 of 5 categories')).toBeInTheDocument();
  });

  it('renders the overall score', () => {
    render(<ScoreDisplay score={fullScore} />);
    expect(screen.getByText('21')).toBeInTheDocument();
  });

  it('renders the score ring\'s "out of 100" label', () => {
    render(<ScoreDisplay score={fullScore} />);
    expect(screen.getByText('/100')).toBeInTheDocument();
  });

  it('renders warnings when present', () => {
    render(<ScoreDisplay score={fullScore} warnings={['OSRM unavailable, used Haversine fallback']} />);
    expect(screen.getByText('OSRM unavailable, used Haversine fallback')).toBeInTheDocument();
  });

  describe('Overall score explanation ("?" icon)', () => {
    // ScoreDisplay never renders the explanation modal itself -- that's a
    // container's job (see ResultsPanel), so it can portal it to
    // document.body. This component only has to report the click.
    it('does not render a dialog itself', () => {
      render(<ScoreDisplay score={fullScore} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('calls onExplainOverall when the explain button is clicked', async () => {
      const onExplainOverall = jest.fn();
      render(<ScoreDisplay score={fullScore} onExplainOverall={onExplainOverall} />);
      await userEvent.click(screen.getByRole('button', { name: 'Explain the overall score' }));
      expect(onExplainOverall).toHaveBeenCalledTimes(1);
    });

    it('does not throw when clicked without an onExplainOverall handler', async () => {
      render(<ScoreDisplay score={fullScore} />);
      await userEvent.click(screen.getByRole('button', { name: 'Explain the overall score' }));
    });
  });
});
