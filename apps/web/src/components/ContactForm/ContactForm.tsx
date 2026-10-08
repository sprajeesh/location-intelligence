"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { INPUT_BASE_CLASSES } from "@/components/ui/Input";

type Status = "idle" | "sending" | "sent" | "error";
type Field = "firstName" | "email" | "message";

const FIELD_CLASSES = `${INPUT_BASE_CLASSES} w-full rounded-lg px-3 py-2.5 text-sm`;
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
          <input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            maxLength={100}
            required
            aria-invalid={!!errors.firstName}
            aria-describedby={describedBy("firstName")}
            className={`${FIELD_CLASSES} mt-1`}
          />
          {fieldError("firstName")}
        </div>
        <div>
          <label htmlFor="lastName" className={LABEL_CLASSES}>
            {t("lastName")}
          </label>
          <input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            maxLength={100}
            className={`${FIELD_CLASSES} mt-1`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className={LABEL_CLASSES}>
          {t("email")} <span aria-hidden="true">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          aria-invalid={!!errors.email}
          aria-describedby={describedBy("email")}
          className={`${FIELD_CLASSES} mt-1`}
        />
        {fieldError("email")}
      </div>

      <div>
        <label htmlFor="message" className={LABEL_CLASSES}>
          {t("message")} <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          maxLength={5000}
          required
          aria-invalid={!!errors.message}
          aria-describedby={describedBy("message")}
          className={`${FIELD_CLASSES} mt-1`}
        />
        {fieldError("message")}
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
      >
        {status === "sending" ? t("submitting") : t("submit")}
      </button>

      <div aria-live="polite">
        {status === "sent" && <p className="text-sm text-success-700">{t("success")}</p>}
        {status === "error" && <p className="text-sm text-error-600">{t("error")}</p>}
      </div>
    </form>
  );
}
