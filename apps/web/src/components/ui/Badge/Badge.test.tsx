import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  describe('Rendering', () => {
    it('renders the given label', () => {
      render(<Badge label="Not assessed" />);
      expect(screen.getByText('Not assessed')).toBeInTheDocument();
    });

    it('renders non-string labels', () => {
      render(<Badge label={3} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Tone styling', () => {
    it('defaults to the neutral tone', () => {
      render(<Badge label="Not assessed" />);
      expect(screen.getByText('Not assessed')).toHaveClass('bg-slate-100', 'text-slate-500');
    });

    it('applies the success tone', () => {
      render(<Badge label="fastest" tone="success" />);
      expect(screen.getByText('fastest')).toHaveClass('text-success-700', 'bg-success-50');
    });

    it('applies the count tone', () => {
      render(<Badge label="7" tone="count" />);
      expect(screen.getByText('7')).toHaveClass('bg-slate-100', 'text-slate-700');
    });
  });

  describe('Custom className', () => {
    it('merges a custom className with the tone classes', () => {
      render(<Badge label="Schools" tone="count" className="flex-shrink-0" />);
      const el = screen.getByText('Schools');
      expect(el).toHaveClass('flex-shrink-0');
      expect(el).toHaveClass('bg-slate-100');
    });
  });
});
