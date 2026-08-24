import '@testing-library/jest-dom';

// jsdom doesn't implement matchMedia at all. Report `prefers-reduced-motion:
// reduce` as matched so animation-driving code deterministically takes its
// reduced-motion (instant, final-value) branch in tests instead of racing a
// requestAnimationFrame loop against synchronous assertions.
window.matchMedia =
  window.matchMedia ||
  function matchMedia(query: string): MediaQueryList {
    return {
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList;
  };
