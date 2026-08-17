import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HazardDisplay } from './HazardDisplay';
import type { HazardResult } from '@/types/hazard';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, opts?: { defaultValue?: string; hazards?: string }) => {
    if (key === 'hazard.severeWarning' && opts?.hazards) {
      return `Severe risk: ${opts.hazards}`;
    }
    return opts?.defaultValue ?? key;
  },
}));

const nonSevereHazard: HazardResult = {
  composite: 42,
  worstHazard: 42,
  worstHazardType: 'demo_hazard',
  anySevere: false,
  disclaimer: 'Illustrative hazard estimate at grid-cell resolution.',
  hazards: [
    {
      hazardType: 'demo_hazard',
      score: 42,
      source: 'Phase-0 Scaffold Dummy Generator',
      currencyDate: '2026-08-16',
      isProxy: true,
      isSevere: false,
    },
  ],
};

const severeHazard: HazardResult = {
  ...nonSevereHazard,
  composite: 55,
  worstHazard: 91,
  worstHazardType: 'demo_hazard',
  anySevere: true,
  hazards: [
    { ...nonSevereHazard.hazards[0]!, score: 91, isSevere: true },
  ],
};

describe('HazardDisplay', () => {
  describe('Rendering', () => {
    it('shows the composite and worst-hazard labels side by side', () => {
      render(<HazardDisplay hazard={nonSevereHazard} />);
      expect(screen.getByText('Composite')).toBeInTheDocument();
      expect(screen.getByText('Worst hazard')).toBeInTheDocument();
    });

    it('renders the persistent disclaimer', () => {
      render(<HazardDisplay hazard={nonSevereHazard} />);
      expect(screen.getByText(nonSevereHazard.disclaimer)).toBeInTheDocument();
    });

    it('does not show a severe-risk banner when nothing is severe', () => {
      render(<HazardDisplay hazard={nonSevereHazard} />);
      expect(screen.queryByText(/Severe risk/)).not.toBeInTheDocument();
    });
  });

  describe('Severe hazard state', () => {
    it('shows a severe-risk banner naming the severe hazard type', () => {
      render(<HazardDisplay hazard={severeHazard} />);
      expect(screen.getByText('Severe risk: demo_hazard')).toBeInTheDocument();
    });

    it('renders distinct composite and worst-hazard values (never collapsed into one)', () => {
      render(<HazardDisplay hazard={severeHazard} />);
      // 55 (composite) appears once; 91 (worst-hazard) appears in the
      // headline plus the drill-down row's score badge -- both non-zero,
      // and never equal to each other, proving they're tracked separately.
      expect(screen.getAllByText('55')).toHaveLength(1);
      expect(screen.getAllByText('91').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Per-hazard drill-down', () => {
    it('expands to show source, currency date, and proxy label', async () => {
      const user = userEvent.setup();
      render(<HazardDisplay hazard={nonSevereHazard} />);

      await user.click(screen.getByRole('button', { name: /demo_hazard/i }));

      expect(screen.getByText('Phase-0 Scaffold Dummy Generator')).toBeInTheDocument();
      expect(screen.getByText('2026-08-16')).toBeInTheDocument();
      expect(screen.getByText(/Proxy estimate/)).toBeInTheDocument();
    });

    it('does not show the proxy label for a non-proxy hazard', async () => {
      const user = userEvent.setup();
      const authoritative: HazardResult = {
        ...nonSevereHazard,
        hazards: [{ ...nonSevereHazard.hazards[0]!, isProxy: false }],
      };
      render(<HazardDisplay hazard={authoritative} />);

      await user.click(screen.getByRole('button', { name: /demo_hazard/i }));

      expect(screen.queryByText(/Proxy estimate/)).not.toBeInTheDocument();
    });
  });
});
