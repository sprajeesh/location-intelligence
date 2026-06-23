import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavigateSearchBar, NavigateSearchBarProps } from './NavigateSearchBar';
import type { AddressResult } from '@/types/api';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const MOCK_ADDRESS_A: AddressResult = {
  displayName: '10 Willis Street, Wellington',
  lat: -41.285,
  lon: 174.776,
};
const MOCK_ADDRESS_B: AddressResult = {
  displayName: '123 Lambton Quay, Wellington',
  lat: -41.279,
  lon: 174.777,
};

const defaultProps: NavigateSearchBarProps = {
  fromQuery: '',
  fromSuggestions: [],
  fromIsLoading: false,
  onFromQueryChange: jest.fn(),
  onFromSelect: jest.fn(),
  toQuery: '',
  toSuggestions: [],
  toIsLoading: false,
  onToQueryChange: jest.fn(),
  onToSelect: jest.fn(),
  onBack: jest.fn(),
};

describe('NavigateSearchBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the from input', () => {
      render(<NavigateSearchBar {...defaultProps} />);
      expect(screen.getByLabelText('from')).toBeInTheDocument();
    });

    it('renders the to input', () => {
      render(<NavigateSearchBar {...defaultProps} />);
      expect(screen.getByLabelText('to')).toBeInTheDocument();
    });

    it('renders the back button', () => {
      render(<NavigateSearchBar {...defaultProps} />);
      expect(screen.getByLabelText('back')).toBeInTheDocument();
    });

    it('shows from loading spinner when fromIsLoading is true', () => {
      render(<NavigateSearchBar {...defaultProps} fromQuery="test" fromIsLoading />);
      const spinners = document.querySelectorAll('.animate-spin');
      expect(spinners.length).toBeGreaterThan(0);
    });

    it('shows to loading spinner when toIsLoading is true', () => {
      render(<NavigateSearchBar {...defaultProps} toQuery="test" toIsLoading />);
      const spinners = document.querySelectorAll('.animate-spin');
      expect(spinners.length).toBeGreaterThan(0);
    });

    it('shows from clear button when fromQuery is non-empty and not loading', () => {
      render(<NavigateSearchBar {...defaultProps} fromQuery="test" fromIsLoading={false} />);
      expect(screen.getByLabelText('Clear starting point')).toBeInTheDocument();
    });

    it('does not show from clear button when fromIsLoading is true', () => {
      render(<NavigateSearchBar {...defaultProps} fromQuery="test" fromIsLoading />);
      expect(screen.queryByLabelText('Clear starting point')).not.toBeInTheDocument();
    });

    it('does not show from clear button when fromQuery is empty', () => {
      render(<NavigateSearchBar {...defaultProps} fromQuery="" />);
      expect(screen.queryByLabelText('Clear starting point')).not.toBeInTheDocument();
    });

    it('shows to clear button when toQuery is non-empty and not loading', () => {
      render(<NavigateSearchBar {...defaultProps} toQuery="test" toIsLoading={false} />);
      expect(screen.getByLabelText('Clear destination')).toBeInTheDocument();
    });

    it('does not show to clear button when toIsLoading is true', () => {
      render(<NavigateSearchBar {...defaultProps} toQuery="test" toIsLoading />);
      expect(screen.queryByLabelText('Clear destination')).not.toBeInTheDocument();
    });
  });

  describe('Back button', () => {
    it('calls onBack when clicked', async () => {
      const onBack = jest.fn();
      render(<NavigateSearchBar {...defaultProps} onBack={onBack} />);
      await userEvent.click(screen.getByLabelText('back'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('From field', () => {
    it('calls onFromQueryChange when user types', () => {
      const onFromQueryChange = jest.fn();
      render(<NavigateSearchBar {...defaultProps} onFromQueryChange={onFromQueryChange} />);
      fireEvent.change(screen.getByLabelText('from'), { target: { value: 'Willis' } });
      expect(onFromQueryChange).toHaveBeenCalledWith('Willis');
    });

    it('does not show from dropdown before the field is focused', () => {
      render(
        <NavigateSearchBar
          {...defaultProps}
          fromQuery="Willis"
          fromSuggestions={[MOCK_ADDRESS_A]}
        />,
      );
      expect(screen.queryByRole('listbox', { name: 'Starting point suggestions' })).not.toBeInTheDocument();
    });

    it('shows from dropdown after focusing with a non-empty query and suggestions', () => {
      render(
        <NavigateSearchBar
          {...defaultProps}
          fromQuery="Willis"
          fromSuggestions={[MOCK_ADDRESS_A]}
        />,
      );
      fireEvent.focus(screen.getByLabelText('from'));
      expect(screen.getByRole('listbox', { name: 'Starting point suggestions' })).toBeInTheDocument();
    });

    it('shows "Searching…" when from field is focused, query is set, and isLoading with no suggestions', () => {
      render(
        <NavigateSearchBar
          {...defaultProps}
          fromQuery="Willis"
          fromSuggestions={[]}
          fromIsLoading
        />,
      );
      fireEvent.focus(screen.getByLabelText('from'));
      expect(screen.getByText('Searching…')).toBeInTheDocument();
    });

    it('clicking a from suggestion calls onFromSelect', async () => {
      const onFromSelect = jest.fn();
      render(
        <NavigateSearchBar
          {...defaultProps}
          fromQuery="Willis"
          fromSuggestions={[MOCK_ADDRESS_A]}
          onFromSelect={onFromSelect}
        />,
      );
      fireEvent.focus(screen.getByLabelText('from'));
      await userEvent.click(screen.getByText(MOCK_ADDRESS_A.displayName));
      expect(onFromSelect).toHaveBeenCalledWith(MOCK_ADDRESS_A);
    });

    it('hides from dropdown after selecting a suggestion', async () => {
      render(
        <NavigateSearchBar
          {...defaultProps}
          fromQuery="Willis"
          fromSuggestions={[MOCK_ADDRESS_A]}
        />,
      );
      fireEvent.focus(screen.getByLabelText('from'));
      await userEvent.click(screen.getByText(MOCK_ADDRESS_A.displayName));
      expect(screen.queryByRole('listbox', { name: 'Starting point suggestions' })).not.toBeInTheDocument();
    });

    it('from clear button calls onFromQueryChange with empty string', async () => {
      const onFromQueryChange = jest.fn();
      render(
        <NavigateSearchBar
          {...defaultProps}
          fromQuery="Willis"
          fromIsLoading={false}
          onFromQueryChange={onFromQueryChange}
        />,
      );
      await userEvent.click(screen.getByLabelText('Clear starting point'));
      expect(onFromQueryChange).toHaveBeenCalledWith('');
    });
  });

  describe('To field', () => {
    it('calls onToQueryChange when user types', () => {
      const onToQueryChange = jest.fn();
      render(<NavigateSearchBar {...defaultProps} onToQueryChange={onToQueryChange} />);
      fireEvent.change(screen.getByLabelText('to'), { target: { value: 'Lambton' } });
      expect(onToQueryChange).toHaveBeenCalledWith('Lambton');
    });

    it('does not show to dropdown before the field is focused', () => {
      render(
        <NavigateSearchBar
          {...defaultProps}
          toQuery="Lambton"
          toSuggestions={[MOCK_ADDRESS_B]}
        />,
      );
      expect(screen.queryByRole('listbox', { name: 'Destination suggestions' })).not.toBeInTheDocument();
    });

    it('shows to dropdown after focusing with a non-empty query and suggestions', () => {
      render(
        <NavigateSearchBar
          {...defaultProps}
          toQuery="Lambton"
          toSuggestions={[MOCK_ADDRESS_B]}
        />,
      );
      fireEvent.focus(screen.getByLabelText('to'));
      expect(screen.getByRole('listbox', { name: 'Destination suggestions' })).toBeInTheDocument();
    });

    it('clicking a to suggestion calls onToSelect', async () => {
      const onToSelect = jest.fn();
      render(
        <NavigateSearchBar
          {...defaultProps}
          toQuery="Lambton"
          toSuggestions={[MOCK_ADDRESS_B]}
          onToSelect={onToSelect}
        />,
      );
      fireEvent.focus(screen.getByLabelText('to'));
      await userEvent.click(screen.getByText(MOCK_ADDRESS_B.displayName));
      expect(onToSelect).toHaveBeenCalledWith(MOCK_ADDRESS_B);
    });

    it('to clear button calls onToQueryChange with empty string', async () => {
      const onToQueryChange = jest.fn();
      render(
        <NavigateSearchBar
          {...defaultProps}
          toQuery="Lambton"
          toIsLoading={false}
          onToQueryChange={onToQueryChange}
        />,
      );
      await userEvent.click(screen.getByLabelText('Clear destination'));
      expect(onToQueryChange).toHaveBeenCalledWith('');
    });
  });

  describe('Keyboard navigation — From field', () => {
    function renderWithFromDropdown(onFromSelect = jest.fn()) {
      render(
        <NavigateSearchBar
          {...defaultProps}
          fromQuery="Willis"
          fromSuggestions={[MOCK_ADDRESS_A, MOCK_ADDRESS_B]}
          onFromSelect={onFromSelect}
        />,
      );
      const input = screen.getByLabelText('from');
      fireEvent.focus(input);
      return input;
    }

    it('ArrowDown highlights the first suggestion', () => {
      const input = renderWithFromDropdown();
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(input).toHaveAttribute('aria-activedescendant', 'from-option-0');
    });

    it('ArrowDown advances the highlight', () => {
      const input = renderWithFromDropdown();
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(input).toHaveAttribute('aria-activedescendant', 'from-option-1');
    });

    it('ArrowUp from null wraps to the last suggestion', () => {
      const input = renderWithFromDropdown();
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      expect(input).toHaveAttribute('aria-activedescendant', 'from-option-1');
    });

    it('Enter selects the highlighted suggestion and calls onFromSelect', () => {
      const onFromSelect = jest.fn();
      const input = renderWithFromDropdown(onFromSelect);
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onFromSelect).toHaveBeenCalledWith(MOCK_ADDRESS_A);
    });

    it('Escape closes the from dropdown', () => {
      const input = renderWithFromDropdown();
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(screen.queryByRole('listbox', { name: 'Starting point suggestions' })).not.toBeInTheDocument();
    });
  });

  describe('Keyboard navigation — To field', () => {
    function renderWithToDropdown(onToSelect = jest.fn()) {
      render(
        <NavigateSearchBar
          {...defaultProps}
          toQuery="Lambton"
          toSuggestions={[MOCK_ADDRESS_A, MOCK_ADDRESS_B]}
          onToSelect={onToSelect}
        />,
      );
      const input = screen.getByLabelText('to');
      fireEvent.focus(input);
      return input;
    }

    it('ArrowDown highlights the first to suggestion', () => {
      const input = renderWithToDropdown();
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(input).toHaveAttribute('aria-activedescendant', 'to-option-0');
    });

    it('Enter selects the highlighted to suggestion and calls onToSelect', () => {
      const onToSelect = jest.fn();
      const input = renderWithToDropdown(onToSelect);
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onToSelect).toHaveBeenCalledWith(MOCK_ADDRESS_A);
    });

    it('Escape closes the to dropdown', () => {
      const input = renderWithToDropdown();
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(screen.queryByRole('listbox', { name: 'Destination suggestions' })).not.toBeInTheDocument();
    });
  });

  describe('Outside click', () => {
    it('hides an open dropdown when clicking outside the component', () => {
      render(
        <NavigateSearchBar
          {...defaultProps}
          fromQuery="Willis"
          fromSuggestions={[MOCK_ADDRESS_A]}
        />,
      );
      fireEvent.focus(screen.getByLabelText('from'));
      expect(screen.getByRole('listbox', { name: 'Starting point suggestions' })).toBeInTheDocument();

      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole('listbox', { name: 'Starting point suggestions' })).not.toBeInTheDocument();
    });
  });
});
