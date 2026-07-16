import { render, screen } from '@testing-library/react';
import { CategoryScoreCard } from './CategoryScoreCard';
import type { CategoryScoreResult } from '@/types/api';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
}));

const notCheckedCategory: CategoryScoreResult = {
  category: 'recreation',
  status: 'not_checked',
  score: null,
  facilities: [
    {
      facilityType: 'parks',
      status: 'not_checked',
      score: null,
      nearestDistanceKm: null,
      count: 0,
      explanation: 'Park not checked for this address.',
    },
  ],
};

// A category that WAS assessed and scored zero (live example: transport with
// only a low-scoring bus stop found and railway_stations not_checked).
const checkedZeroCategory: CategoryScoreResult = {
  category: 'transport',
  status: 'scored',
  score: 0,
  facilities: [
    {
      facilityType: 'bus_stops',
      status: 'scored',
      score: 0,
      nearestDistanceKm: 1.63,
      count: 1,
      explanation: 'Nearest bus stop is 1.6 km away by walk.',
    },
  ],
};

describe('CategoryScoreCard', () => {
  it('renders a not_checked category with a dashed treatment, no score, and a pill', () => {
    render(
      <CategoryScoreCard category={notCheckedCategory} isExpanded={false} onToggleExpand={jest.fn()} />
    );
    const card = screen.getByTestId('category-score-card-recreation');
    expect(card).toHaveAttribute('data-status', 'not_checked');
    expect(card).toHaveClass('border-dashed');
    expect(screen.getByText('Not assessed')).toBeInTheDocument();
  });

  it('renders a checked-and-scored-zero category with the normal (non-dashed) treatment', () => {
    render(
      <CategoryScoreCard category={checkedZeroCategory} isExpanded={false} onToggleExpand={jest.fn()} />
    );
    const card = screen.getByTestId('category-score-card-transport');
    expect(card).toHaveAttribute('data-status', 'scored');
    expect(card).not.toHaveClass('border-dashed');
    expect(screen.queryByText('Not assessed')).not.toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders these two states as visually and structurally distinct', () => {
    const { unmount } = render(
      <CategoryScoreCard category={notCheckedCategory} isExpanded={false} onToggleExpand={jest.fn()} />
    );
    const notCheckedCard = screen.getByTestId('category-score-card-recreation');
    const notCheckedIsDashed = notCheckedCard.className.includes('border-dashed');
    unmount();

    render(
      <CategoryScoreCard category={checkedZeroCategory} isExpanded={false} onToggleExpand={jest.fn()} />
    );
    const scoredCard = screen.getByTestId('category-score-card-transport');
    const scoredIsDashed = scoredCard.className.includes('border-dashed');

    expect(notCheckedCard.getAttribute('data-status')).not.toBe(
      scoredCard.getAttribute('data-status')
    );
    expect(notCheckedIsDashed).toBe(true);
    expect(scoredIsDashed).toBe(false);
  });

  it('shows facility rows only when expanded', async () => {
    const { rerender } = render(
      <CategoryScoreCard category={checkedZeroCategory} isExpanded={false} onToggleExpand={jest.fn()} />
    );
    expect(screen.queryByTestId('facility-score-row-bus_stops')).not.toBeInTheDocument();

    rerender(
      <CategoryScoreCard category={checkedZeroCategory} isExpanded={true} onToggleExpand={jest.fn()} />
    );
    expect(screen.getByTestId('facility-score-row-bus_stops')).toBeInTheDocument();
  });
});
