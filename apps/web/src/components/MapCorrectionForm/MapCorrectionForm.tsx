"use client";

import { useId, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import type { MapCorrectionReason } from "@/types/api";
import type { AddPlaceValues } from "@/utils/mapCorrection";
import { MAP_CORRECTION_REASONS, EMAIL_MAX_LENGTH } from "@/utils/mapCorrection";
import { AddressAutocompleteField, type AddressAutocompleteProps } from "@/components/AddressAutocompleteField";
import { Button } from "@/components/ui/Button";
import { InlineBanner } from "@/components/ui/InlineBanner";
import { INPUT_BASE_CLASSES, Input } from "@/components/ui/Input";
import { Modal, ModalContent, ModalFooter, ModalHeader } from "@/components/ui/Modal";

const LABEL_CLASSES = "block text-sm font-medium text-ink";
const FIELD_CLASSES = "mt-1 w-full px-3";
const SELECT_CLASSES = `${INPUT_BASE_CLASSES} mt-1 w-full rounded-lg py-2.5 px-3 text-sm`;

export interface AddPlaceFormProps {
  facilityTypes: { id: string; label: string }[];
  values: AddPlaceValues;
  errors: Partial<Record<keyof AddPlaceValues, string>>;
  formError: string | null;
  sending: boolean;
  /** Address suggestions, from useAddressAutocomplete. The field's text is values.address. */
  address: AddressAutocompleteProps;
  onChange: (field: keyof AddPlaceValues, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

/** Presentational form for reporting a missing place. Holds no logic: state comes in as props. */
export function AddPlaceForm({
  facilityTypes,
  values,
  errors,
  formError,
  sending,
  address,
  onChange,
  onSubmit,
  onClose,
}: AddPlaceFormProps) {
  const t = useTranslations("mapCorrection");
  const tSearch = useTranslations();
  const titleId = useId();
  const consentId = useId();

  const fieldError = (id: string, message: string | undefined) =>
    message && (
      <p id={id} className="mt-1 text-xs text-error-600">
        {message}
      </p>
    );

  return (
    <Modal onClose={onClose} aria-labelledby={titleId}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col min-h-0">
        <ModalHeader
          title={t("add.title")}
          titleId={titleId}
          onClose={onClose}
          closeLabel={t("actions.close")}
        />
        <ModalContent className="space-y-4">
          <div>
            <label htmlFor="mc-facility-type" className={LABEL_CLASSES}>
              {t("add.facilityType")} <span aria-hidden="true">*</span>
            </label>
            <select
              id="mc-facility-type"
              name="facilityType"
              required
              value={values.facilityType}
              aria-invalid={!!errors.facilityType}
              aria-describedby={errors.facilityType ? "mc-facility-type-error" : undefined}
              onChange={(e) => onChange("facilityType", e.target.value)}
              className={SELECT_CLASSES}
            >
              <option value="" disabled>
                {t("add.facilityTypePlaceholder")}
              </option>
              {facilityTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
            {fieldError("mc-facility-type-error", errors.facilityType)}
          </div>

          <div>
            <label htmlFor="mc-name" className={LABEL_CLASSES}>
              {t("add.name")}
            </label>
            <Input
              size="lg"
              id="mc-name"
              name="name"
              autoComplete="off"
              value={values.name}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "mc-name-error" : undefined}
              onChange={(e) => onChange("name", e.target.value)}
              className={FIELD_CLASSES}
            />
            {fieldError("mc-name-error", errors.name)}
          </div>

          <AddressAutocompleteField
            id="mc-address"
            label={t("add.address")}
            value={values.address}
            placeholder={tSearch("search.placeholder")}
            error={errors.address}
            messages={{
              loading: tSearch("search.loading"),
              empty: tSearch("search.noResults"),
              error: tSearch("errors.generic"),
            }}
            {...address}
          />

          <div>
            <label htmlFor="mc-email" className={LABEL_CLASSES}>
              {t("add.email")}
            </label>
            <Input
              size="lg"
              id="mc-email"
              name="reporterEmail"
              type="email"
              autoComplete="email"
              maxLength={EMAIL_MAX_LENGTH}
              value={values.reporterEmail}
              aria-invalid={!!errors.reporterEmail}
              aria-describedby={[consentId, errors.reporterEmail ? "mc-email-error" : null]
                .filter(Boolean)
                .join(" ")}
              onChange={(e) => onChange("reporterEmail", e.target.value)}
              className={FIELD_CLASSES}
            />
            <p id={consentId} className="mt-1 text-xs text-slate-600">
              {t("add.consent")}
            </p>
            {fieldError("mc-email-error", errors.reporterEmail)}
          </div>

          <HoneypotField value={values.website} onChange={(v) => onChange("website", v)} />

          {formError && <InlineBanner tone="error">{formError}</InlineBanner>}
        </ModalContent>
        <ModalFooter>
          <Button type="button" variant="secondary" label={t("actions.cancel")} onClick={onClose} />
          <Button
            type="submit"
            variant="primary"
            label={sending ? t("actions.submitting") : t("actions.submit")}
            disabled={sending}
          />
        </ModalFooter>
      </form>
    </Modal>
  );
}

export interface RemovePlaceFormProps {
  targetName: string;
  reason: MapCorrectionReason | null;
  website: string;
  reasonError: string | null;
  serverError: string | null;
  sending: boolean;
  onReasonChange: (reason: MapCorrectionReason) => void;
  onWebsiteChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

const REASON_KEYS: Record<MapCorrectionReason, "closed" | "notFound" | "other"> = {
  closed: "closed",
  not_found: "notFound",
  other: "other",
};

/** Presentational form for reporting a place as closed. Holds no logic: state comes in as props. */
export function RemovePlaceForm({
  targetName,
  reason,
  website,
  reasonError,
  serverError,
  sending,
  onReasonChange,
  onWebsiteChange,
  onSubmit,
  onClose,
}: RemovePlaceFormProps) {
  const t = useTranslations("mapCorrection");
  const titleId = useId();

  return (
    <Modal onClose={onClose} aria-labelledby={titleId}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col min-h-0">
        <ModalHeader
          title={t("remove.title")}
          titleId={titleId}
          onClose={onClose}
          closeLabel={t("actions.close")}
        />
        <ModalContent className="space-y-4">
          <p className="text-sm">
            <span className="font-medium">{t("remove.target")}:</span> {targetName}
          </p>

          <fieldset aria-describedby={reasonError ? "mc-reason-error" : undefined}>
            <legend className="text-sm font-medium text-ink mb-2">
              {t("remove.reasonLegend")} <span aria-hidden="true">*</span>
            </legend>
            <div className="space-y-2">
              {MAP_CORRECTION_REASONS.map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name="reason"
                    value={option}
                    checked={reason === option}
                    onChange={() => onReasonChange(option)}
                    className="h-4 w-4 accent-primary-600"
                  />
                  {t(`remove.reasons.${REASON_KEYS[option]}`)}
                </label>
              ))}
            </div>
            {reasonError && (
              <p id="mc-reason-error" className="mt-1 text-xs text-error-600">
                {reasonError}
              </p>
            )}
          </fieldset>

          <HoneypotField value={website} onChange={onWebsiteChange} />

          {serverError && <InlineBanner tone="error">{serverError}</InlineBanner>}
        </ModalContent>
        <ModalFooter>
          <Button type="button" variant="secondary" label={t("actions.cancel")} onClick={onClose} />
          <Button
            type="submit"
            variant="primary"
            label={sending ? t("actions.submitting") : t("actions.submit")}
            disabled={sending}
          />
        </ModalFooter>
      </form>
    </Modal>
  );
}

/** Honeypot: hidden from sight, keyboard and screen readers. A filled value is not an error. */
function HoneypotField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = useTranslations("mapCorrection");
  return (
    <div className="hidden" aria-hidden="true">
      <label>
        {t("honeypot.label")}
        <Input
          size="lg"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
