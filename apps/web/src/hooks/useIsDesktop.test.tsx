import { act, renderHook } from '@testing-library/react';
import { useIsDesktop } from './useIsDesktop';

const setWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
};

describe('useIsDesktop', () => {
  afterEach(() => setWidth(1024));

  it('is true at and above 768px and false below', () => {
    setWidth(1024);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);
    setWidth(767);
    expect(result.current).toBe(false);
    setWidth(768);
    expect(result.current).toBe(true);
  });

  it('shares a single resize listener across consumers and removes it when unused', () => {
    setWidth(1024);
    const add = jest.spyOn(window, 'addEventListener');
    const remove = jest.spyOn(window, 'removeEventListener');
    const a = renderHook(() => useIsDesktop());
    const b = renderHook(() => useIsDesktop());
    expect(add.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(1);
    a.unmount();
    expect(remove.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(0);
    b.unmount();
    expect(remove.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(1);
    add.mockRestore();
    remove.mockRestore();
  });

  it('does not re-render subscribers on resize ticks that do not cross the breakpoint', () => {
    setWidth(1200);
    let renders = 0;
    renderHook(() => {
      renders += 1;
      return useIsDesktop();
    });
    const before = renders;
    setWidth(1100);
    setWidth(900);
    expect(renders).toBe(before);
  });
});
