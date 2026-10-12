/**
 * Request IDs that tie a browser failure to the backend log line for the same call.
 *
 * The browser mints the ID, the BFF forwards it, and the FastAPI backend echoes it
 * and tags its log lines with it (see apps/api/docs/LOGGING.md). A failed call's ID
 * is therefore the `request_id` to search for in backend logs.
 */

export const REQUEST_ID_HEADER = "X-Request-ID";

export function createRequestId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * For BFF route handlers: forwards the caller's request ID to the backend, if one was
 * sent. Returns no header otherwise, and the backend mints its own.
 */
export function requestIdHeaders(requestHeaders: Headers): HeadersInit {
  const id = requestHeaders.get(REQUEST_ID_HEADER);
  return id ? { [REQUEST_ID_HEADER]: id } : {};
}
