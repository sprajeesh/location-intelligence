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
      expect(screen.getByText('Not assessed')).toHaveClass('bg-slate-700/40', 'text-slate-400');
    });

    it('applies the success tone', () => {
      render(<Badge label="fastest" tone="success" />);
      expect(screen.getByText('fastest')).toHaveClass('text-emerald-400', 'bg-emerald-400/10');
    });

    it('applies the count tone', () => {
      render(<Badge label="7" tone="count" />);
      expect(screen.getByText('7')).toHaveClass('bg-slate-700/50', 'text-slate-300');
    });
  });

  describe('Custom className', () => {
    it('merges a custom className with the tone classes', () => {
      render(<Badge label="Schools" tone="count" className="flex-shrink-0" />);
      const el = screen.getByText('Schools');
      expect(el).toHaveClass('flex-shrink-0');
      expect(el).toHaveClass('bg-slate-700/50');
    });
  });
});
