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

  it('renders the "how calculated" section with contribution breakdown', () => {
    render(
      <ScoreExplainModal
        title="Education"
        score={61}
        items={[scoredWithCriteria]}
        itemNamespace="facilityTypes"
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText("How it's calculated")).toBeInTheDocument();
    expect(screen.getByTestId('explain-contribution-section')).toBeInTheDocument();
  });

  it('renders criteria in an expandable section for a scored item', async () => {
    const userEvent = await import('@testing-library/user-event').then(m => m.default.setup());
    render(
      <ScoreExplainModal
        title="Education"
        score={61}
        items={[scoredWithCriteria]}
        itemNamespace="facilityTypes"
        onClose={jest.fn()}
      />,
    );
    // Criteria should be hidden initially
    expect(screen.queryByText('2 schools within 1.0 km.')).not.toBeInTheDocument();
    // Click to expand
    const expandButton = screen.getByRole('button', { name: 'Show criteria' });
    await userEvent.click(expandButton);
    // Now criteria should be visible
    expect(screen.getByText('2 schools within 1.0 km.')).toBeInTheDocument();
    expect(screen.getByText('1 more up to 2.3 km away.')).toBeInTheDocument();
  });

  it('renders a not_checked item with an explanatory message', () => {
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

  it('renders the weight, score, and calculated contribution for a scored item', () => {
    render(
      <ScoreExplainModal
        title="Education"
        score={61}
        items={[scoredWithCriteria]}
        itemNamespace="facilityTypes"
        onClose={jest.fn()}
      />,
    );
    // Should show the calculation formula
    expect(screen.getByText(/55% weight × 61\/100 score/)).toBeInTheDocument();
    // Should show contribution bar with amount
    expect(screen.getByText('Contribution')).toBeInTheDocument();
    // Should show facility breakdown waterfall
    expect(screen.getByText('Facility Contribution Breakdown')).toBeInTheDocument();
    // Should show the calculation summary section
    expect(screen.getByText(/Calculation Summary/)).toBeInTheDocument();
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

  describe('Back navigation', () => {
    it('shows a back button when entryPoint is "overall"', () => {
      render(
        <ScoreExplainModal
          title="Education"
          score={61}
          items={[scoredWithCriteria]}
          itemNamespace="facilityTypes"
          onClose={jest.fn()}
          entryPoint="overall"
          onBack={jest.fn()}
        />,
      );
      expect(screen.getByRole('button', { name: 'Back to overall score' })).toBeInTheDocument();
    });

    it('does not show a back button when entryPoint is "facility"', () => {
      render(
        <ScoreExplainModal
          title="Education"
          score={61}
          items={[scoredWithCriteria]}
          itemNamespace="facilityTypes"
          onClose={jest.fn()}
          entryPoint="facility"
          onBack={jest.fn()}
        />,
      );
      expect(screen.queryByRole('button', { name: 'Back to overall score' })).not.toBeInTheDocument();
    });

    it('does not show a back button when entryPoint is omitted', () => {
      render(
        <ScoreExplainModal
          title="Education"
          score={61}
          items={[scoredWithCriteria]}
          itemNamespace="facilityTypes"
          onClose={jest.fn()}
        />,
      );
      expect(screen.queryByRole('button', { name: 'Back to overall score' })).not.toBeInTheDocument();
    });

    it('calls onBack when the back button is clicked', async () => {
      const onBack = jest.fn();
      render(
        <ScoreExplainModal
          title="Education"
          score={61}
          items={[scoredWithCriteria]}
          itemNamespace="facilityTypes"
          onClose={jest.fn()}
          entryPoint="overall"
          onBack={onBack}
        />,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Back to overall score' }));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('does not show a back button when onBack is omitted even if entryPoint is "overall"', () => {
      render(
        <ScoreExplainModal
          title="Education"
          score={61}
          items={[scoredWithCriteria]}
          itemNamespace="facilityTypes"
          onClose={jest.fn()}
          entryPoint="overall"
        />,
      );
      expect(screen.queryByRole('button', { name: 'Back to overall score' })).not.toBeInTheDocument();
    });
  });
});
