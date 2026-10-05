"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useLocationStore } from "@/store";
import { useReportGeneration } from "@/hooks/useReportGeneration";
import type { ReportRequest } from "@/services/api";

export interface UseReportActionResult {
  generating: boolean;
  ready: boolean;
  disabled: boolean;
  onClick: () => void;
}

/**
 * Manages report generation logic: triggers toast notifications on state transitions,
 * handles download errors, and returns button state/handler.
 *
 * Extracts all business logic from the ReportButton component so it remains
 * a pure presentational component.
 */
export function useReportAction(request: ReportRequest | null): UseReportActionResult {
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

  return {
    generating,
    ready,
    disabled: !request || generating,
    onClick: ready ? handleDownload : () => void start(),
  };
}
