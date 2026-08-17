import { render, screen } from '@testing-library/react';
import { HazardLegend } from './HazardLegend';
import { HAZARD_COLOR_STOPS } from '@/utils/hazardColor';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
}));

describe('HazardLegend', () => {
  it('renders the legend title', () => {
    render(<HazardLegend />);
    expect(screen.getByText('Hazard Severity')).toBeInTheDocument();
  });

  it('renders safe and severe end labels', () => {
    render(<HazardLegend />);
    expect(screen.getByText('Safe')).toBeInTheDocument();
    expect(screen.getByText('Severe')).toBeInTheDocument();
  });

  it('renders one swatch per color stop, matching the map layer palette', () => {
    const { container } = render(<HazardLegend />);
    const swatches = container.querySelectorAll('[title]');
    expect(swatches).toHaveLength(HAZARD_COLOR_STOPS.length);
  });

  it('flags the data as illustrative/proxy', () => {
    render(<HazardLegend />);
    expect(screen.getByText(/Illustrative proxy data/)).toBeInTheDocument();
  });
});
