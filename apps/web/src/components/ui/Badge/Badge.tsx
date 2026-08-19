import type { ReactNode } from "react";

/**
 * Badge — Small inline pill used for status text, counts, and highlights.
 */

export type BadgeTone = "neutral" | "success" | "count";

export interface BadgeProps {
  label: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500",
  success: "text-xs font-medium text-success-700 bg-success-50 px-1.5 py-0.5 rounded",
  count: "text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700",
};

export function Badge({ label, tone = "neutral", className = "" }: BadgeProps) {
  return <span className={`${TONE_CLASSES[tone]} ${className}`.trim()}>{label}</span>;
}

export default Badge;
