import { render, screen } from '@testing-library/react';
import { ScoreRing } from './ScoreRing';

const DEFAULT_SIZE = 144;
const STROKE_WIDTH = 10;

/** Mirrors ScoreRing's internal circumference math for a given size. */
function circumferenceFor(size: number) {
  const radius = (size - STROKE_WIDTH) / 2;
  return 2 * Math.PI * radius;
}

function getCircles(container: HTMLElement) {
  const circles = Array.from(container.querySelectorAll('circle'));
  const [track, progress] = circles;
  if (!track || !progress) {
    throw new Error(`Expected 2 circles, found ${circles.length}`);
  }
  return { track, progress };
}

describe('ScoreRing', () => {
  describe('Rendering', () => {
    it('renders the rounded score value', () => {
      render(<ScoreRing score={72.4} />);
      expect(screen.getByText('72')).toBeInTheDocument();
    });

    it('renders the "/100" label', () => {
      render(<ScoreRing score={72.4} />);
      expect(screen.getByText('/100')).toBeInTheDocument();
    });

    it('renders an em dash when score is null', () => {
      render(<ScoreRing score={null} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('sizes the svg from the size prop', () => {
      const { container } = render(<ScoreRing score={50} size={200} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '200');
      expect(svg).toHaveAttribute('height', '200');
    });

    it('defaults to a 144px ring', () => {
      const { container } = render(<ScoreRing score={50} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', String(DEFAULT_SIZE));
      expect(svg).toHaveAttribute('height', String(DEFAULT_SIZE));
    });
  });

  describe('Progress fill', () => {
    it('fully closes the ring at 100', () => {
      const { container } = render(<ScoreRing score={100} />);
      const { progress } = getCircles(container);
      expect(Number(progress.getAttribute('stroke-dashoffset'))).toBeCloseTo(0);
    });

    it('leaves no visible arc at 0', () => {
      const { container } = render(<ScoreRing score={0} />);
      const { progress } = getCircles(container);
      const circumference = circumferenceFor(DEFAULT_SIZE);
      expect(Number(progress.getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference);
    });

    it('leaves no visible arc when score is null', () => {
      const { container } = render(<ScoreRing score={null} />);
      const { progress } = getCircles(container);
      const circumference = circumferenceFor(DEFAULT_SIZE);
      expect(Number(progress.getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference);
    });

    it('fills proportionally to the score', () => {
      const { container } = render(<ScoreRing score={50} />);
      const { progress } = getCircles(container);
      const circumference = circumferenceFor(DEFAULT_SIZE);
      expect(Number(progress.getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference * 0.5);
    });

    it('clamps scores above 100 to a fully closed ring', () => {
      const { container } = render(<ScoreRing score={150} />);
      const { progress } = getCircles(container);
      expect(Number(progress.getAttribute('stroke-dashoffset'))).toBeCloseTo(0);
    });

    it('clamps negative scores to no visible arc', () => {
      const { container } = render(<ScoreRing score={-20} />);
      const { progress } = getCircles(container);
      const circumference = circumferenceFor(DEFAULT_SIZE);
      expect(Number(progress.getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference);
    });
  });

  describe('Tier coloring', () => {
    it('colors the progress circle green for a good score (>=70)', () => {
      const { container } = render(<ScoreRing score={85} />);
      const { progress } = getCircles(container);
      expect(progress).toHaveClass('text-success-600');
    });

    it('colors the progress circle amber for a moderate score (>=50)', () => {
      const { container } = render(<ScoreRing score={55} />);
      const { progress } = getCircles(container);
      expect(progress).toHaveClass('text-warning-600');
    });

    it('colors the progress circle red for a poor score (<50)', () => {
      const { container } = render(<ScoreRing score={30} />);
      const { progress } = getCircles(container);
      expect(progress).toHaveClass('text-error-600');
    });

    it('colors the progress circle gray when unscored (null)', () => {
      const { container } = render(<ScoreRing score={null} />);
      const { progress } = getCircles(container);
      expect(progress).toHaveClass('text-slate-400');
    });

    it('keeps the track circle a constant translucent white regardless of score', () => {
      const { container: goodContainer } = render(<ScoreRing score={90} />);
      const { container: poorContainer } = render(<ScoreRing score={10} />);
      expect(getCircles(goodContainer).track).toHaveClass('stroke-white/25');
      expect(getCircles(poorContainer).track).toHaveClass('stroke-white/25');
    });
  });
});
