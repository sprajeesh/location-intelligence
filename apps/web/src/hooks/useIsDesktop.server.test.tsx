/**
 * @jest-environment node
 */
import { renderToString } from 'react-dom/server';
import { useIsDesktop } from './useIsDesktop';

function Probe() {
  return <span>{useIsDesktop() ? 'desktop' : 'mobile'}</span>;
}

describe('useIsDesktop on the server', () => {
  it('has no window, and renders as mobile without throwing', () => {
    expect(typeof window).toBe('undefined');
    expect(renderToString(<Probe />)).toContain('mobile');
  });
});
