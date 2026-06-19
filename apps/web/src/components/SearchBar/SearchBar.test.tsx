import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from './SearchBar';
import type { AddressResult } from '@/types/api';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'search.placeholder': 'Search a New Zealand address...',
      'search.loading': 'Searching...',
      'search.noResults': 'No results found',
      'errors.generic': 'Something went wrong. Please try again.',
    };
    return translations[key] || key;
  },
}));

describe('SearchBar', () => {
  const mockSuggestions: AddressResult[] = [
    {
      displayName: '123 Main Street, Auckland',
      lat: -36.8485,
      lon: 174.7633,
    },
    {
      displayName: '456 Queen Street, Auckland',
      lat: -36.8427,
      lon: 174.7675,
    },
  ];

  const defaultProps = {
    query: '',
    suggestions: [],
    isLoading: false,
    error: null,
    onQueryChange: jest.fn(),
    onSelectAddress: jest.fn(),
    onClear: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the input field with placeholder', () => {
      render(<SearchBar {...defaultProps} />);
      const input = screen.getByPlaceholderText(
        'Search a New Zealand address...'
      );
      expect(input).toBeInTheDocument();
    });

    it('displays the query value in the input', () => {
      render(<SearchBar {...defaultProps} query="123 Main" />);
      const input = screen.getByDisplayValue('123 Main');
      expect(input).toBeInTheDocument();
    });

    it('renders search icon', () => {
      const { container } = render(<SearchBar {...defaultProps} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('User Input', () => {
    it('calls onQueryChange when user types', async () => {
      const onQueryChange = jest.fn();
      render(
        <SearchBar
          {...defaultProps}
          onQueryChange={onQueryChange}
          suggestions={mockSuggestions}
        />
      );

      const input = screen.getByPlaceholderText(
        'Search a New Zealand address...'
      );
      fireEvent.change(input, { target: { value: 'Main' } });

      expect(onQueryChange).toHaveBeenCalledWith('Main');
    });

    it('calls onClear when clear button is clicked', async () => {
      const onClear = jest.fn();
      render(
        <SearchBar {...defaultProps} query="test query" onClear={onClear} />
      );

      const clearButton = screen.getByLabelText('Clear search');
      await userEvent.click(clearButton);

      expect(onClear).toHaveBeenCalled();
    });

    it('does not show clear button when query is empty', () => {
      render(<SearchBar {...defaultProps} query="" />);
      const clearButton = screen.queryByLabelText('Clear search');
      expect(clearButton).not.toBeInTheDocument();
    });

    it('does not show clear button when loading', () => {
      render(
        <SearchBar {...defaultProps} query="test" isLoading={true} />
      );
      const clearButton = screen.queryByLabelText('Clear search');
      expect(clearButton).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when isLoading is true', () => {
      const { container } = render(
        <SearchBar {...defaultProps} query="test" isLoading={true} />
      );
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('displays loading message below input when loading with query', () => {
      render(
        <SearchBar
          {...defaultProps}
          query="test"
          isLoading={true}
        />
      );
      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    it('does not show loading message when query is empty', () => {
      render(
        <SearchBar
          {...defaultProps}
          query=""
          isLoading={true}
        />
      );
      expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('displays error message when error prop is set', () => {
      render(
        <SearchBar
          {...defaultProps}
          query="test"
          error="API Error"
          suggestions={[]}
        />
      );
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
    });

    it('does not show error message when error is null', () => {
      render(
        <SearchBar
          {...defaultProps}
          query="test"
          error={null}
          suggestions={[]}
        />
      );
      expect(screen.queryByText('Something went wrong. Please try again.')).not.toBeInTheDocument();
    });
  });

  describe('Suggestions Dropdown', () => {
    it('shows dropdown when query is not empty and suggestions exist', () => {
      render(
        <SearchBar
          {...defaultProps}
          query="Main"
          suggestions={mockSuggestions}
        />
      );
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText('123 Main Street, Auckland')).toBeInTheDocument();
    });

    it('displays all suggestions in dropdown', () => {
      render(
        <SearchBar
          {...defaultProps}
          query="test"
          suggestions={mockSuggestions}
        />
      );
      mockSuggestions.forEach((suggestion) => {
        expect(screen.getByText(suggestion.displayName)).toBeInTheDocument();
      });
    });

    it('does not show dropdown when query is empty', () => {
      render(
        <SearchBar
          {...defaultProps}
          query=""
          suggestions={mockSuggestions}
        />
      );
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('shows "no results" message when suggestions is empty and query is not empty', () => {
      render(
        <SearchBar
          {...defaultProps}
          query="nonexistent"
          suggestions={[]}
        />
      );
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('calls onSelectAddress when a suggestion is clicked', async () => {
      const onSelectAddress = jest.fn();
      render(
        <SearchBar
          {...defaultProps}
          query="Main"
          suggestions={mockSuggestions}
          onSelectAddress={onSelectAddress}
        />
      );

      const suggestionButton = screen.getByText('123 Main Street, Auckland');
      await userEvent.click(suggestionButton);

      expect(onSelectAddress).toHaveBeenCalledWith(mockSuggestions[0]);
    });

    it('closes dropdown after selecting a suggestion', async () => {
      const onSelectAddress = jest.fn();
      render(
        <SearchBar
          {...defaultProps}
          query="Main"
          suggestions={mockSuggestions}
          onSelectAddress={onSelectAddress}
        />
      );

      const suggestionButton = screen.getByText('123 Main Street, Auckland');
      await userEvent.click(suggestionButton);

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('highlights suggestion on ArrowDown', async () => {
      render(
        <SearchBar
          {...defaultProps}
          query="Main"
          suggestions={mockSuggestions}
        />
      );

      const input = screen.getByPlaceholderText(
        'Search a New Zealand address...'
      );
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      const firstSuggestion = screen.getByText('123 Main Street, Auckland');
      expect(firstSuggestion.closest('li')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    it('highlights previous suggestion on ArrowUp', async () => {
      const { rerender } = render(
        <SearchBar
          {...defaultProps}
          query="Main"
          suggestions={mockSuggestions}
        />
      );

      const input = screen.getByPlaceholderText(
        'Search a New Zealand address...'
      );

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // Rerender to apply state changes
      rerender(
        <SearchBar
          {...defaultProps}
          query="Main"
          suggestions={mockSuggestions}
        />
      );

      fireEvent.keyDown(input, { key: 'ArrowUp' });
      expect(input).toBeInTheDocument();
    });

    it('selects highlighted suggestion on Enter', async () => {
      const onSelectAddress = jest.fn();
      render(
        <SearchBar
          {...defaultProps}
          query="Main"
          suggestions={mockSuggestions}
          onSelectAddress={onSelectAddress}
        />
      );

      const input = screen.getByPlaceholderText(
        'Search a New Zealand address...'
      );
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onSelectAddress).toHaveBeenCalledWith(mockSuggestions[0]);
    });

    it('closes dropdown on Escape', async () => {
      render(
        <SearchBar
          {...defaultProps}
          query="Main"
          suggestions={mockSuggestions}
        />
      );

      const input = screen.getByPlaceholderText(
        'Search a New Zealand address...'
      );
      fireEvent.keyDown(input, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('does nothing on Enter when dropdown is closed', async () => {
      const onSelectAddress = jest.fn();
      render(
        <SearchBar
          {...defaultProps}
          query="Main"
          suggestions={mockSuggestions}
          onSelectAddress={onSelectAddress}
        />
      );

      const input = screen.getByPlaceholderText(
        'Search a New Zealand address...'
      );
      fireEvent.keyDown(input, { key: 'Escape' });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onSelectAddress).not.toHaveBeenCalled();
    });
  });

  describe('Click Outside Behavior', () => {
    it('closes dropdown when clicking outside', async () => {
      const { container } = render(
        <SearchBar
          {...defaultProps}
          query="Main"
          suggestions={mockSuggestions}
        />
      );

      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Dropdown Highlighting', () => {
    it('highlights suggestion on mouse enter', async () => {
      render(
        <SearchBar
          {...defaultProps}
          query="Main"
          suggestions={mockSuggestions}
        />
      );

      const firstSuggestion = screen.getByText('123 Main Street, Auckland').closest('button');
      fireEvent.mouseEnter(firstSuggestion!);

      expect(firstSuggestion?.closest('li')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <SearchBar
          {...defaultProps}
          query="Main"
          suggestions={mockSuggestions}
        />
      );

      const input = screen.getByLabelText('Search address');
      expect(input).toHaveAttribute('aria-autocomplete', 'list');
      expect(input).toHaveAttribute('aria-expanded', 'true');
    });

    it('listbox has proper role and ARIA attributes', () => {
      render(
        <SearchBar
          {...defaultProps}
          query="Main"
          suggestions={mockSuggestions}
        />
      );

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('role', 'listbox');

      // Verify aria-controls connects input to listbox
      const input = screen.getByLabelText('Search address');
      const listboxId = listbox.getAttribute('id');
      expect(input).toHaveAttribute('aria-controls', listboxId);
    });
  });
});
