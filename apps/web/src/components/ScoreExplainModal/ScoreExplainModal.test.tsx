import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScoreExplainModal } from './ScoreExplainModal';
import type { ExplainItem } from '@/utils/scoreDisplay';

jest.mock('next-intl', () => {
  const messages = require('@/i18n/en.json');
  const resolve = (key: string) =>
    key
      .split('.')
      .reduce<unknown>((obj, segment) => (obj as Record<string, unknown> | undefined)?.[segment], messages);
  return {
    useTranslations: () => (key: string, opts?: Record<string, unknown> & { defaultValue?: string }) => {
      const template = resolve(key) ?? opts?.defaultValue ?? key;
      if (typeof template !== 'string' || !opts) return template;
      return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(opts[name] ?? ''));
    },
  };
});

const scoredWithCriteria: ExplainItem = {
  key: 'schools',
  kind: 'facility',
  status: 'scored',
  score: 61,
  weightPct: 55,
  criteria: [
    { label: 'Schools within 1.0 km', satisfied: true, detail: '2 schools within 1.0 km.' },
    { label: 'Additional schools within 3.0 km', satisfied: true, detail: '1 more up to 2.3 km away.' },
  ],
};

const notCheckedItem: ExplainItem = {
  key: 'universities',
  kind: 'facility',
  status: 'not_checked',
  score: null,
  weightPct: 0,
  criteria: [],
};

const categoryRollupItem: ExplainItem = {
  key: 'education',
  kind: 'category',
  status: 'scored',
  score: 61,
  weightPct: 40,
  criteria: [],
};

describe('ScoreExplainModal', () => {
  it('renders as a dialog with the given title and score', () => {
    render(
      <ScoreExplainModal
        title="Education"
        score={61}
        items={[scoredWithCriteria]}
        itemNamespace="facilityTypes"
        onClose={jest.fn()}
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getAllByText('Education').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('61').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('/100')).toBeInTheDocument();
    expect(screen.getByText('Average')).toBeInTheDocument();
  });

  it('renders "Not assessed" instead of a score when the score is null', () => {
    render(
      <ScoreExplainModal
        title="Recreation"
        score={null}
        items={[notCheckedItem]}
        itemNamespace="facilityTypes"
        onClose={jest.fn()}
      />,
    );
    expect(screen.getAllByText('Not assessed').length).toBeGreaterThan(0);
  });

  it('renders both the "why" and "how calculated" sections', () => {
    render(
      <ScoreExplainModal
        title="Education"
        score={61}
        items={[scoredWithCriteria]}
        itemNamespace="facilityTypes"
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Why this score')).toBeInTheDocument();
    expect(screen.getByText("How it's calculated")).toBeInTheDocument();
  });

  it('renders each criterion detail for a scored item with criteria', () => {
    render(
      <ScoreExplainModal
        title="Education"
        score={61}
        items={[scoredWithCriteria]}
        itemNamespace="facilityTypes"
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('2 schools within 1.0 km.')).toBeInTheDocument();
    expect(screen.getByText('1 more up to 2.3 km away.')).toBeInTheDocument();
  });

  it('renders a not_checked item as an explanatory line, not a score', () => {
    render(
      <ScoreExplainModal
        title="Education"
        score={61}
        items={[notCheckedItem]}
        itemNamespace="facilityTypes"
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Universities: not checked for this address.')).toBeInTheDocument();
  });

  it('renders a category-level rollup item (no criteria) as a label/score row', () => {
    render(
      <ScoreExplainModal
        title="Location Score"
        score={61}
        items={[categoryRollupItem]}
        itemNamespace="categories"
        onClose={jest.fn()}
      />,
    );
    expect(screen.getAllByText('Education').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('61').length).toBeGreaterThanOrEqual(2);
  });

  it('renders the weight and score contribution line for a scored item', () => {
    render(
      <ScoreExplainModal
        title="Education"
        score={61}
        items={[scoredWithCriteria]}
        itemNamespace="facilityTypes"
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('55% weight · scored 61/100')).toBeInTheDocument();
  });

  it('renders "Not assessed" in the contribution row for a not_checked item', () => {
    render(
      <ScoreExplainModal
        title="Education"
        score={61}
        items={[notCheckedItem]}
        itemNamespace="facilityTypes"
        onClose={jest.fn()}
      />,
    );
    expect(screen.getAllByText('Not assessed').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = jest.fn();
    render(
      <ScoreExplainModal
        title="Education"
        score={61}
        items={[scoredWithCriteria]}
        itemNamespace="facilityTypes"
        onClose={onClose}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = jest.fn();
    render(
      <ScoreExplainModal
        title="Education"
        score={61}
        items={[scoredWithCriteria]}
        itemNamespace="facilityTypes"
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('Drill-down (category rows only)', () => {
    it('renders a scored category row as a button and calls onSelectItem with its key when clicked', async () => {
      const onSelectItem = jest.fn();
      render(
        <ScoreExplainModal
          title="Location Score"
          score={61}
          items={[categoryRollupItem]}
          itemNamespace="categories"
          onClose={jest.fn()}
          onSelectItem={onSelectItem}
        />,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Explain the Education score' }));
      expect(onSelectItem).toHaveBeenCalledWith('education');
    });

    it('does not render a category row as a button when onSelectItem is omitted', () => {
      render(
        <ScoreExplainModal
          title="Location Score"
          score={61}
          items={[categoryRollupItem]}
          itemNamespace="categories"
          onClose={jest.fn()}
        />,
      );
      expect(screen.queryByRole('button', { name: 'Explain the Education score' })).not.toBeInTheDocument();
    });

    it('never renders a facility row as a button, even when onSelectItem is provided', () => {
      render(
        <ScoreExplainModal
          title="Education"
          score={61}
          items={[scoredWithCriteria]}
          itemNamespace="facilityTypes"
          onClose={jest.fn()}
          onSelectItem={jest.fn()}
        />,
      );
      expect(screen.queryByRole('button', { name: /^Explain the .* score$/ })).not.toBeInTheDocument();
    });

    it('never renders a not-checked row as a button, even when onSelectItem is provided', () => {
      const notCheckedCategory: ExplainItem = { ...categoryRollupItem, status: 'not_checked', score: null };
      render(
        <ScoreExplainModal
          title="Location Score"
          score={null}
          items={[notCheckedCategory]}
          itemNamespace="categories"
          onClose={jest.fn()}
          onSelectItem={jest.fn()}
        />,
      );
      expect(screen.queryByRole('button', { name: /^Explain the .* score$/ })).not.toBeInTheDocument();
    });
  });

  describe('Weight donut', () => {
    it('renders a weight donut when 2 or more items are scored', () => {
      const secondCategory: ExplainItem = { ...categoryRollupItem, key: 'transport', score: 85, weightPct: 25 };
      render(
        <ScoreExplainModal
          title="Location Score"
          score={70}
          items={[categoryRollupItem, secondCategory]}
          itemNamespace="categories"
          onClose={jest.fn()}
        />,
      );
      expect(screen.getByTestId('weight-donut')).toBeInTheDocument();
    });

    it('omits the weight donut when fewer than 2 items are scored', () => {
      render(
        <ScoreExplainModal
          title="Education"
          score={61}
          items={[scoredWithCriteria, notCheckedItem]}
          itemNamespace="facilityTypes"
          onClose={jest.fn()}
        />,
      );
      expect(screen.queryByTestId('weight-donut')).not.toBeInTheDocument();
    });
  });
});
