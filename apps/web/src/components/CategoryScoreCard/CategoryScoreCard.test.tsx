import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryScoreCard } from './CategoryScoreCard';
import type { CategoryScoreResult, Feature } from '@/types/api';

jest.mock('next-intl', () => {
  let messages: unknown = require('@/i18n/en.json');
  const resolve = (key: string) =>
    key.split('.').reduce<unknown>((obj, segment) => (obj as Record<string, unknown> | undefined)?.[segment], messages);
  return {
    useTranslations: () => (key: string, opts?: Record<string, unknown> & { defaultValue?: string }) => {
      const template = resolve(key) ?? opts?.defaultValue ?? key;
      if (typeof template !== 'string' || !opts) return template;
      return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(opts[name] ?? ''));
    },
    // Test-only hook to switch the mocked message source, so a single test
    // can verify the /mi results flow without a full NextIntlClientProvider.
    __setMessages: (next: unknown) => {
      messages = next;
    },
  };
});

const nextIntlMock = jest.requireMock('next-intl') as { __setMessages: (messages: unknown) => void };

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

  describe('Category-level marker toggle', () => {
    const busStopFeatures: Feature[] = [
      { id: 'bus-1', name: 'Queen St Stop', category: 'bus_stops', lat: -36.84, lon: 174.77, distanceKm: 1.63 },
    ];

    it('does not render an eye icon when there are no matching features', () => {
      render(
        <CategoryScoreCard
          category={checkedZeroCategory}
          isExpanded={false}
          onToggleExpand={jest.fn()}
          onToggleCategoryVisibility={jest.fn()}
        />
      );
      expect(screen.queryByRole('button', { name: /markers on map/i })).not.toBeInTheDocument();
    });

    it('does not render an eye icon when onToggleCategoryVisibility is not provided', () => {
      render(
        <CategoryScoreCard
          category={checkedZeroCategory}
          isExpanded={false}
          onToggleExpand={jest.fn()}
          features={busStopFeatures}
        />
      );
      expect(screen.queryByRole('button', { name: /markers on map/i })).not.toBeInTheDocument();
    });

    it('does not render an eye icon for a not_checked category even with matching features', () => {
      render(
        <CategoryScoreCard
          category={notCheckedCategory}
          isExpanded={false}
          onToggleExpand={jest.fn()}
          features={[
            { id: 'park-1', name: 'Some Park', category: 'parks', lat: 0, lon: 0, distanceKm: 1 },
          ]}
          onToggleCategoryVisibility={jest.fn()}
        />
      );
      expect(screen.queryByRole('button', { name: /markers on map/i })).not.toBeInTheDocument();
    });

    it('renders a "Show" eye icon when the category has assessed facilities and none are currently visible', () => {
      render(
        <CategoryScoreCard
          category={checkedZeroCategory}
          isExpanded={false}
          onToggleExpand={jest.fn()}
          features={busStopFeatures}
          visibleFacilityIds={new Set()}
          onToggleCategoryVisibility={jest.fn()}
        />
      );
      expect(screen.getByRole('button', { name: /show transport markers on map/i })).toBeInTheDocument();
    });

    it('renders a "Hide" eye icon when every matching feature is already visible', () => {
      render(
        <CategoryScoreCard
          category={checkedZeroCategory}
          isExpanded={false}
          onToggleExpand={jest.fn()}
          features={busStopFeatures}
          visibleFacilityIds={new Set(['bus-1'])}
          onToggleCategoryVisibility={jest.fn()}
        />
      );
      const button = screen.getByRole('button', { name: /hide transport markers on map/i });
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('calls onToggleCategoryVisibility with every matching feature id and the target state', async () => {
      const onToggleCategoryVisibility = jest.fn();
      render(
        <CategoryScoreCard
          category={checkedZeroCategory}
          isExpanded={false}
          onToggleExpand={jest.fn()}
          features={busStopFeatures}
          visibleFacilityIds={new Set()}
          onToggleCategoryVisibility={onToggleCategoryVisibility}
        />
      );
      await userEvent.click(screen.getByRole('button', { name: /show transport markers on map/i }));
      expect(onToggleCategoryVisibility).toHaveBeenCalledWith(['bus-1'], true);
    });

    it('clicking the eye icon does not also trigger onToggleExpand', async () => {
      const onToggleExpand = jest.fn();
      render(
        <CategoryScoreCard
          category={checkedZeroCategory}
          isExpanded={false}
          onToggleExpand={onToggleExpand}
          features={busStopFeatures}
          visibleFacilityIds={new Set()}
          onToggleCategoryVisibility={jest.fn()}
        />
      );
      await userEvent.click(screen.getByRole('button', { name: /show transport markers on map/i }));
      expect(onToggleExpand).not.toHaveBeenCalled();
    });

    it('forwards the same handler to each nested facility-type row as its type-level toggle', async () => {
      const onToggleCategoryVisibility = jest.fn();
      render(
        <CategoryScoreCard
          category={checkedZeroCategory}
          isExpanded={true}
          onToggleExpand={jest.fn()}
          features={busStopFeatures}
          visibleFacilityIds={new Set()}
          onToggleCategoryVisibility={onToggleCategoryVisibility}
        />
      );
      await userEvent.click(screen.getByRole('button', { name: /show bus stops markers on map/i }));
      expect(onToggleCategoryVisibility).toHaveBeenCalledWith(['bus-1'], true);
    });
  });

  describe('Localized expand/collapse label', () => {
    afterEach(() => {
      nextIntlMock.__setMessages(require('@/i18n/en.json'));
    });

    it('gives the chevron button the localized expand/collapse label, including the category name', () => {
      const { rerender } = render(
        <CategoryScoreCard category={checkedZeroCategory} isExpanded={false} onToggleExpand={jest.fn()} />
      );
      expect(screen.getByRole('button', { name: 'Expand Transport' })).toBeInTheDocument();

      rerender(
        <CategoryScoreCard category={checkedZeroCategory} isExpanded={true} onToggleExpand={jest.fn()} />
      );
      expect(screen.getByRole('button', { name: 'Collapse Transport' })).toBeInTheDocument();
    });

    it('uses the mi locale label for the /mi results flow', () => {
      nextIntlMock.__setMessages(require('@/i18n/mi.json'));
      render(
        <CategoryScoreCard category={checkedZeroCategory} isExpanded={false} onToggleExpand={jest.fn()} />
      );
      expect(
        screen.getByRole('button', { name: '[MI] score.actions.expand' })
      ).toBeInTheDocument();
    });
  });
});
