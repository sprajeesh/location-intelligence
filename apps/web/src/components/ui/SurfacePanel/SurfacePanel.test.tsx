import { render, screen } from '@testing-library/react';
import { SurfacePanel } from './SurfacePanel';

describe('SurfacePanel', () => {
  describe('Rendering', () => {
    it('renders children', () => {
      render(
        <SurfacePanel>
          <p>Results</p>
        </SurfacePanel>,
      );
      expect(screen.getByText('Results')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('defaults to the panel variant', () => {
      const { container } = render(<SurfacePanel>content</SurfacePanel>);
      expect(container.firstChild).toHaveClass('rounded-xl', 'shadow-card');
    });

    it('applies the toolbar variant', () => {
      const { container } = render(<SurfacePanel variant="toolbar">content</SurfacePanel>);
      expect(container.firstChild).toHaveClass('rounded-xl', 'shadow-card-lg');
    });
  });

  describe('className passthrough', () => {
    it('merges custom classes without dropping the base recipe', () => {
      const { container } = render(<SurfacePanel className="w-full h-full">content</SurfacePanel>);
      expect(container.firstChild).toHaveClass('w-full', 'h-full', 'bg-white');
    });
  });

  describe('Prop forwarding', () => {
    it('forwards arbitrary div props like role and aria-label', () => {
      render(
        <SurfacePanel role="toolbar" aria-label="Map controls">
          content
        </SurfacePanel>,
      );
      expect(screen.getByRole('toolbar', { name: 'Map controls' })).toBeInTheDocument();
    });
  });

  describe('Polymorphic "as" prop', () => {
    it('renders a div by default', () => {
      const { container } = render(<SurfacePanel>content</SurfacePanel>);
      expect(container.firstChild?.nodeName).toBe('DIV');
    });

    it('renders the given element when "as" is provided', () => {
      render(
        <SurfacePanel as="section" aria-label="Route">
          content
        </SurfacePanel>,
      );
      expect(screen.getByRole('region', { name: 'Route' }).nodeName).toBe('SECTION');
    });
  });
});
