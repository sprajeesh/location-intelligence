"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { SheetSnap } from "@/store";
import { Button } from "@/components/ui/Button";
import { SURFACE_PANEL_CLASSES } from "@/components/ui/SurfacePanel";

export const PEEK_HEIGHT_PX = 104;
const HALF_RATIO = 0.5;
const FULL_RATIO = 0.92;
// A drag shorter than this is a tap on the handle, not a resize.
const TAP_SLOP_PX = 6;

const SNAP_ORDER: readonly SheetSnap[] = ["peek", "half", "full"];

interface DragState {
  startY: number;
  startHeight: number;
  lastY: number;
  lastT: number;
  velocity: number;
  moved: boolean;
}

export function snapHeights(viewportHeight: number): Record<SheetSnap, number> {
  return {
    peek: PEEK_HEIGHT_PX,
    half: Math.round(viewportHeight * HALF_RATIO),
    full: Math.round(viewportHeight * FULL_RATIO),
  };
}

/** Tapping the handle: peek -> half -> full, and full folds back to half. */
export function nextSnap(snap: SheetSnap): SheetSnap {
  return snap === "peek" ? "half" : snap === "half" ? "full" : "half";
}

/** The snap closest to a dragged height, nudged by flick velocity (px/ms, + = downward). */
export function nearestSnap(
  height: number,
  heights: Record<SheetSnap, number>,
  velocity = 0,
): SheetSnap {
  const projected = height - velocity * 120;
  return SNAP_ORDER.reduce((best, key) =>
    Math.abs(heights[key] - projected) < Math.abs(heights[best] - projected) ? key : best,
  );
}

export interface ResultsSheetProps {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  /** Reports the height (px) the sheet currently covers, so the map can keep its target visible. */
  onHeightChange?: (px: number) => void;
  /** Always-visible line next to the handle (what the user sees at "peek"). */
  summary?: ReactNode;
  /** Action pinned to the right of the summary row (e.g. Report). Rendered beside the drag handle, not inside it, so it stays tappable without moving the sheet. */
  headerAction?: ReactNode;
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * ResultsSheet — the mobile bottom sheet that sits over the map. Three snap
 * points (peek / half / full); the handle drags between them and a tap on it
 * cycles. Only the handle drags, so the results list inside keeps its normal
 * vertical scrolling. Children stay mounted at peek (hidden and inert) so
 * their state survives.
 */
export function ResultsSheet({
  snap,
  onSnapChange,
  onHeightChange,
  summary,
  headerAction,
  label,
  children,
  className = "",
}: ResultsSheetProps) {
  const [viewportHeight, setViewportHeight] = useState(
    typeof window === "undefined" ? 800 : window.innerHeight,
  );
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const drag = useRef<DragState | null>(null);

  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const heights = snapHeights(viewportHeight);
  const height = dragHeight ?? heights[snap];

  // Report only the settled snap height: the map camera doesn't need to chase
  // every pointer-move pixel, and this avoids a store write per frame of a drag.
  const settledHeight = heights[snap];
  useEffect(() => {
    onHeightChange?.(settledHeight);
  }, [settledHeight, onHeightChange]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      // A second finger must not overwrite the drag already in progress.
      if (drag.current) return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      drag.current = {
        startY: e.clientY,
        startHeight: heights[snap],
        lastY: e.clientY,
        lastT: e.timeStamp,
        velocity: 0,
        moved: false,
      };
    },
    [heights, snap],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = drag.current;
      if (!d) return;
      if (Math.abs(e.clientY - d.startY) > TAP_SLOP_PX) d.moved = true;
      if (!d.moved) return;
      const dt = Math.max(e.timeStamp - d.lastT, 1);
      d.velocity = (e.clientY - d.lastY) / dt;
      d.lastY = e.clientY;
      d.lastT = e.timeStamp;
      const next = d.startHeight - (e.clientY - d.startY);
      setDragHeight(Math.min(Math.max(next, heights.peek), heights.full));
    },
    [heights],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      if (d.moved) {
        const final = Math.min(
          Math.max(d.startHeight - (e.clientY - d.startY), heights.peek),
          heights.full,
        );
        setDragHeight(null);
        onSnapChange(nearestSnap(final, heights, d.velocity));
      } else {
        setDragHeight(null);
        onSnapChange(nextSnap(snap));
      }
    },
    [heights, onSnapChange, snap],
  );

  // Keyboard: Enter/Space already fire a click via the button; arrows step directly.
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      onSnapChange(snap === "peek" ? "half" : "full");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onSnapChange(snap === "full" ? "half" : "peek");
    }
  };

  const collapsed = snap === "peek" && dragHeight === null;

  return (
    <section
      aria-label={label}
      style={{ height }}
      className={`absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl ${SURFACE_PANEL_CLASSES.sidebar} pb-safe ${
        dragHeight === null ? "transition-[height] duration-200 ease-out motion-reduce:transition-none" : ""
      } ${className}`.trim()}
    >
      <div className="relative flex-shrink-0">
        <Button
          unstyled
          ariaLabel={label}
          aria-expanded={snap !== "peek"}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          // click would double-fire after pointerup, so the pointer handlers own taps;
          // Enter/Space (keyboard click with detail 0) are handled here.
          onClick={(e) => {
            if (e.detail === 0) onSnapChange(nextSnap(snap));
          }}
          className="w-full flex flex-col items-center gap-1 pt-2 pb-1 touch-none cursor-grab active:cursor-grabbing focus-ring-flush rounded-t-2xl"
        >
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-slate-300" />
          {summary && (
            <span
              className={`block w-full pl-4 text-left text-sm text-ink ${headerAction ? "min-h-11 pr-16" : "min-h-8 pr-4"}`}
            >
              {summary}
            </span>
          )}
        </Button>
        {headerAction && <div className="absolute right-3 bottom-1 z-10">{headerAction}</div>}
      </div>
      <div
        className={`flex-1 min-h-0 overflow-hidden ${collapsed ? "invisible" : ""}`}
        aria-hidden={collapsed}
        inert={collapsed}
      >
        {children}
      </div>
    </section>
  );
}

export default ResultsSheet;
