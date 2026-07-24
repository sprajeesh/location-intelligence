import { render, screen } from '@testing-library/react';
import { GlassPanel } from './GlassPanel';

describe('GlassPanel', () => {
  describe('Rendering', () => {
    it('renders children', () => {
      render(
        <GlassPanel>
          <p>Results</p>
        </GlassPanel>,
      );
      expect(screen.getByText('Results')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('defaults to the panel variant', () => {
      const { container } = render(<GlassPanel>content</GlassPanel>);
      expect(container.firstChild).toHaveClass('rounded-lg', 'backdrop-blur');
    });

    it('applies the toolbar variant', () => {
      const { container } = render(<GlassPanel variant="toolbar">content</GlassPanel>);
      expect(container.firstChild).toHaveClass('rounded-xl', 'backdrop-blur-md');
    });
  });

  describe('className passthrough', () => {
    it('merges custom classes without dropping the base recipe', () => {
      const { container } = render(<GlassPanel className="w-full h-full">content</GlassPanel>);
      expect(container.firstChild).toHaveClass('w-full', 'h-full', 'bg-slate-900/90');
    });
  });

  describe('Prop forwarding', () => {
    it('forwards arbitrary div props like role and aria-label', () => {
      render(
        <GlassPanel role="toolbar" aria-label="Map controls">
          content
        </GlassPanel>,
      );
      expect(screen.getByRole('toolbar', { name: 'Map controls' })).toBeInTheDocument();
    });
  });

  describe('Polymorphic "as" prop', () => {
    it('renders a div by default', () => {
      const { container } = render(<GlassPanel>content</GlassPanel>);
      expect(container.firstChild?.nodeName).toBe('DIV');
    });

    it('renders the given element when "as" is provided', () => {
      render(
        <GlassPanel as="section" aria-label="Route">
          content
        </GlassPanel>,
      );
      expect(screen.getByRole('region', { name: 'Route' }).nodeName).toBe('SECTION');
    });
  });
});
