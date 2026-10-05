"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLocationStore } from "@/store";
import { useReportGeneration } from "@/hooks/useReportGeneration";
import type { ReportRequest } from "@/services/api";

export interface ReportButtonProps {
  /** The analysis to report on. null disables the button. */
  request: ReportRequest | null;
  className?: string;
  /** Use the full labels ("Generate report" / "Download report") instead of the short "Report" / "Download" -- for surfaces with room, like the results panel. */
  fullLabel?: boolean;
}

/**
 * Starts a background PDF intelligence report for the current analysis and,
 * once it is ready, offers it for download (button label + toast action).
 */
export function ReportButton({ request, className = "", fullLabel = false }: ReportButtonProps) {
  const t = useTranslations();
  const addToast = useLocationStore((s) => s.addToast);
  const { state, error, start, download } = useReportGeneration(request);

  const handleDownload = useCallback(() => {
    download().catch(() => {
      addToast({
        message: t("results.report.downloadFailedToast"),
        type: "error",
        dismissible: true,
      });
    });
  }, [download, addToast, t]);

  // Toast once per transition into ready/failed (not on every re-render).
  const previous = useRef(state);
  useEffect(() => {
    if (previous.current === state) return;
    previous.current = state;

    if (state === "ready") {
      addToast({
        message: t("results.report.readyToast"),
        type: "success",
        dismissible: true,
        action: { label: t("results.report.downloadAction"), onClick: handleDownload },
      });
    } else if (state === "failed") {
      addToast({
        message: error
          ? `${t("results.report.failedToast")} ${error}`
          : t("results.report.failedToast"),
        type: "error",
        dismissible: true,
        action: { label: t("results.report.retryAction"), onClick: () => void start() },
      });
    }
  }, [state, error, addToast, t, handleDownload, start]);

  const generating = state === "generating";
  const ready = state === "ready";

  return (
    <Button
      variant="primary"
      onClick={ready ? handleDownload : () => void start()}
      disabled={!request || generating}
      className={`gap-2 ${className}`}
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
