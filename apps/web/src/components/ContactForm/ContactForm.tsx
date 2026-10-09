"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { InlineBanner } from "@/components/ui/InlineBanner";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

type Status = "idle" | "sending" | "sent" | "error";
type Field = "firstName" | "email" | "message";

const FIELD_CLASSES = "mt-1 w-full px-3";
const LABEL_CLASSES = "block text-sm font-medium text-ink";
// Same shape the API enforces (apps/api/app/api/contact.py).
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function ContactForm() {
  const t = useTranslations("contact");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const value = (name: string) => String(data.get(name) ?? "").trim();

    const next: Partial<Record<Field, string>> = {};
    if (!value("firstName")) next.firstName = t("errors.firstNameRequired");
    if (!value("email")) next.email = t("errors.emailRequired");
    else if (!EMAIL_RE.test(value("email"))) next.email = t("errors.emailInvalid");
    if (!value("message")) next.message = t("errors.messageRequired");
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setStatus("idle");
      return;
    }

    setStatus("sending");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: value("firstName"),
          lastName: value("lastName"),
          email: value("email"),
          message: value("message"),
        }),
      });
      if (!response.ok) throw new Error(String(response.status));
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  // Clears the edited field's stale error and any previous submission outcome.
  function clearFeedback(field: Field) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
    setStatus((prev) => (prev === "sending" ? prev : "idle"));
  }

  const fieldError = (field: Field) =>
    errors[field] && (
      <p id={`${field}-error`} className="mt-1 text-xs text-error-600">
        {errors[field]}
      </p>
    );
  const describedBy = (field: Field) => (errors[field] ? `${field}-error` : undefined);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={LABEL_CLASSES}>
            {t("firstName")} <span aria-hidden="true">*</span>
          </label>
          <Input
            size="lg"
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            maxLength={100}
            required
            aria-invalid={!!errors.firstName}
            aria-describedby={describedBy("firstName")}
            onChange={() => clearFeedback("firstName")}
            className={FIELD_CLASSES}
          />
          {fieldError("firstName")}
        </div>
        <div>
          <label htmlFor="lastName" className={LABEL_CLASSES}>
            {t("lastName")}
          </label>
          <Input
            size="lg"
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            maxLength={100}
            className={FIELD_CLASSES}
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className={LABEL_CLASSES}>
          {t("email")} <span aria-hidden="true">*</span>
        </label>
        <Input
          size="lg"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          aria-invalid={!!errors.email}
          aria-describedby={describedBy("email")}
          onChange={() => clearFeedback("email")}
          className={FIELD_CLASSES}
        />
        {fieldError("email")}
      </div>

      <div>
        <label htmlFor="message" className={LABEL_CLASSES}>
          {t("message")} <span aria-hidden="true">*</span>
        </label>
        <Textarea
          id="message"
          name="message"
          rows={6}
          maxLength={5000}
          required
          aria-invalid={!!errors.message}
          aria-describedby={describedBy("message")}
          onChange={() => clearFeedback("message")}
          className={FIELD_CLASSES}
        />
        {fieldError("message")}
      </div>

      <Button
        type="submit"
        variant="primary"
        label={status === "sending" ? t("submitting") : t("submit")}
        disabled={status === "sending"}
        className="w-full sm:w-auto"
      />

      <div aria-live="polite">
        {status === "sent" && <InlineBanner tone="success">{t("success")}</InlineBanner>}
        {status === "error" && <InlineBanner tone="error">{t("error")}</InlineBanner>}
      </div>
    </form>
  );
}
