"use client";

import { useEffect, useRef, useState } from "react";
import { formatScoreValue, getScoreColorClass } from "@/utils/scoreDisplay";

export interface ScoreRingProps {
  score: number | null;
  size?: number; // px diameter
}

const STROKE_WIDTH = 10;
const REVEAL_DURATION_MS = 1000;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * ScoreRing — circular progress ring around a score out of 100. Reuses
 * `getScoreColorClass`'s text-color classes for the progress stroke via
 * `currentColor`, so the ring always matches the score-color tiers used
 * elsewhere (category cards, etc.) with no separate color mapping.
 *
 * On mount (or whenever `score` changes) the ring fill and the displayed
 * number animate together from 0 up to the target, driven by a single
 * eased progress value so they never fall out of sync.
 */
export function ScoreRing({ score, size = 144 }: ScoreRingProps) {
  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = score === null ? 0 : Math.max(0, Math.min(100, score));
  const center = size / 2;

  const [displayScore, setDisplayScore] = useState(0);
  const frameRef = useRef<number | undefined>(undefined);
  const displayScoreRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplayScore(clamped);
      displayScoreRef.current = clamped;
      return;
    }

    const start = performance.now();
    const startValue = displayScoreRef.current;
    const tick = (now: number) => {
      const t = Math.min((now - start) / REVEAL_DURATION_MS, 1);
      const next = startValue + (clamped - startValue) * easeOutCubic(t);
      setDisplayScore(next);
      displayScoreRef.current = next;
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [clamped]);

  const dashOffset = circumference * (1 - displayScore / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 origin-center"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          className="stroke-white/25"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className={getScoreColorClass(score)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white tabular-nums">
          {formatScoreValue(score === null ? null : displayScore)}
        </span>
        <span className="text-xs font-medium text-white/70">/100</span>
      </div>
    </div>
  );
}

export default ScoreRing;
