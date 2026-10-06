import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';
import { Settings } from 'lucide-react';

const defaultProps = {
  icon: Settings,
  label: 'Scoring',
  onClick: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Button', () => {
  describe('Rendering', () => {
    it('renders the visible label text', () => {
      render(<Button {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Scoring' })).toHaveTextContent('Scoring');
    });

    it('falls back to label for the title attribute', () => {
      render(<Button {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Scoring' })).toHaveAttribute('title', 'Scoring');
    });

    it('uses a distinct title when provided', () => {
      render(<Button {...defaultProps} title="Open scoring settings" />);
      expect(screen.getByRole('button', { name: 'Scoring' })).toHaveAttribute(
        'title',
        'Open scoring settings',
      );
    });

    it('always renders type="button"', () => {
      render(<Button {...defaultProps} />);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });
  });

  describe('Active state', () => {
    it('applies active styling when active=true', () => {
      const { container } = render(<Button {...defaultProps} active />);
      expect(container.querySelector('button')).toHaveClass('bg-primary-50', 'text-primary-600');
    });
  });

  describe('Pressed state', () => {
    it('does not set aria-pressed when pressed is not provided', () => {
      render(<Button {...defaultProps} />);
      expect(screen.getByRole('button')).not.toHaveAttribute('aria-pressed');
    });

    it('sets aria-pressed=true when pressed=true', () => {
      render(<Button {...defaultProps} pressed />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Disabled state', () => {
    it('disables the button when disabled=true', () => {
      render(<Button {...defaultProps} disabled />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('does not call onClick when disabled', async () => {
      const onClick = jest.fn();
      render(<Button {...defaultProps} onClick={onClick} disabled />);
      await userEvent.click(screen.getByRole('button'));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Click handling', () => {
    it('calls onClick when clicked', async () => {
      const onClick = jest.fn();
      render(<Button {...defaultProps} onClick={onClick} />);
      await userEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('marks the icon as aria-hidden', () => {
      const { container } = render(<Button {...defaultProps} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
