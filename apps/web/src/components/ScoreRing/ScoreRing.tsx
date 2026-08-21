"use client";

import { formatScoreValue, getScoreColorClass } from "@/utils/scoreDisplay";

export interface ScoreRingProps {
  score: number | null;
  size?: number; // px diameter
}

const STROKE_WIDTH = 10;

/**
 * ScoreRing — circular progress ring around a score out of 100. Reuses
 * `getScoreColorClass`'s text-color classes for the progress stroke via
 * `currentColor`, so the ring always matches the score-color tiers used
 * elsewhere (category cards, etc.) with no separate color mapping.
 */
export function ScoreRing({ score, size = 144 }: ScoreRingProps) {
  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = score === null ? 0 : Math.max(0, Math.min(100, score));
  const dashOffset = circumference * (1 - clamped / 100);
  const center = size / 2;

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
          className={`${getScoreColorClass(score)} transition-[stroke-dashoffset] duration-500 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white tabular-nums">
          {formatScoreValue(score)}
        </span>
        <span className="text-xs font-medium text-white/70">/100</span>
      </div>
    </div>
  );
}

export default ScoreRing;
