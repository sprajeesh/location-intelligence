import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultsSheet, nearestSnap, nextSnap, snapHeights } from './ResultsSheet';

// jsdom has no PointerEvent, so fireEvent.pointer* would drop clientY.
if (!window.PointerEvent) {
  (window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = MouseEvent;
}

const heights = snapHeights(800); // peek 104, half 400, full 736

describe('snap helpers', () => {
  it('computes heights from the viewport', () => {
    expect(heights).toEqual({ peek: 104, half: 400, full: 736 });
  });

  it('cycles peek -> half -> full -> half', () => {
    expect(nextSnap('peek')).toBe('half');
    expect(nextSnap('half')).toBe('full');
    expect(nextSnap('full')).toBe('half');
  });

  it('snaps to the nearest height', () => {
    expect(nearestSnap(150, heights)).toBe('peek');
    expect(nearestSnap(380, heights)).toBe('half');
    expect(nearestSnap(700, heights)).toBe('full');
  });

  it('lets a downward flick carry past the nearest snap', () => {
    expect(nearestSnap(420, heights, 1.5)).toBe('peek');
    expect(nearestSnap(420, heights, -1.5)).toBe('full');
  });
});

describe('ResultsSheet', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  });

  const setup = (snap: 'peek' | 'half' | 'full' = 'half') => {
    const onSnapChange = jest.fn();
    const onHeightChange = jest.fn();
    render(
      <ResultsSheet snap={snap} onSnapChange={onSnapChange} onHeightChange={onHeightChange} label="Results" summary="Summary">
        <p>body</p>
      </ResultsSheet>,
    );
    return { onSnapChange, onHeightChange };
  };

  it('sizes to the snap and reports its height', () => {
    const { onHeightChange } = setup('half');
    expect(screen.getByRole('region', { name: 'Results' })).toHaveStyle({ height: '400px' });
    expect(onHeightChange).toHaveBeenCalledWith(400);
  });

  it('keeps children mounted but hidden and inert at peek', () => {
    setup('peek');
    const body = document.querySelector('p')!.parentElement!;
    expect(body).toHaveAttribute('aria-hidden', 'true');
    expect(body).toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: 'Results' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows children when not at peek', () => {
    setup('half');
    expect(screen.getByText('body')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Results' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('cycles on a tap of the handle', () => {
    const { onSnapChange } = setup('half');
    const handle = screen.getByRole('button', { name: 'Results' });
    fireEvent.pointerDown(handle, { clientY: 300, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 301, pointerId: 1 });
    expect(onSnapChange).toHaveBeenCalledWith('full');
  });

  it('snaps to the nearest point after a drag', () => {
    const { onSnapChange } = setup('half');
    const handle = screen.getByRole('button', { name: 'Results' });
    fireEvent.pointerDown(handle, { clientY: 400, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 700, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 700, pointerId: 1 });
    expect(onSnapChange).toHaveBeenCalledWith('peek');
  });

  it('steps with the arrow keys and cycles on Enter', async () => {
    const { onSnapChange } = setup('half');
    const handle = screen.getByRole('button', { name: 'Results' });
    handle.focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onSnapChange).toHaveBeenLastCalledWith('full');
    await userEvent.keyboard('{ArrowDown}');
    expect(onSnapChange).toHaveBeenLastCalledWith('peek');
    await userEvent.keyboard('{Enter}');
    expect(onSnapChange).toHaveBeenLastCalledWith('full');
  });
});
