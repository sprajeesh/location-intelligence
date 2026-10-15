"use client";

import { useTranslations } from "next-intl";
import { useLocationStore } from "@/store";
import { submitMapCorrection } from "@/services/api";
import type { MapCorrectionRequest } from "@/types/api";
import { createTraceId } from "@/lib/tracing";
import { invalidFieldsFrom } from "@/utils/mapCorrection";

/** Form fields the API can point a 422 at. */
export type MapCorrectionField =
  | "facilityType"
  | "name"
  | "address"
  | "reporterEmail"
  | "lat"
  | "lon"
  | "targetOsmId"
  | "reason";

/**
 * What a submission came to, as the form needs it. `pending`, `alreadyMapped` and
 * `alreadyRemoved` close the form; the others leave it open for the user to fix or retry.
 */
export type MapCorrectionOutcome =
  | { kind: "pending" }
  | { kind: "alreadyMapped" }
  | { kind: "alreadyRemoved" }
  | { kind: "invalid"; fieldErrors: MapCorrectionField[]; formError: boolean }
  | { kind: "rateLimited"; retryAfterSeconds?: number }
  | { kind: "error" };

/**
 * Submits a map correction (add or remove) and turns the response into a
 * MapCorrectionOutcome. Each submission gets a fresh correlation ID, so its log lines
 * group together. Shows toasts for the outcomes the user doesn't need the form for.
 *
 * Toasts never include the payload. The reporter email stays in the request only.
 */
export function useMapCorrection() {
  const t = useTranslations("mapCorrection");
  const addToast = useLocationStore((s) => s.addToast);
  const closeCorrection = useLocationStore((s) => s.closeCorrection);

  async function submit(payload: MapCorrectionRequest): Promise<MapCorrectionOutcome> {
    let result;
    try {
      result = await submitMapCorrection(payload, createTraceId());
    } catch {
      addToast({
        message: t("toasts.error"),
        type: "error",
        dismissible: true,
        action: { label: t("toasts.retry"), onClick: () => void submit(payload) },
      });
      return { kind: "error" };
    }

    const { status, body } = result;

    if (status === 202) {
      addToast({ message: t("toasts.pending"), type: "success", dismissible: true });
      closeCorrection();
      return { kind: "pending" };
    }

    if (status === 200) {
      const noop = (body as { status?: string } | null)?.status;
      if (noop === "already_removed") {
        addToast({ message: t("toasts.alreadyRemoved"), type: "info", dismissible: true });
        closeCorrection();
        return { kind: "alreadyRemoved" };
      }
      addToast({ message: t("toasts.alreadyMapped"), type: "info", dismissible: true });
      closeCorrection();
      return { kind: "alreadyMapped" };
    }

    if (status === 422) {
      return { kind: "invalid", ...invalidFieldsFrom(body) };
    }

    if (status === 429) {
      return { kind: "rateLimited", retryAfterSeconds: result.retryAfterSeconds };
    }

    addToast({
      message: t("toasts.error"),
      type: "error",
      dismissible: true,
      action: { label: t("toasts.retry"), onClick: () => void submit(payload) },
    });
    return { kind: "error" };
  }

  return { submit };
}
