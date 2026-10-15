"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useMapCorrection, type MapCorrectionField } from "@/hooks/useMapCorrection";
import {
  EMPTY_ADD_PLACE_VALUES,
  buildAddPayload,
  rateLimitMessage,
  validateAddPlace,
  withoutKey,
  type AddPlaceField,
  type AddPlaceValues,
} from "@/utils/mapCorrection";

type FieldKey = Extract<MapCorrectionField, AddPlaceField>;

export interface UseAddPlaceFormResult {
  values: AddPlaceValues;
  /** Translated message per field, from validation or a 422. */
  errors: Partial<Record<AddPlaceField, string>>;
  /** Translated form-level message (a 422 that names no field, or a 429 wait). */
  formError: string | null;
  sending: boolean;
  setValue: (field: keyof AddPlaceValues, value: string) => void;
  submit: (event: FormEvent<HTMLFormElement>) => void;
}

/**
 * State, validation and submission for the add-a-missing-place form. The point comes from
 * the map; the view only renders what this returns.
 */
export function useAddPlaceForm({
  point,
}: {
  point: { lat: number; lon: number };
}): UseAddPlaceFormResult {
  const t = useTranslations("mapCorrection");
  const { submit: sendCorrection } = useMapCorrection();
  const [values, setValues] = useState<AddPlaceValues>(EMPTY_ADD_PLACE_VALUES);
  const [clientErrors, setClientErrors] = useState<Partial<Record<AddPlaceField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function setValue(field: keyof AddPlaceValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (field === "website") return;
    const key = field as AddPlaceField;
    setClientErrors((prev) => withoutKey(prev, key));
    setServerErrors((prev) => withoutKey(prev, key));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateAddPlace(values);
    const next: Partial<Record<AddPlaceField, string>> = {};
    for (const [field, key] of Object.entries(found) as [AddPlaceField, string][]) {
      next[field] = t(`errors.${key}`);
    }
    setClientErrors(next);
    setServerErrors({});
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    void send();
  }

  async function send() {
    setSending(true);
    const outcome = await sendCorrection(buildAddPayload(values, point));
    setSending(false);
    if (outcome.kind === "invalid") {
      const errors: Partial<Record<FieldKey, string>> = {};
      for (const field of outcome.fieldErrors) errors[field as FieldKey] = t("errors.invalidField");
      setServerErrors(errors);
      setFormError(outcome.formError ? t("errors.formGeneric") : null);
    } else if (outcome.kind === "rateLimited") {
      setFormError(rateLimitMessage(outcome.retryAfterSeconds, t));
    }
  }

  const errors: Partial<Record<AddPlaceField, string>> = {};
  for (const field of ["facilityType", "name", "address", "reporterEmail"] as AddPlaceField[]) {
    const message = clientErrors[field] ?? serverErrors[field as FieldKey];
    if (message) errors[field] = message;
  }

  return { values, errors, formError, sending, setValue, submit };
}
