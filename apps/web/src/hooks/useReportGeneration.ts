"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createReport,
  downloadReport,
  getReportStatus,
  type ReportRequest,
} from "@/services/api";

export type ReportGenerationState = "idle" | "generating" | "ready" | "failed";

export interface ReportGenerationOptions {
  /** Give up (state `failed`) after this long. Default 2 minutes. */
  maxWaitMs?: number;
  /** First poll delay; grows 1.5x per poll up to maxDelayMs. */
  initialDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULTS = { maxWaitMs: 120_000, initialDelayMs: 1_000, maxDelayMs: 3_000 };

/**
 * Starts a background PDF report job for `request`, polls it to completion
 * (with backoff, a timeout, and cleanup on unmount) and exposes the result.
 *
 * Any change to `request` (new address, radius, categories, ...) resets the
 * hook: a finished report only describes the analysis it was generated for.
 */
export function useReportGeneration(
  request: ReportRequest | null,
  options: ReportGenerationOptions = {},
) {
  const { maxWaitMs, initialDelayMs, maxDelayMs } = { ...DEFAULTS, ...options };
  const [state, setState] = useState<ReportGenerationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // Bumped on reset/unmount; an in-flight run whose id no longer matches stops.
  const runId = useRef(0);
  const inFlight = useRef(false);
  const requestRef = useRef(request);
  requestRef.current = request;
  const requestKey = request ? JSON.stringify(request) : null;

  const reset = useCallback(() => {
    runId.current += 1;
    inFlight.current = false;
    setState("idle");
    setError(null);
    setJobId(null);
  }, []);

  // New analysis target -> drop any in-flight/finished report.
  useEffect(() => {
    reset();
  }, [requestKey, reset]);

  useEffect(
    () => () => {
      runId.current += 1;
    },
    [],
  );

  const start = useCallback(async () => {
    const current = requestRef.current;
    if (!current || inFlight.current) return;

    inFlight.current = true;
    const myRun = ++runId.current;
    const cancelled = () => runId.current !== myRun;
    const fail = (message: string) => {
      if (cancelled()) return;
      inFlight.current = false;
      setError(message);
      setState("failed");
    };

    setState("generating");
    setError(null);
    setJobId(null);

    try {
      const created = await createReport(current);
      if (cancelled()) return;
      setJobId(created.jobId);

      const deadline = Date.now() + maxWaitMs;
      let delay = initialDelayMs;
      while (!cancelled()) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (cancelled()) return;
        const status = await getReportStatus(created.jobId);
        if (cancelled()) return;

        if (status.status === "ready") {
          inFlight.current = false;
          setState("ready");
          return;
        }
        if (status.status === "failed") {
          fail(status.error || "Report generation failed.");
          return;
        }
        if (Date.now() >= deadline) {
          fail("The report is taking too long. Please try again.");
          return;
        }
        delay = Math.min(Math.round(delay * 1.5), maxDelayMs);
      }
    } catch (err) {
      fail(err instanceof Error ? err.message : "Report generation failed.");
    }
  }, [maxWaitMs, initialDelayMs, maxDelayMs]);

  /** Saves the finished PDF through a temporary download link. */
  const download = useCallback(async () => {
    if (state !== "ready" || !jobId) return;
    const { blob, filename } = await downloadReport(jobId);
    const url = URL.createObjectURL(blob);
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      URL.revokeObjectURL(url);
    }
  }, [state, jobId]);

  return { state, error, jobId, start, download, reset };
}
