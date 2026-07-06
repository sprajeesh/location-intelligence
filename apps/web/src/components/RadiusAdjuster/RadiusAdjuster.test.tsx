import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadiusAdjuster } from './RadiusAdjuster';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
}));

describe('RadiusAdjuster', () => {
  describe('Collapsed state', () => {
    it('renders the caption and not the stepper by default', () => {
      render(<RadiusAdjuster onSearch={jest.fn()} />);
      expect(
        screen.getByText('Not seeing expected results? Adjust the search radius')
      ).toBeInTheDocument();
      expect(screen.queryByLabelText('Search radius')).not.toBeInTheDocument();
    });

    it('expands to show the stepper when the caption is clicked', async () => {
      render(<RadiusAdjuster onSearch={jest.fn()} />);
      await userEvent.click(screen.getByText(/adjust the search radius/i));
      expect(screen.getByLabelText('Search radius')).toBeInTheDocument();
    });

    it('renders expanded immediately when defaultExpanded is true', () => {
      render(<RadiusAdjuster onSearch={jest.fn()} defaultExpanded />);
      expect(screen.getByLabelText('Search radius')).toBeInTheDocument();
    });
  });

  describe('Expanded stepper', () => {
    it('initialises the field with initialValue', () => {
      render(<RadiusAdjuster onSearch={jest.fn()} defaultExpanded initialValue={7} />);
      expect(screen.getByLabelText('Search radius')).toHaveValue(7);
    });

    it('increments the draft value when the + button is clicked', async () => {
      render(<RadiusAdjuster onSearch={jest.fn()} defaultExpanded initialValue={5} />);
      await userEvent.click(screen.getByRole('button', { name: 'Increase radius' }));
      expect(screen.getByLabelText('Search radius')).toHaveValue(6);
    });

    it('decrements the draft value when the − button is clicked', async () => {
      render(<RadiusAdjuster onSearch={jest.fn()} defaultExpanded initialValue={5} />);
      await userEvent.click(screen.getByRole('button', { name: 'Decrease radius' }));
      expect(screen.getByLabelText('Search radius')).toHaveValue(4);
    });

    it('clamps the draft value at max', async () => {
      render(
        <RadiusAdjuster onSearch={jest.fn()} defaultExpanded initialValue={10} max={10} />
      );
      expect(screen.getByRole('button', { name: 'Increase radius' })).toBeDisabled();
    });

    it('clamps the draft value at min', async () => {
      render(<RadiusAdjuster onSearch={jest.fn()} defaultExpanded initialValue={1} min={1} />);
      expect(screen.getByRole('button', { name: 'Decrease radius' })).toBeDisabled();
    });

    it('does not call onSearch just from changing the draft value', async () => {
      const onSearch = jest.fn();
      render(<RadiusAdjuster onSearch={onSearch} defaultExpanded initialValue={5} />);
      await userEvent.click(screen.getByRole('button', { name: 'Increase radius' }));
      expect(onSearch).not.toHaveBeenCalled();
    });

    it('calls onSearch with the current draft value when Search is clicked', async () => {
      const onSearch = jest.fn();
      render(<RadiusAdjuster onSearch={onSearch} defaultExpanded initialValue={5} />);
      await userEvent.click(screen.getByRole('button', { name: 'Increase radius' }));
      await userEvent.click(screen.getByRole('button', { name: 'Search' }));
      expect(onSearch).toHaveBeenCalledWith(6);
    });
  });

  describe('Disabled state', () => {
    it('disables the stepper and search button when disabled', () => {
      render(<RadiusAdjuster onSearch={jest.fn()} defaultExpanded disabled />);
      expect(screen.getByLabelText('Search radius')).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Increase radius' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Decrease radius' })).toBeDisabled();
    });

    it('disables the collapsed caption when disabled', () => {
      render(<RadiusAdjuster onSearch={jest.fn()} disabled />);
      expect(screen.getByText(/adjust the search radius/i).closest('button')).toBeDisabled();
    });
  });
});
