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
}: ReportButtonProps) {
  const t = useTranslations();

  return (
    <Button
      variant="primary"
      onClick={onClick}
      disabled={disabled}
      className={`w-full justify-center gap-2 py-2.5 ${className}`}
      aria-busy={generating}
      ariaLabel={t(
        generating
          ? "results.report.generating"
          : ready
            ? "results.report.downloadLabel"
            : "results.report.generateLabel",
      )}
      title={t(
        generating
          ? "results.report.generating"
          : ready
            ? "results.report.downloadLabel"
            : "results.report.generateLabel",
      )}
    >
      {generating ? (
        <>
          <span
            aria-hidden="true"
            className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
          />
          <span>{t(fullLabel ? "results.report.generatingFull" : "results.report.generating")}</span>
        </>
      ) : (
        <>
          <FileDown size={16} strokeWidth={2} aria-hidden="true" />
          <span>
            {t(
              ready
                ? fullLabel
                  ? "results.report.downloadLabel"
                  : "results.report.download"
                : fullLabel
                  ? "results.report.generateLabel"
                  : "results.report.generate",
            )}
          </span>
        </>
      )}
    </Button>
  );
}

export default ReportButton;
