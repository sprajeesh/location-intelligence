/**
 * Sends browser errors to POST /api/client-errors, which the backend logs with
 * event=client.error next to the backend's own logs.
 *
 * Reports are best-effort and never throw. They carry only what the page already
 * knows: the error text, the stack, the page pathname, and the API path. Query
 * strings are removed, since they carry typed addresses. Request and response bodies
 * are never included.
 *
 * Each report travels with the correlation ID of the action that failed, so it lands
 * in the backend logs under that action. Errors outside any action get a fresh one.
 */

import { CORRELATION_ID_HEADER, createTraceId, REQUEST_ID_HEADER } from "@/lib/tracing";

export type ClientErrorKind = "error" | "unhandledrejection" | "boundary" | "api";

export interface ClientErrorInput {
  kind: ClientErrorKind;
  /** A thrown value. Its message and stack are used. */
  error?: unknown;
  /** Set directly for API failures, which have no thrown Error. */
  errorMessage?: string;
  /** API path without its query string. */
  endpoint?: string;
  status?: number;
  /** The failed call's request ID (X-Request-ID). */
  requestId?: string;
  /** The user action's correlation ID (X-Correlation-ID). */
  correlationId?: string;
  digest?: string;
}

export interface ClientErrorReport {
  kind: ClientErrorKind;
  errorMessage: string;
  stack?: string;
  route: string;
  endpoint?: string;
  status?: number;
  requestId?: string;
  digest?: string;
}

export const CLIENT_ERRORS_PATH = "/api/client-errors";

/** Per page load. A render loop can't flood the backend log. */
const MAX_REPORTS_PER_PAGE = 20;
const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_LENGTH = 4000;

let reportsSent = 0;

export function stripQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/** Removes query strings from any URL-looking text inside a message or stack. */
export function scrubUrls(text: string): string {
  return text.replace(/((?:https?:\/\/)?[^\s?#'"()]*\/[^\s?#'"()]*)[?#][^\s'"()]*/g, "$1");
}

/** Returns at most `max` characters. The backend rejects longer fields with a 422. */
function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function describe(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message || error.name,
      stack: error.stack,
    };
  }
  return { message: typeof error === "string" ? error : "Non-Error value thrown" };
}

export function buildReport(input: ClientErrorInput): ClientErrorReport {
  const described = input.error === undefined ? undefined : describe(input.error);
  const rawMessage = input.errorMessage ?? described?.message ?? "Unknown error";
  const stack = described?.stack;

  return {
    kind: input.kind,
    errorMessage: truncate(scrubUrls(rawMessage), MAX_MESSAGE_LENGTH),
    ...(stack ? { stack: truncate(scrubUrls(stack), MAX_STACK_LENGTH) } : {}),
    route: typeof window === "undefined" ? "" : stripQuery(window.location.pathname),
    ...(input.endpoint ? { endpoint: stripQuery(input.endpoint) } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.requestId ? { requestId: input.requestId } : {}),
    ...(input.digest ? { digest: input.digest } : {}),
  };
}

export function reportClientError(input: ClientErrorInput): void {
  if (typeof window === "undefined" || reportsSent >= MAX_REPORTS_PER_PAGE) return;
  reportsSent += 1;

  try {
    void fetch(CLIENT_ERRORS_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // This POST's own ID. The report's requestId names the failed call, not this one.
        [REQUEST_ID_HEADER]: createTraceId(),
        [CORRELATION_ID_HEADER]: input.correlationId ?? createTraceId(),
      },
      body: JSON.stringify(buildReport(input)),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Reporting must never break the page that is already failing.
  }
}

/** Test hook: clears the per-page budget between cases. */
export function resetErrorReportingForTests(): void {
  reportsSent = 0;
}
