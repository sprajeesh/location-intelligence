import { render, screen } from '@testing-library/react';
import { CoverageBadge } from './CoverageBadge';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, opts?: { count?: number; total?: number; defaultValue?: string }) => {
    if (key === 'score.coverage' && opts) {
      return `Based on ${opts.count} of ${opts.total} categories`;
    }
    return opts?.defaultValue ?? key;
  },
}));

describe('CoverageBadge', () => {
  it('renders the scored/total counts', () => {
    render(<CoverageBadge scored={4} total={5} />);
    expect(screen.getByText('Based on 4 of 5 categories')).toBeInTheDocument();
  });

  it('renders full coverage', () => {
    render(<CoverageBadge scored={5} total={5} />);
    expect(screen.getByText('Based on 5 of 5 categories')).toBeInTheDocument();
  });

  it('renders zero coverage', () => {
    render(<CoverageBadge scored={0} total={5} />);
    expect(screen.getByText('Based on 0 of 5 categories')).toBeInTheDocument();
  });
});
