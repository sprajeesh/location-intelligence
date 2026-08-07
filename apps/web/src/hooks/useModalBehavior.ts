"use client";

import { useEffect, useRef, type RefObject } from "react";
import { getFocusableElements, getNextFocusable } from "@/utils/focusTrap";

export interface UseModalBehaviorOptions {
  containerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}

/**
 * Escape-to-close, Tab/Shift+Tab focus trapping, focus-on-mount, and
 * focus-restore-on-unmount for a modal dialog. `onClose` is read through a
 * ref so the mount/unmount effect only runs once, regardless of the
 * caller's `onClose` identity changing across re-renders.
 */
export function useModalBehavior({ containerRef, onClose }: UseModalBehaviorOptions): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    containerRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const container = containerRef.current;
      if (!container) return;

      const focusable = getFocusableElements(container);
      const next = getNextFocusable(
        focusable,
        document.activeElement,
        e.shiftKey ? "backward" : "forward",
      );

      e.preventDefault();
      (next ?? container).focus();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      opener?.focus();
    };
  }, []);
}
