import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadiusSelector } from './RadiusSelector';

const defaultProps = {
  value: 5,
  onChange: jest.fn(),
  disabled: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RadiusSelector', () => {
  describe('Rendering', () => {
    it('renders all four preset buttons', () => {
      render(<RadiusSelector {...defaultProps} />);
      expect(screen.getByRole('button', { name: '1 km' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2 km' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '3 km' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '5 km' })).toBeInTheDocument();
    });

    it('renders the Custom button', () => {
      render(<RadiusSelector {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Custom' })).toBeInTheDocument();
    });

    it('marks the active preset with aria-pressed=true', () => {
      render(<RadiusSelector {...defaultProps} value={3} />);
      expect(screen.getByRole('button', { name: '3 km' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('marks inactive presets with aria-pressed=false', () => {
      render(<RadiusSelector {...defaultProps} value={3} />);
      expect(screen.getByRole('button', { name: '1 km' })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: '2 km' })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: '5 km' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('does not show the custom input when a preset is active', () => {
      render(<RadiusSelector {...defaultProps} value={5} />);
      expect(screen.queryByLabelText('Custom radius in kilometres')).not.toBeInTheDocument();
    });

    it('shows the custom input when value is not a preset', () => {
      render(<RadiusSelector {...defaultProps} value={8} />);
      expect(screen.getByLabelText('Custom radius in kilometres')).toBeInTheDocument();
    });

    it('initialises the custom input with the current non-preset value', () => {
      render(<RadiusSelector {...defaultProps} value={7} />);
      expect(screen.getByLabelText('Custom radius in kilometres')).toHaveValue(7);
    });

    it('marks the Custom button as active when value is not a preset', () => {
      render(<RadiusSelector {...defaultProps} value={8} />);
      expect(screen.getByRole('button', { name: 'Custom' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('marks the Custom button as inactive when a preset is active', () => {
      render(<RadiusSelector {...defaultProps} value={5} />);
      expect(screen.getByRole('button', { name: 'Custom' })).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Preset selection', () => {
    it('calls onChange with the preset value when a preset button is clicked', async () => {
      const onChange = jest.fn();
      render(<RadiusSelector {...defaultProps} onChange={onChange} />);
      await userEvent.click(screen.getByRole('button', { name: '1 km' }));
      expect(onChange).toHaveBeenCalledWith(1);
    });

    it('calls onChange with the correct value for each preset', async () => {
      const onChange = jest.fn();
      render(<RadiusSelector {...defaultProps} onChange={onChange} />);
      for (const preset of [1, 2, 3, 5]) {
        await userEvent.click(screen.getByRole('button', { name: `${preset} km` }));
        expect(onChange).toHaveBeenCalledWith(preset);
      }
    });

    it('hides the custom input when a preset is clicked while custom is active', async () => {
      render(<RadiusSelector {...defaultProps} value={8} />);
      expect(screen.getByLabelText('Custom radius in kilometres')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: '3 km' }));
      expect(screen.queryByLabelText('Custom radius in kilometres')).not.toBeInTheDocument();
    });
  });

  describe('Custom input', () => {
    it('shows the custom input when the Custom button is clicked', async () => {
      render(<RadiusSelector {...defaultProps} value={5} />);
      await userEvent.click(screen.getByRole('button', { name: 'Custom' }));
      expect(screen.getByLabelText('Custom radius in kilometres')).toBeInTheDocument();
    });

    it('calls onChange with the entered value on blur', async () => {
      const onChange = jest.fn();
      render(<RadiusSelector {...defaultProps} value={5} onChange={onChange} />);
      await userEvent.click(screen.getByRole('button', { name: 'Custom' }));
      const input = screen.getByLabelText('Custom radius in kilometres');
      await userEvent.clear(input);
      await userEvent.type(input, '8');
      fireEvent.blur(input);
      expect(onChange).toHaveBeenCalledWith(8);
    });

    it('calls onChange with the entered value when Enter is pressed', async () => {
      const onChange = jest.fn();
      render(<RadiusSelector {...defaultProps} value={5} onChange={onChange} />);
      await userEvent.click(screen.getByRole('button', { name: 'Custom' }));
      const input = screen.getByLabelText('Custom radius in kilometres');
      await userEvent.clear(input);
      await userEvent.type(input, '6{Enter}');
      expect(onChange).toHaveBeenCalledWith(6);
    });

    it('hides the custom input when Escape is pressed', async () => {
      render(<RadiusSelector {...defaultProps} value={5} />);
      await userEvent.click(screen.getByRole('button', { name: 'Custom' }));
      const input = screen.getByLabelText('Custom radius in kilometres');
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(screen.queryByLabelText('Custom radius in kilometres')).not.toBeInTheDocument();
    });
  });

  describe('Value clamping', () => {
    it('clamps values above 10 to 10', async () => {
      const onChange = jest.fn();
      render(<RadiusSelector {...defaultProps} value={5} onChange={onChange} />);
      await userEvent.click(screen.getByRole('button', { name: 'Custom' }));
      const input = screen.getByLabelText('Custom radius in kilometres');
      await userEvent.clear(input);
      await userEvent.type(input, '15');
      fireEvent.blur(input);
      expect(onChange).toHaveBeenCalledWith(10);
    });

    it('clamps values below 1 to 1', async () => {
      const onChange = jest.fn();
      render(<RadiusSelector {...defaultProps} value={5} onChange={onChange} />);
      await userEvent.click(screen.getByRole('button', { name: 'Custom' }));
      const input = screen.getByLabelText('Custom radius in kilometres');
      await userEvent.clear(input);
      await userEvent.type(input, '0');
      fireEvent.blur(input);
      expect(onChange).toHaveBeenCalledWith(1);
    });

    it('clamps NaN input to 1', async () => {
      const onChange = jest.fn();
      render(<RadiusSelector {...defaultProps} value={5} onChange={onChange} />);
      await userEvent.click(screen.getByRole('button', { name: 'Custom' }));
      const input = screen.getByLabelText('Custom radius in kilometres');
      await userEvent.clear(input);
      fireEvent.blur(input);
      expect(onChange).toHaveBeenCalledWith(1);
    });
  });

  describe('Disabled state', () => {
    it('disables all preset buttons when disabled=true', () => {
      render(<RadiusSelector {...defaultProps} disabled={true} />);
      [1, 2, 3, 5].forEach((preset) => {
        expect(screen.getByRole('button', { name: `${preset} km` })).toBeDisabled();
      });
    });

    it('disables the Custom button when disabled=true', () => {
      render(<RadiusSelector {...defaultProps} disabled={true} />);
      expect(screen.getByRole('button', { name: 'Custom' })).toBeDisabled();
    });

    it('disables the custom input when disabled=true', () => {
      render(<RadiusSelector {...defaultProps} value={8} disabled={true} />);
      expect(screen.getByLabelText('Custom radius in kilometres')).toBeDisabled();
    });

    it('does not call onChange when a disabled preset is clicked', async () => {
      const onChange = jest.fn();
      render(<RadiusSelector {...defaultProps} onChange={onChange} disabled={true} />);
      await userEvent.click(screen.getByRole('button', { name: '1 km' }));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has a group role with an accessible label', () => {
      render(<RadiusSelector {...defaultProps} />);
      expect(screen.getByRole('group', { name: 'Search radius' })).toBeInTheDocument();
    });

    it('custom input has an accessible label', async () => {
      render(<RadiusSelector {...defaultProps} value={5} />);
      await userEvent.click(screen.getByRole('button', { name: 'Custom' }));
      expect(screen.getByLabelText('Custom radius in kilometres')).toBeInTheDocument();
    });
  });
});
