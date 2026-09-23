/**
 * Spinner — small inline loading indicator. Centralizes the spinning-ring
 * markup that was previously hand-copied (with drifting sizes/colors) in
 * MapContainer, SearchBar, and RoutePanel.
 */

export type SpinnerSize = "xs" | "sm" | "md";
export type SpinnerTone = "primary" | "neutral";

export interface SpinnerProps {
  size?: SpinnerSize;
  tone?: SpinnerTone;
  className?: string;
}

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-6 h-6",
};

const TONE_CLASSES: Record<SpinnerTone, string> = {
  primary: "border-slate-200 border-t-primary-500",
  neutral: "border-slate-300 border-t-slate-600",
};

export function Spinner({ size = "sm", tone = "primary", className = "" }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]} border-2 rounded-full animate-spin ${className}`.trim()}
    />
  );
}

export default Spinner;
