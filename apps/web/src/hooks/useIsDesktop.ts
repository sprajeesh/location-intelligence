import { useSyncExternalStore } from "react";

const DESKTOP_MIN_WIDTH = 768;

// One resize listener shared by every consumer (several containers call this
// hook), instead of one listener each. useSyncExternalStore compares the
// snapshot itself, so a resize that doesn't cross the breakpoint re-renders nothing.
const listeners = new Set<() => void>();
let attached = false;

const read = () =>
  typeof window === "undefined" ? false : window.innerWidth >= DESKTOP_MIN_WIDTH;

const onResize = () => {
  listeners.forEach((l) => l());
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!attached) {
    attached = true;
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
