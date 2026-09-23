import type { ReactNode } from "react";

/**
 * InlineBanner — small floating notice chip (e.g. an in-progress or error
 * message overlaid on the map). Centralizes the tone→color mapping that
 * MapContainer previously hand-rolled three times (once per notice).
 */

export type InlineBannerTone = "warning" | "error" | "neutral";

export interface InlineBannerProps {
  tone?: InlineBannerTone;
  /** Leading icon or indicator, already sized/colored by the caller (e.g. a lucide icon or a Spinner). */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<InlineBannerTone, string> = {
  warning: "border-warning-200 text-warning-800",
  error: "border-error-200 text-error-800",
  neutral: "border-slate-200 text-slate-700",
};

export function InlineBanner({ tone = "neutral", icon, children, className = "" }: InlineBannerProps) {
  return (
    <div
      className={`bg-white border shadow-card rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs ${TONE_CLASSES[tone]} ${className}`.trim()}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}

export default InlineBanner;
