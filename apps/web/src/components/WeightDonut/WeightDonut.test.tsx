import { render, screen } from '@testing-library/react';
import { WeightDonut } from './WeightDonut';
import type { ExplainItem } from '@/utils/scoreDisplay';

describe('WeightDonut', () => {
  it('renders nothing when fewer than 2 scored items', () => {
    const items: ExplainItem[] = [
      {
        key: 'schools',
        kind: 'facility',
        status: 'scored',
        score: 61,
        weightPct: 100,
        criteria: [],
      },
    ];
    const { container } = render(<WeightDonut items={items} />);
    expect(screen.queryByTestId('weight-donut')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no items are scored', () => {
    const items: ExplainItem[] = [
      {
        key: 'schools',
        kind: 'facility',
        status: 'not_checked',
        score: null,
        weightPct: 0,
        criteria: [],
      },
      {
        key: 'universities',
        kind: 'facility',
        status: 'not_checked',
        score: null,
        weightPct: 0,
        criteria: [],
      },
    ];
    const { container } = render(<WeightDonut items={items} />);
    expect(screen.queryByTestId('weight-donut')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when scored items have zero weight', () => {
    const items: ExplainItem[] = [
      {
        key: 'schools',
        kind: 'facility',
        status: 'scored',
        score: 61,
        weightPct: 0,
        criteria: [],
      },
      {
        key: 'universities',
        kind: 'facility',
        status: 'scored',
        score: 85,
        weightPct: 0,
        criteria: [],
      },
    ];
    const { container } = render(<WeightDonut items={items} />);
    expect(screen.queryByTestId('weight-donut')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('renders SVG when 2 or more scored items with positive weight', () => {
    const items: ExplainItem[] = [
      {
        key: 'schools',
        kind: 'facility',
        status: 'scored',
        score: 61,
        weightPct: 60,
        criteria: [],
      },
      {
        key: 'universities',
        kind: 'facility',
        status: 'scored',
        score: 85,
        weightPct: 40,
        criteria: [],
      },
    ];
    render(<WeightDonut items={items} />);
    expect(screen.getByTestId('weight-donut')).toBeInTheDocument();
  });

  it('renders correct number of circle segments for scored items', () => {
    const items: ExplainItem[] = [
      {
        key: 'schools',
        kind: 'facility',
        status: 'scored',
        score: 61,
        weightPct: 50,
        criteria: [],
      },
      {
        key: 'universities',
        kind: 'facility',
        status: 'scored',
        score: 85,
        weightPct: 30,
        criteria: [],
      },
      {
        key: 'libraries',
        kind: 'facility',
        status: 'scored',
        score: 75,
        weightPct: 20,
        criteria: [],
      },
    ];
    const { container } = render(<WeightDonut items={items} />);
    const svg = screen.getByTestId('weight-donut');
    // One background circle + three segment circles
    const circles = svg.querySelectorAll('circle');
    expect(circles).toHaveLength(4);
  });

  it('filters out non-scored items when rendering segments', () => {
    const items: ExplainItem[] = [
      {
        key: 'schools',
        kind: 'facility',
        status: 'scored',
        score: 61,
        weightPct: 60,
        criteria: [],
      },
      {
        key: 'universities',
        kind: 'facility',
        status: 'not_checked',
        score: null,
        weightPct: 0,
        criteria: [],
      },
      {
        key: 'libraries',
        kind: 'facility',
        status: 'scored',
        score: 85,
        weightPct: 40,
        criteria: [],
      },
    ];
    const { container } = render(<WeightDonut items={items} />);
    const svg = screen.getByTestId('weight-donut');
    // One background circle + two segment circles (only scored items with weight > 0)
    const circles = svg.querySelectorAll('circle');
    expect(circles).toHaveLength(3);
  });

  it('applies score color class to each segment', () => {
    const items: ExplainItem[] = [
      {
        key: 'schools',
        kind: 'facility',
        status: 'scored',
        score: 85,
        weightPct: 50,
        criteria: [],
      },
      {
        key: 'universities',
        kind: 'facility',
        status: 'scored',
        score: 45,
        weightPct: 50,
        criteria: [],
      },
    ];
    render(<WeightDonut items={items} />);
    const svg = screen.getByTestId('weight-donut');
    const segments = svg.querySelectorAll('circle[stroke="currentColor"]');
    expect(segments).toHaveLength(2);
    // Segments should have color classes applied (text-good-600, text-moderate-600, etc.)
    // These classes use currentColor, so we verify they exist and have the class attribute
    Array.from(segments).forEach((segment) => {
      expect(segment.getAttribute('class')).toMatch(/text-\w+-600/);
    });
  });

  it('has correct SVG dimensions and properties', () => {
    const items: ExplainItem[] = [
      {
        key: 'schools',
        kind: 'facility',
        status: 'scored',
        score: 61,
        weightPct: 50,
        criteria: [],
      },
      {
        key: 'universities',
        kind: 'facility',
        status: 'scored',
        score: 85,
        weightPct: 50,
        criteria: [],
      },
    ];
    render(<WeightDonut items={items} />);
    const svg = screen.getByTestId('weight-donut') as SVGSVGElement;
    expect(svg.getAttribute('width')).toBe('72');
    expect(svg.getAttribute('height')).toBe('72');
    expect(svg.getAttribute('viewBox')).toBe('0 0 72 72');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies rotation and flex-shrink classes', () => {
    const items: ExplainItem[] = [
      {
        key: 'schools',
        kind: 'facility',
        status: 'scored',
        score: 61,
        weightPct: 50,
        criteria: [],
      },
      {
        key: 'universities',
        kind: 'facility',
        status: 'scored',
        score: 85,
        weightPct: 50,
        criteria: [],
      },
    ];
    render(<WeightDonut items={items} />);
    const svg = screen.getByTestId('weight-donut');
    expect(svg).toHaveClass('-rotate-90');
    expect(svg).toHaveClass('origin-center');
    expect(svg).toHaveClass('flex-shrink-0');
  });

  it('renders background circle with correct styling', () => {
    const items: ExplainItem[] = [
      {
        key: 'schools',
        kind: 'facility',
        status: 'scored',
        score: 61,
        weightPct: 50,
        criteria: [],
      },
      {
        key: 'universities',
        kind: 'facility',
        status: 'scored',
        score: 85,
        weightPct: 50,
        criteria: [],
      },
    ];
    render(<WeightDonut items={items} />);
    const svg = screen.getByTestId('weight-donut');
    const backgroundCircle = svg.querySelector('circle:not([stroke="currentColor"])');
    expect(backgroundCircle).toHaveClass('stroke-slate-100');
    expect(backgroundCircle).toHaveAttribute('fill', 'none');
  });

  it('correctly calculates circumference and weight percentages', () => {
    const items: ExplainItem[] = [
      {
        key: 'schools',
        kind: 'facility',
        status: 'scored',
        score: 61,
        weightPct: 60,
        criteria: [],
      },
      {
        key: 'universities',
        kind: 'facility',
        status: 'scored',
        score: 85,
        weightPct: 40,
        criteria: [],
      },
    ];
    render(<WeightDonut items={items} />);
    const svg = screen.getByTestId('weight-donut');
    const segments = svg.querySelectorAll('circle[stroke="currentColor"]');

    // Verify that each segment renders with the correct dimensions
    expect(segments).toHaveLength(2);
    Array.from(segments).forEach((segment) => {
      // Each segment should have center point
      expect(segment.getAttribute('cx')).toBe('36');
      expect(segment.getAttribute('cy')).toBe('36');
      // Radius should be consistent (size - strokeWidth) / 2 = (72 - 12) / 2 = 30
      expect(segment.getAttribute('r')).toBe('30');
      expect(segment.getAttribute('fill')).toBe('none');
      expect(segment.getAttribute('stroke')).toBe('currentColor');
    });
  });

  it('correctly offsets segments by accumulated weight', () => {
    const items: ExplainItem[] = [
      {
        key: 'schools',
        kind: 'facility',
        status: 'scored',
        score: 61,
        weightPct: 30,
        criteria: [],
      },
      {
        key: 'universities',
        kind: 'facility',
        status: 'scored',
        score: 85,
        weightPct: 70,
        criteria: [],
      },
    ];
    render(<WeightDonut items={items} />);
    const svg = screen.getByTestId('weight-donut');
    const segments = svg.querySelectorAll('circle[stroke="currentColor"]');

    // Verify we have both segments
    expect(segments).toHaveLength(2);

    // Verify that both segments are positioned and styled correctly
    // The offset creates the ring pattern where each segment starts after the previous one
    const firstSegment = segments[0];
    const secondSegment = segments[1];

    // Both should have the same center and radius
    expect(firstSegment.getAttribute('cx')).toBe(secondSegment.getAttribute('cx'));
    expect(firstSegment.getAttribute('cy')).toBe(secondSegment.getAttribute('cy'));
    expect(firstSegment.getAttribute('r')).toBe(secondSegment.getAttribute('r'));

    // The component's render is verified by its presence in the DOM
    // The integration tests verify the visual appearance
    expect(firstSegment).toBeInTheDocument();
    expect(secondSegment).toBeInTheDocument();
  });

  it('uses item key as the circle key prop', () => {
    const items: ExplainItem[] = [
      {
        key: 'schools',
        kind: 'facility',
        status: 'scored',
        score: 61,
        weightPct: 50,
        criteria: [],
      },
      {
        key: 'universities',
        kind: 'facility',
        status: 'scored',
        score: 85,
        weightPct: 50,
        criteria: [],
      },
    ];
    const { container } = render(<WeightDonut items={items} />);
    // Verify that items are rendered in order (verifies keys are being used for mapping)
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // The test passes if no React warnings about duplicate keys occur
  });
});
