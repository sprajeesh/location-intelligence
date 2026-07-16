import { render, screen } from '@testing-library/react';
import { StatusPill } from './StatusPill';

describe('StatusPill', () => {
  it('renders the given label', () => {
    render(<StatusPill label="Not assessed" />);
    expect(screen.getByText('Not assessed')).toBeInTheDocument();
  });

  it('renders a different label', () => {
    render(<StatusPill label="None found nearby" />);
    expect(screen.getByText('None found nearby')).toBeInTheDocument();
  });
});
