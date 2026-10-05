"use client";

import { useTranslations } from "next-intl";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface ReportButtonProps {
  /** Whether the report is currently being generated. */
  generating: boolean;
  /** Whether the report is ready for download. */
  ready: boolean;
  /** Whether the button should be disabled. */
  disabled: boolean;
  /** Callback when button is clicked. */
  onClick: () => void;
  /** Optional custom className. */
  className?: string;
  /** Use the full labels ("Generate report" / "Download report") instead of the short "Report" / "Download" -- for surfaces with room, like the results panel. */
  fullLabel?: boolean;
  /** Make the button full-width (default: true). Set to false for compact layouts like mobile controls bar. */
  fullWidth?: boolean;
}

/**
 * Pure presentational button for report generation/download.
 *
 * All business logic (state transitions, toast notifications, download handling)
 * is owned by the useReportAction hook in the container.
 */
export function ReportButton({
  generating,
  ready,
  disabled,
  onClick,
  className = "",
  fullLabel = false,
  fullWidth = true,
}: ReportButtonProps) {
  const t = useTranslations();

  const label = generating
    ? t(fullLabel ? "results.report.generatingFull" : "results.report.generating")
    : t(
        ready
          ? fullLabel
            ? "results.report.downloadLabel"
            : "results.report.download"
          : fullLabel
            ? "results.report.generateLabel"
            : "results.report.generate",
      );

  if (generating) {
    return (
      <Button
        variant="primary"
        onClick={onClick}
        disabled={disabled}
        className={`${fullWidth ? "w-full justify-center" : ""} gap-2 ${className}`}
        aria-busy={generating}
        ariaLabel={label}
        title={label}
      >
        <span
          aria-hidden="true"
          className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
        />
        <span>{label}</span>
      </Button>
    );
  }

  return (
    <Button
      icon={FileDown}
      label={label}
      variant="primary"
      onClick={onClick}
      disabled={disabled}
      className={`${fullWidth ? "w-full justify-center" : ""} ${className}`}
      ariaLabel={label}
      title={label}
    />
  );
}

export default ReportButton;
