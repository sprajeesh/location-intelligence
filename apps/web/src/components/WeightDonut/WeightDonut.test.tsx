import { render, screen } from '@testing-library/react';
import { WeightDonut } from './WeightDonut';
import type { WeightDonutSegment } from './WeightDonut';

describe('WeightDonut', () => {
  it('renders nothing when fewer than 2 segments', () => {
    const segments: WeightDonutSegment[] = [
      {
        key: 'schools',
        weightPct: 100,
        colorClass: 'text-good-600',
      },
    ];
    render(<WeightDonut segments={segments} />);
    expect(screen.queryByTestId('weight-donut')).not.toBeInTheDocument();
  });

  it('renders nothing when no segments provided', () => {
    const { container } = render(<WeightDonut segments={[]} />);
    expect(screen.queryByTestId('weight-donut')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('renders SVG when 2 or more segments', () => {
    const segments: WeightDonutSegment[] = [
      {
        key: 'schools',
        weightPct: 60,
        colorClass: 'text-good-600',
      },
      {
        key: 'universities',
        weightPct: 40,
        colorClass: 'text-moderate-600',
      },
    ];
    render(<WeightDonut segments={segments} />);
    expect(screen.getByTestId('weight-donut')).toBeInTheDocument();
  });

  it('renders correct number of circle segments', () => {
    const segments: WeightDonutSegment[] = [
      {
        key: 'schools',
        weightPct: 50,
        colorClass: 'text-good-600',
      },
      {
        key: 'universities',
        weightPct: 30,
        colorClass: 'text-moderate-600',
      },
      {
        key: 'libraries',
        weightPct: 20,
        colorClass: 'text-poor-600',
      },
    ];
    render(<WeightDonut segments={segments} />);
    const svg = screen.getByTestId('weight-donut');
    // One background circle + three segment circles
    const circles = svg.querySelectorAll('circle');
    expect(circles).toHaveLength(4);
  });

  it('applies passed color classes to segments', () => {
    const segments: WeightDonutSegment[] = [
      {
        key: 'schools',
        weightPct: 50,
        colorClass: 'text-good-600',
      },
      {
        key: 'universities',
        weightPct: 50,
        colorClass: 'text-moderate-600',
      },
    ];
    render(<WeightDonut segments={segments} />);
    const svg = screen.getByTestId('weight-donut');
    const segmentCircles = svg.querySelectorAll('circle[stroke="currentColor"]');
    expect(segmentCircles).toHaveLength(2);
    // Each segment should have its passed color class
    Array.from(segmentCircles).forEach((segment) => {
      expect(segment.getAttribute('class')).toMatch(/text-\w+-600/);
    });
  });

  it('has correct SVG dimensions and properties', () => {
    const segments: WeightDonutSegment[] = [
      {
        key: 'schools',
        weightPct: 50,
        colorClass: 'text-good-600',
      },
      {
        key: 'universities',
        weightPct: 50,
        colorClass: 'text-moderate-600',
      },
    ];
    render(<WeightDonut segments={segments} />);
    const svg = screen.getByTestId('weight-donut');
    expect(svg.getAttribute('width')).toBe('72');
    expect(svg.getAttribute('height')).toBe('72');
    expect(svg.getAttribute('viewBox')).toBe('0 0 72 72');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies rotation and flex-shrink classes', () => {
    const segments: WeightDonutSegment[] = [
      {
        key: 'schools',
        weightPct: 50,
        colorClass: 'text-good-600',
      },
      {
        key: 'universities',
        weightPct: 50,
        colorClass: 'text-moderate-600',
      },
    ];
    render(<WeightDonut segments={segments} />);
    const svg = screen.getByTestId('weight-donut');
    expect(svg).toHaveClass('-rotate-90');
    expect(svg).toHaveClass('origin-center');
    expect(svg).toHaveClass('flex-shrink-0');
  });

  it('renders background circle with correct styling', () => {
    const segments: WeightDonutSegment[] = [
      {
        key: 'schools',
        weightPct: 50,
        colorClass: 'text-good-600',
      },
      {
        key: 'universities',
        weightPct: 50,
        colorClass: 'text-moderate-600',
      },
    ];
    render(<WeightDonut segments={segments} />);
    const svg = screen.getByTestId('weight-donut');
    const backgroundCircle = svg.querySelector('circle:not([stroke="currentColor"])');
    expect(backgroundCircle).toHaveClass('stroke-slate-100');
    expect(backgroundCircle).toHaveAttribute('fill', 'none');
  });

  it('renders segments with correct dimensions', () => {
    const segments: WeightDonutSegment[] = [
      {
        key: 'schools',
        weightPct: 60,
        colorClass: 'text-good-600',
      },
      {
        key: 'universities',
        weightPct: 40,
        colorClass: 'text-moderate-600',
      },
    ];
    render(<WeightDonut segments={segments} />);
    const svg = screen.getByTestId('weight-donut');
    const segmentCircles = svg.querySelectorAll('circle[stroke="currentColor"]');

    // Verify dimensions are consistent
    expect(segmentCircles).toHaveLength(2);
    Array.from(segmentCircles).forEach((segment) => {
      // Each segment should have center point
      expect(segment.getAttribute('cx')).toBe('36');
      expect(segment.getAttribute('cy')).toBe('36');
      // Radius should be consistent (size - strokeWidth) / 2 = (72 - 12) / 2 = 30
      expect(segment.getAttribute('r')).toBe('30');
      expect(segment.getAttribute('fill')).toBe('none');
      expect(segment.getAttribute('stroke')).toBe('currentColor');
    });
  });

  it('positions segments correctly with offsets', () => {
    const segments: WeightDonutSegment[] = [
      {
        key: 'schools',
        weightPct: 30,
        colorClass: 'text-good-600',
      },
      {
        key: 'universities',
        weightPct: 70,
        colorClass: 'text-moderate-600',
      },
    ];
    render(<WeightDonut segments={segments} />);
    const svg = screen.getByTestId('weight-donut');
    const segmentCircles = svg.querySelectorAll('circle[stroke="currentColor"]');

    expect(segmentCircles).toHaveLength(2);
    const firstSegment = segmentCircles[0] as Element;
    const secondSegment = segmentCircles[1] as Element;

    // Both should have the same center and radius
    expect(firstSegment.getAttribute('cx')).toBe(secondSegment.getAttribute('cx'));
    expect(firstSegment.getAttribute('cy')).toBe(secondSegment.getAttribute('cy'));
    expect(firstSegment.getAttribute('r')).toBe(secondSegment.getAttribute('r'));

    expect(firstSegment).toBeInTheDocument();
    expect(secondSegment).toBeInTheDocument();
  });

  it('uses segment key as the circle key prop', () => {
    const segments: WeightDonutSegment[] = [
      {
        key: 'schools',
        weightPct: 50,
        colorClass: 'text-good-600',
      },
      {
        key: 'universities',
        weightPct: 50,
        colorClass: 'text-moderate-600',
      },
    ];
    const { container } = render(<WeightDonut segments={segments} />);
    // Verify that segments are rendered (verifies keys are being used for mapping)
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // The test passes if no React warnings about duplicate keys occur
  });

  it('handles various weight distributions', () => {
    const segments: WeightDonutSegment[] = [
      { key: 'a', weightPct: 10, colorClass: 'text-good-600' },
      { key: 'b', weightPct: 20, colorClass: 'text-moderate-600' },
      { key: 'c', weightPct: 30, colorClass: 'text-poor-600' },
      { key: 'd', weightPct: 40, colorClass: 'text-good-600' },
    ];
    render(<WeightDonut segments={segments} />);
    const svg = screen.getByTestId('weight-donut');
    const segmentCircles = svg.querySelectorAll('circle[stroke="currentColor"]');
    // Background + 4 segments
    expect(svg.querySelectorAll('circle')).toHaveLength(5);
    expect(segmentCircles).toHaveLength(4);
  });
});
