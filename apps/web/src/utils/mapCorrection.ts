import type { MapCorrectionReason, MapCorrectionRequest } from "@/types/api";
import type { MapCorrectionField } from "@/hooks/useMapCorrection";

// Same shape the API enforces (apps/api/app/api/contact.py and the map corrections schema).
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const NAME_MAX_LENGTH = 200;
export const ADDRESS_MAX_LENGTH = 300;
export const EMAIL_MAX_LENGTH = 254;

export const MAP_CORRECTION_REASONS: MapCorrectionReason[] = ["closed", "not_found", "other"];

export type AddPlaceField = "facilityType" | "name" | "address" | "reporterEmail";

export interface AddPlaceValues {
  facilityType: string;
  name: string;
  address: string;
  reporterEmail: string;
  /** Honeypot. Always sent; a bot fills it in and the API answers 202 without storing. */
  website: string;
}

export const EMPTY_ADD_PLACE_VALUES: AddPlaceValues = {
  facilityType: "",
  name: "",
  address: "",
  reporterEmail: "",
  website: "",
};

/** Message keys (under `mapCorrection.errors`) for client-side validation failures. */
export type CorrectionErrorKey =
  | "facilityTypeRequired"
  | "nameTooLong"
  | "addressTooLong"
  | "emailInvalid"
  | "reasonRequired";

export function validateAddPlace(values: AddPlaceValues): Partial<Record<AddPlaceField, CorrectionErrorKey>> {
  const errors: Partial<Record<AddPlaceField, CorrectionErrorKey>> = {};
  const facilityType = values.facilityType.trim();
  const name = values.name.trim();
  const address = values.address.trim();
  const email = values.reporterEmail.trim();
  if (!facilityType) errors.facilityType = "facilityTypeRequired";
  if (name.length > NAME_MAX_LENGTH) errors.name = "nameTooLong";
  if (address.length > ADDRESS_MAX_LENGTH) errors.address = "addressTooLong";
  if (email && (email.length > EMAIL_MAX_LENGTH || !EMAIL_RE.test(email))) {
    errors.reporterEmail = "emailInvalid";
  }
  return errors;
}

/** Builds the add payload from trimmed values, leaving out blank optional fields. */
export function buildAddPayload(
  values: AddPlaceValues,
  point: { lat: number; lon: number },
): MapCorrectionRequest {
  const name = values.name.trim();
  const address = values.address.trim();
  const email = values.reporterEmail.trim();
  return {
    correctionType: "add",
    facilityType: values.facilityType.trim(),
    lat: point.lat,
    lon: point.lon,
    ...(name && { name }),
    ...(address && { address }),
    ...(email && { reporterEmail: email }),
    website: values.website,
  };
}

export function validateRemoveReason(reason: MapCorrectionReason | null): CorrectionErrorKey | null {
  return reason ? null : "reasonRequired";
}

export function buildRemovePayload(
  targetOsmId: string,
  reason: MapCorrectionReason,
  website: string,
): MapCorrectionRequest {
  return { correctionType: "remove", targetOsmId, reason, website };
}

/** Pulls field names out of a FastAPI 422 body. Errors without a known field are form-level. */
export function invalidFieldsFrom(body: unknown): {
  fieldErrors: MapCorrectionField[];
  formError: boolean;
} {
  const known = new Set<string>([
    "facilityType",
    "name",
    "address",
    "reporterEmail",
    "lat",
    "lon",
    "targetOsmId",
    "reason",
  ]);
  const detail = (body as { detail?: unknown } | null)?.detail;
  const fieldErrors: MapCorrectionField[] = [];
  let formError = false;
  if (!Array.isArray(detail)) return { fieldErrors, formError: true };
  for (const item of detail as { loc?: unknown[] }[]) {
    const field = item.loc?.[item.loc.length - 1];
    if (typeof field === "string" && known.has(field)) {
      fieldErrors.push(field as MapCorrectionField);
    } else {
      formError = true;
    }
  }
  return { fieldErrors, formError };
}

/** Whole minutes to show for a Retry-After wait, rounded up. */
export function retryMinutes(retryAfterSeconds: number): number {
  return Math.ceil(retryAfterSeconds / 60);
}

/** Message for a 429, with the wait when the API gave one. */
export function rateLimitMessage(
  retryAfterSeconds: number | undefined,
  t: (key: string, values?: Record<string, number>) => string,
): string {
  if (!retryAfterSeconds) return t("errors.rateLimitedUnknown");
  return t("errors.rateLimited", { minutes: retryMinutes(retryAfterSeconds) });
}

/** Copy of `obj` without `key`. Returns `obj` itself when the key is absent. */
export function withoutKey<T extends object>(obj: T, key: string): T {
  if (!(key in obj)) return obj;
  const { [key as keyof T]: _removed, ...rest } = obj;
  return rest as T;
}

/**
 * True when a map click landed on map UI (the toolbar) rather than on the map itself, so
 * it should not set a location.
 */
export function isMapChromeTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[role="toolbar"]') !== null;
}
