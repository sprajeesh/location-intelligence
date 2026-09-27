export interface WeightDonutSegment {
  key: string;
  weightPct: number;
  colorClass: string;
}

export interface WeightDonutProps {
  segments: WeightDonutSegment[];
}

/**
 * WeightDonut — compact multi-segment ring visualization showing relative weight
 * distribution. Each segment's arc represents its weight percentage, colored by
 * the passed colorClass. Renders nothing with fewer than 2 segments, where a
 * single-segment ring would carry no information.
 */
export function WeightDonut({ segments }: WeightDonutProps) {
  if (segments.length < 2) return null;

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
      {segments.map((segment) => {
        const length = (segment.weightPct / 100) * circumference;
        const dashOffset = -offset;
        offset += length;
        return (
          <circle
            key={segment.key}
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            stroke="currentColor"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={dashOffset}
            className={segment.colorClass}
          />
        );
      })}
    </svg>
  );
}

export default WeightDonut;
