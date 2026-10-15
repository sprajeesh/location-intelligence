"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useMapCorrection } from "@/hooks/useMapCorrection";
import type { MapCorrectionReason, MapCorrectionRemoveTarget } from "@/types/api";
import {
  buildRemovePayload,
  rateLimitMessage,
  validateRemoveReason,
} from "@/utils/mapCorrection";

export interface UseRemovePlaceFormResult {
  reason: MapCorrectionReason | null;
  website: string;
  reasonError: string | null;
  /** Translated form-level message (a 422, or a 429 wait). */
  serverError: string | null;
  sending: boolean;
  setReason: (reason: MapCorrectionReason) => void;
  setWebsite: (value: string) => void;
  submit: (event: FormEvent<HTMLFormElement>) => void;
}

/** State, validation and submission for the report-as-closed form. */
export function useRemovePlaceForm({
  target,
}: {
  target: MapCorrectionRemoveTarget;
}): UseRemovePlaceFormResult {
  const t = useTranslations("mapCorrection");
  const { submit: sendCorrection } = useMapCorrection();
  const [reason, setReasonState] = useState<MapCorrectionReason | null>(null);
  const [website, setWebsite] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function setReason(next: MapCorrectionReason) {
    setReasonState(next);
    setReasonError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    const key = validateRemoveReason(reason);
    setReasonError(key ? t(`errors.${key}`) : null);
    if (key || !reason) return;

    void send(reason);
  }

  async function send(chosen: MapCorrectionReason) {
    setSending(true);
    const outcome = await sendCorrection(buildRemovePayload(target, chosen, website));
    setSending(false);
    if (outcome.kind === "invalid") {
      setServerError(t("errors.formGeneric"));
    } else if (outcome.kind === "rateLimited") {
      setServerError(rateLimitMessage(outcome.retryAfterSeconds, t));
    }
  }

  return { reason, website, reasonError, serverError, sending, setReason, setWebsite, submit };
}
