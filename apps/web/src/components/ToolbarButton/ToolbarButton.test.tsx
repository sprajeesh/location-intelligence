import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolbarButton } from './ToolbarButton';
import { Map } from 'lucide-react';

const defaultProps = {
  icon: Map,
  label: 'Zoom in',
  onClick: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ToolbarButton', () => {
  describe('Rendering', () => {
    it('renders with the correct aria-label', () => {
      render(<ToolbarButton {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    });

    it('renders with a title attribute', () => {
      render(<ToolbarButton {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Zoom in' })).toHaveAttribute('title', 'Zoom in');
    });

    it('renders as a button element', () => {
      render(<ToolbarButton {...defaultProps} />);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });
  });

  describe('Active state', () => {
    it('applies active styling when active=true', () => {
      const { container } = render(<ToolbarButton {...defaultProps} active />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('bg-blue-500/20', 'text-blue-400');
    });

    it('applies default styling when active=false', () => {
      const { container } = render(<ToolbarButton {...defaultProps} active={false} />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('text-slate-300');
      expect(button).not.toHaveClass('bg-blue-500/20');
    });

    it('defaults to inactive when active is not provided', () => {
      const { container } = render(<ToolbarButton {...defaultProps} />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('text-slate-300');
    });
  });

  describe('Disabled state', () => {
    it('disables the button when disabled=true', () => {
      render(<ToolbarButton {...defaultProps} disabled />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('applies disabled styling', () => {
      const { container } = render(<ToolbarButton {...defaultProps} disabled />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('disabled:opacity-40', 'disabled:cursor-not-allowed');
    });

    it('does not call onClick when disabled', async () => {
      const onClick = jest.fn();
      render(<ToolbarButton {...defaultProps} onClick={onClick} disabled />);
      await userEvent.click(screen.getByRole('button'));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Click handling', () => {
    it('calls onClick when clicked', async () => {
      const onClick = jest.fn();
      render(<ToolbarButton {...defaultProps} onClick={onClick} />);
      await userEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('passes the mouse event to onClick', async () => {
      const onClick = jest.fn();
      render(<ToolbarButton {...defaultProps} onClick={onClick} />);
      await userEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('Accessibility', () => {
    it('has a visible label for screen readers', () => {
      render(<ToolbarButton {...defaultProps} />);
      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
    });

    it('marks the icon as aria-hidden', () => {
      const { container } = render(<ToolbarButton {...defaultProps} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
