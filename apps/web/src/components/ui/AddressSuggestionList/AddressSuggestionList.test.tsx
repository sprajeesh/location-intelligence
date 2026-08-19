import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddressSuggestionList } from './AddressSuggestionList';

const items = [
  { key: 'a', id: 'opt-0', displayName: '1 Main St, Wellington', sublabel: '-41.290, 174.780' },
  { key: 'b', id: 'opt-1', displayName: '2 Main St, Wellington', sublabel: '-41.291, 174.781' },
];

const baseProps = {
  id: 'dropdown',
  items,
  highlightedIndex: null,
  onHighlight: jest.fn(),
  onSelect: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AddressSuggestionList', () => {
  describe('Rendering', () => {
    it('renders one option per item', () => {
      render(<AddressSuggestionList {...baseProps} />);
      expect(screen.getAllByRole('option')).toHaveLength(2);
      expect(screen.getByText('1 Main St, Wellington')).toBeInTheDocument();
      expect(screen.getByText('2 Main St, Wellington')).toBeInTheDocument();
    });

    it('renders sublabel only when provided', () => {
      render(
        <AddressSuggestionList
          {...baseProps}
          items={[{ key: 'a', id: 'opt-0', displayName: 'Just a name' }]}
        />,
      );
      expect(screen.getByText('Just a name')).toBeInTheDocument();
      expect(screen.queryByText(/-41\./)).not.toBeInTheDocument();
    });
  });

  describe('Highlighting', () => {
    it('marks only the highlighted index as aria-selected', () => {
      render(<AddressSuggestionList {...baseProps} highlightedIndex={1} />);
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'false');
      expect(options[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('calls onHighlight on mouse enter', async () => {
      const onHighlight = jest.fn();
      render(<AddressSuggestionList {...baseProps} onHighlight={onHighlight} />);
      await userEvent.hover(screen.getByText('2 Main St, Wellington'));
      expect(onHighlight).toHaveBeenCalledWith(1);
    });
  });

  describe('Selection', () => {
    it('calls onSelect with the index on click', async () => {
      const onSelect = jest.fn();
      render(<AddressSuggestionList {...baseProps} onSelect={onSelect} />);
      await userEvent.click(screen.getByText('1 Main St, Wellington'));
      expect(onSelect).toHaveBeenCalledWith(0);
    });
  });

  describe('Accent', () => {
    it('applies emerald highlight classes by default', () => {
      render(<AddressSuggestionList {...baseProps} highlightedIndex={0} />);
      expect(screen.getAllByRole('option')[0]).toHaveClass('bg-success-50');
    });

    it('applies rose highlight classes when accent=rose', () => {
      render(<AddressSuggestionList {...baseProps} highlightedIndex={0} accent="rose" />);
      expect(screen.getAllByRole('option')[0]).toHaveClass('bg-error-50');
    });
  });

  describe('Empty/loading states', () => {
    it('renders emptyState when there are no items', () => {
      render(<AddressSuggestionList {...baseProps} items={[]} emptyState={<div>No results found</div>} />);
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('renders loadingState in preference to emptyState when both are given', () => {
      render(
        <AddressSuggestionList
          {...baseProps}
          items={[]}
          emptyState={<div>No results found</div>}
          loadingState={<div>Searching…</div>}
        />,
      );
      expect(screen.getByText('Searching…')).toBeInTheDocument();
      expect(screen.queryByText('No results found')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('renders role=listbox with an optional aria-label', () => {
      render(<AddressSuggestionList {...baseProps} ariaLabel="Starting point suggestions" />);
      expect(screen.getByRole('listbox', { name: 'Starting point suggestions' })).toBeInTheDocument();
    });

    it('renders role=option per item', () => {
      render(<AddressSuggestionList {...baseProps} />);
      expect(screen.getAllByRole('option')).toHaveLength(2);
    });
  });
});
