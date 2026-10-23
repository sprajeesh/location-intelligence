import { useSyncExternalStore } from "react";

const DESKTOP_MIN_WIDTH = 768;

// One resize listener shared by every consumer (several containers call this
// hook), instead of one listener each. Subscribers are only notified when
// the desktop/mobile answer actually flips, not on every resize tick.
const listeners = new Set<() => void>();
let lastValue: boolean | null = null;
let attached = false;

const read = () => window.innerWidth >= DESKTOP_MIN_WIDTH;

const onResize = () => {
  const next = read();
  if (next === lastValue) return;
  lastValue = next;
  listeners.forEach((l) => l());
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!attached) {
    attached = true;
    lastValue = read();
    window.addEventListener("resize", onResize);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      attached = false;
      window.removeEventListener("resize", onResize);
    }
  };
}

// Server render and hydration both assume mobile, so the first client render
// matches the server HTML; the real value follows immediately after.
export function useIsDesktop() {
  return useSyncExternalStore(subscribe, read, () => false);
}
