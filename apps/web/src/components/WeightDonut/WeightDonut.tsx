import { getScoreColorClass } from "@/utils/scoreDisplay";
import type { ExplainItem } from "@/utils/scoreDisplay";

export interface WeightDonutProps {
  items: ExplainItem[];
}

/**
 * WeightDonut — compact multi-segment ring showing each scored item's share
 * of the overall weight, colored by that item's own score tier (so it reads
 * as "how much this counts, and how well it did" at a glance) exactly like
 * ScoreRing's tier coloring. Renders nothing with fewer than 2 scored items,
 * where a single-segment ring would carry no information.
 */
export function WeightDonut({ items }: WeightDonutProps) {
  const scored = items.filter((item) => item.status === "scored" && item.weightPct > 0);
  if (scored.length < 2) return null;

  const size = 72;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90 origin-center flex-shrink-0"
      aria-hidden="true"
      data-testid="weight-donut"
    >
      <circle cx={center} cy={center} r={radius} strokeWidth={strokeWidth} fill="none" className="stroke-slate-100" />
      {scored.map((item) => {
        const length = (item.weightPct / 100) * circumference;
        const dashOffset = -offset;
        offset += length;
        return (
          <circle
            key={item.key}
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            stroke="currentColor"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={dashOffset}
            className={getScoreColorClass(item.score)}
          />
        );
      })}
    </svg>
  );
}

export default WeightDonut;
