import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouteOptionCard } from './RouteOptionCard';
import type { RouteOption } from '@/types/api';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
}));

const routeWithSteps: RouteOption = {
  coordinates: [[-41.28, 174.77], [-41.29, 174.78]],
  durationS: 600,
  distanceM: 5000,
  summary: 'Main Road, Some Suburb',
  steps: [
    { instruction: 'Head north on Main Road', name: 'Main Road', distanceM: 500, durationS: 60 },
    { instruction: 'Turn right onto Side Street', name: 'Side Street', distanceM: 300, durationS: 40 },
  ],
};

const routeWithoutSteps: RouteOption = {
  coordinates: [[-41.28, 174.77]],
  durationS: 300,
  distanceM: 0,
  summary: '',
  steps: [],
};

describe('RouteOptionCard', () => {
  describe('Rendering', () => {
    it('renders the primary road and duration', () => {
      render(<RouteOptionCard route={routeWithSteps} isExpanded={false} onToggle={jest.fn()} />);
      expect(screen.getByText(/Main Road/)).toBeInTheDocument();
      expect(screen.getByText('10 min')).toBeInTheDocument();
    });

    it('shows a "fastest" badge only when isFastest is true', () => {
      const { rerender } = render(
        <RouteOptionCard route={routeWithSteps} isExpanded={false} isFastest onToggle={jest.fn()} />,
      );
      expect(screen.getByText('fastest')).toBeInTheDocument();

      rerender(<RouteOptionCard route={routeWithSteps} isExpanded={false} onToggle={jest.fn()} />);
      expect(screen.queryByText('fastest')).not.toBeInTheDocument();
    });
  });

  describe('Expand/collapse', () => {
    it('does not render steps when collapsed', () => {
      render(<RouteOptionCard route={routeWithSteps} isExpanded={false} onToggle={jest.fn()} />);
      expect(screen.queryByText('Head north on Main Road')).not.toBeInTheDocument();
    });

    it('renders each step when expanded', () => {
      render(<RouteOptionCard route={routeWithSteps} isExpanded={true} onToggle={jest.fn()} />);
      expect(screen.getByText('Head north on Main Road')).toBeInTheDocument();
      expect(screen.getByText('Turn right onto Side Street')).toBeInTheDocument();
    });

    it('renders a fallback message when expanded with no steps', () => {
      render(<RouteOptionCard route={routeWithoutSteps} isExpanded={true} onToggle={jest.fn()} />);
      expect(screen.getByText('No step details available.')).toBeInTheDocument();
    });

    it('calls onToggle when the header is clicked', async () => {
      const onToggle = jest.fn();
      render(<RouteOptionCard route={routeWithSteps} isExpanded={false} onToggle={onToggle} />);
      await userEvent.click(screen.getByRole('button'));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('exposes aria-expanded on the header button matching isExpanded', () => {
      const { rerender } = render(
        <RouteOptionCard route={routeWithSteps} isExpanded={false} onToggle={jest.fn()} />,
      );
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');

      rerender(<RouteOptionCard route={routeWithSteps} isExpanded={true} onToggle={jest.fn()} />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
