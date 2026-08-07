const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** All focusable, non-disabled descendants of `container`, in DOM order. */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export type FocusDirection = "forward" | "backward";

/**
 * The element a Tab/Shift+Tab press should move focus to, wrapping around
 * the ends of `focusable`. A `current` that isn't in `focusable` (e.g. focus
 * is still on the dialog's own root right after it mounts) is treated as
 * "before the start" for both directions, so forward lands on the first
 * element and backward wraps to the last.
 */
export function getNextFocusable(
  focusable: HTMLElement[],
  current: Element | null,
  direction: FocusDirection,
): HTMLElement | null {
  if (focusable.length === 0) return null;

  const index = current ? focusable.indexOf(current as HTMLElement) : -1;

  if (direction === "forward") {
    const next = index === -1 || index === focusable.length - 1 ? 0 : index + 1;
    return focusable[next] ?? null;
  }

  const prev = index <= 0 ? focusable.length - 1 : index - 1;
  return focusable[prev] ?? null;
}
