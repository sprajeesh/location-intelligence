import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollapsibleCard } from './CollapsibleCard';

describe('CollapsibleCard', () => {
  describe('Rendering', () => {
    it('renders the header and headerEnd content', () => {
      render(
        <CollapsibleCard
          isExpanded={false}
          onToggle={jest.fn()}
          header={<span>Schools</span>}
          headerEnd={<span>3</span>}
          cardLabel="Schools"
        />,
      );
      expect(screen.getByText('Schools')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('rotates the chevron when expanded', () => {
      const { container, rerender } = render(
        <CollapsibleCard isExpanded={false} onToggle={jest.fn()} header={<span>Schools</span>} cardLabel="Schools" />,
      );
      const chevron = container.querySelector('svg');
      expect(chevron).not.toHaveClass('rotate-180');

      rerender(
        <CollapsibleCard isExpanded={true} onToggle={jest.fn()} header={<span>Schools</span>} cardLabel="Schools" />,
      );
      expect(container.querySelector('svg')).toHaveClass('rotate-180');
    });
  });

  describe('Expand/collapse', () => {
    it('does not render children when collapsed', () => {
      render(
        <CollapsibleCard isExpanded={false} onToggle={jest.fn()} header={<span>Schools</span>} cardLabel="Schools">
          <div data-testid="content">details</div>
        </CollapsibleCard>,
      );
      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });

    it('renders children when expanded', () => {
      render(
        <CollapsibleCard isExpanded={true} onToggle={jest.fn()} header={<span>Schools</span>} cardLabel="Schools">
          <div data-testid="content">details</div>
        </CollapsibleCard>,
      );
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('calls onToggle when the header is clicked', async () => {
      const onToggle = jest.fn();
      render(
        <CollapsibleCard isExpanded={false} onToggle={onToggle} header={<span>Schools</span>} cardLabel="Schools" />,
      );
      await userEvent.click(screen.getByText('Schools'));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('calls onToggle when the chevron is clicked', async () => {
      const onToggle = jest.fn();
      render(
        <CollapsibleCard isExpanded={false} onToggle={onToggle} header={<span>Schools</span>} cardLabel="Schools" />,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Expand Schools' }));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('exposes aria-expanded on the header button', () => {
      render(
        <CollapsibleCard isExpanded={true} onToggle={jest.fn()} header={<span>Schools</span>} cardLabel="Schools" />,
      );
      expect(screen.getByText('Schools').closest('button')).toHaveAttribute('aria-expanded', 'true');
    });

    it('includes cardLabel in the chevron button\'s accessible name for the current expand/collapse state', () => {
      const { rerender } = render(
        <CollapsibleCard isExpanded={false} onToggle={jest.fn()} header={<span>Schools</span>} cardLabel="Schools" />,
      );
      expect(screen.getByRole('button', { name: 'Expand Schools' })).toBeInTheDocument();

      rerender(
        <CollapsibleCard isExpanded={true} onToggle={jest.fn()} header={<span>Schools</span>} cardLabel="Schools" />,
      );
      expect(screen.getByRole('button', { name: 'Collapse Schools' })).toBeInTheDocument();
    });

    it('gives a different card a distinct accessible name from another card in the same state', () => {
      render(
        <>
          <CollapsibleCard isExpanded={false} onToggle={jest.fn()} header={<span>Schools</span>} cardLabel="Schools" />
          <CollapsibleCard
            isExpanded={false}
            onToggle={jest.fn()}
            header={<span>Supermarkets</span>}
            cardLabel="Supermarkets"
          />
        </>,
      );
      expect(screen.getByRole('button', { name: 'Expand Schools' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Expand Supermarkets' })).toBeInTheDocument();
    });

    it('uses expandLabel/collapseLabel templates when provided, substituting cardLabel', () => {
      const { rerender } = render(
        <CollapsibleCard
          isExpanded={false}
          onToggle={jest.fn()}
          header={<span>Schools</span>}
          cardLabel="Kura"
          expandLabel="Whakawhānui {label}"
          collapseLabel="Kōpani {label}"
        />,
      );
      expect(screen.getByRole('button', { name: 'Whakawhānui Kura' })).toBeInTheDocument();

      rerender(
        <CollapsibleCard
          isExpanded={true}
          onToggle={jest.fn()}
          header={<span>Schools</span>}
          cardLabel="Kura"
          expandLabel="Whakawhānui {label}"
          collapseLabel="Kōpani {label}"
        />,
      );
      expect(screen.getByRole('button', { name: 'Kōpani Kura' })).toBeInTheDocument();
    });

    it('pairs aria-controls/id when contentId is given', () => {
      render(
        <CollapsibleCard
          isExpanded={true}
          onToggle={jest.fn()}
          header={<span>Schools</span>}
          cardLabel="Schools"
          contentId="category-score-schools"
        >
          <div>details</div>
        </CollapsibleCard>,
      );
      expect(screen.getByText('Schools').closest('button')).toHaveAttribute(
        'aria-controls',
        'category-score-schools',
      );
      expect(document.getElementById('category-score-schools')).toBeInTheDocument();
    });

    it('omits aria-controls when contentId is not given', () => {
      render(
        <CollapsibleCard isExpanded={false} onToggle={jest.fn()} header={<span>Schools</span>} cardLabel="Schools" />,
      );
      expect(screen.getByText('Schools').closest('button')).not.toHaveAttribute('aria-controls');
    });
  });

  describe('Actions', () => {
    it('renders only the header and chevron buttons when actions is not provided', () => {
      render(
        <CollapsibleCard isExpanded={false} onToggle={jest.fn()} header={<span>Schools</span>} cardLabel="Schools" />,
      );
      expect(screen.getAllByRole('button')).toHaveLength(2);
    });

    it('renders actions as a sibling of the header button, not nested inside it', async () => {
      const onToggle = jest.fn();
      const onAction = jest.fn();
      render(
        <CollapsibleCard
          isExpanded={false}
          onToggle={onToggle}
          header={<span>Schools</span>}
          cardLabel="Schools"
          actions={<button type="button" onClick={onAction}>Toggle</button>}
        />,
      );
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
      buttons.forEach((button) => expect(button.tagName).toBe('BUTTON'));

      await userEvent.click(screen.getByText('Toggle'));
      expect(onAction).toHaveBeenCalledTimes(1);
      expect(onToggle).not.toHaveBeenCalled();
    });
  });

  describe('Passthrough', () => {
    it('applies wrapperProps to the outer div', () => {
      render(
        <CollapsibleCard
          isExpanded={false}
          onToggle={jest.fn()}
          header={<span>Schools</span>}
          cardLabel="Schools"
          wrapperProps={{ 'data-testid': 'card-schools', 'data-status': 'scored' }}
        />,
      );
      const card = screen.getByTestId('card-schools');
      expect(card).toHaveAttribute('data-status', 'scored');
    });

    it('merges className with the base recipe', () => {
      render(
        <CollapsibleCard
          isExpanded={false}
          onToggle={jest.fn()}
          header={<span>Schools</span>}
          cardLabel="Schools"
          className="border-dashed opacity-60"
          wrapperProps={{ 'data-testid': 'card-schools' }}
        />,
      );
      const card = screen.getByTestId('card-schools');
      expect(card).toHaveClass('rounded-lg', 'border', 'border-dashed', 'opacity-60');
    });
  });
});
