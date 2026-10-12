/**
 * IDs that tie browser activity to backend log lines.
 *
 * - X-Request-ID: one per HTTP call. It identifies a single failed call.
 * - X-Correlation-ID: one per user action (an analyze run, a report, a search). An
 *   action can make several calls, and they all share this ID.
 *
 * The browser mints both. The BFF forwards them, and the FastAPI backend echoes them
 * and tags its log lines with them (see apps/api/docs/LOGGING.md).
 */

export const REQUEST_ID_HEADER = "X-Request-ID";
export const CORRELATION_ID_HEADER = "X-Correlation-ID";

export function createTraceId(): string {
  // randomUUID needs a secure context, so plain-http dev hosts fall back to random bytes.
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * For BFF route handlers: forwards whichever trace IDs the caller sent. The backend
 * mints any that are missing.
 */
export function traceHeaders(requestHeaders: Headers): HeadersInit {
  const headers: Record<string, string> = {};
  const requestId = requestHeaders.get(REQUEST_ID_HEADER);
  const correlationId = requestHeaders.get(CORRELATION_ID_HEADER);
  if (requestId) headers[REQUEST_ID_HEADER] = requestId;
  if (correlationId) headers[CORRELATION_ID_HEADER] = correlationId;
  return headers;
}
