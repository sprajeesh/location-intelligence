import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconButton } from './IconButton';
import { Map } from 'lucide-react';

const defaultProps = {
  icon: Map,
  label: 'Zoom in',
  onClick: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('IconButton', () => {
  describe('Rendering', () => {
    it('renders with the correct aria-label', () => {
      render(<IconButton {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    });

    it('falls back to label for the title attribute', () => {
      render(<IconButton {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Zoom in' })).toHaveAttribute('title', 'Zoom in');
    });

    it('uses a distinct title when provided', () => {
      render(<IconButton {...defaultProps} title="Show route to school" />);
      expect(screen.getByRole('button', { name: 'Zoom in' })).toHaveAttribute(
        'title',
        'Show route to school',
      );
    });

    it('always renders type="button"', () => {
      render(<IconButton {...defaultProps} />);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });
  });

  describe('Size variants', () => {
    it('defaults to size md', () => {
      const { container } = render(<IconButton {...defaultProps} />);
      expect(container.querySelector('button')).toHaveClass('w-8', 'h-8');
    });

    it('applies size sm', () => {
      const { container } = render(<IconButton {...defaultProps} size="sm" />);
      expect(container.querySelector('button')).toHaveClass('p-1.5');
      expect(container.querySelector('button')).not.toHaveClass('w-8');
    });
  });

  describe('Active state', () => {
    it('applies active styling when active=true', () => {
      const { container } = render(<IconButton {...defaultProps} active />);
      expect(container.querySelector('button')).toHaveClass('bg-blue-500/20', 'text-blue-400');
    });
  });

  describe('Pressed state', () => {
    it('does not set aria-pressed when pressed is not provided', () => {
      render(<IconButton {...defaultProps} />);
      expect(screen.getByRole('button')).not.toHaveAttribute('aria-pressed');
    });

    it('sets aria-pressed=true when pressed=true', () => {
      render(<IconButton {...defaultProps} pressed />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('sets aria-pressed=false when pressed=false', () => {
      render(<IconButton {...defaultProps} pressed={false} />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Disabled state', () => {
    it('disables the button when disabled=true', () => {
      render(<IconButton {...defaultProps} disabled />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('does not call onClick when disabled', async () => {
      const onClick = jest.fn();
      render(<IconButton {...defaultProps} onClick={onClick} disabled />);
      await userEvent.click(screen.getByRole('button'));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Click handling', () => {
    it('calls onClick when clicked', async () => {
      const onClick = jest.fn();
      render(<IconButton {...defaultProps} onClick={onClick} />);
      await userEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has a visible label for screen readers', () => {
      render(<IconButton {...defaultProps} />);
      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
    });

    it('marks the icon as aria-hidden', () => {
      const { container } = render(<IconButton {...defaultProps} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('supports a custom tabIndex', () => {
      render(<IconButton {...defaultProps} tabIndex={-1} />);
      expect(screen.getByRole('button')).toHaveAttribute('tabindex', '-1');
    });
  });
});
