import { reportClientError, stripQuery } from "@/lib/errorReporting";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/requestId";

/**
 * fetch() that sends an X-Request-ID and reports failed calls.
 *
 * A failure is a non-2xx response or a network error. Either one is reported with the
 * endpoint (query string removed), the status, and the request ID. The response is
 * returned unchanged, so callers keep their own handling. Network errors are rethrown.
 */
export async function trackedFetch(
  url: string,
  init: RequestInit = {},
  requestId: string = createRequestId(),
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set(REQUEST_ID_HEADER, requestId);
  const endpoint = stripQuery(url);

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch (error) {
    reportClientError({
      kind: "api",
      error,
      endpoint,
      status: 0,
      correlationId: requestId,
    });
    throw error;
  }

  if (!response.ok) {
    reportClientError({
      kind: "api",
      errorMessage: `API error: ${response.status}`,
      endpoint,
      status: response.status,
      correlationId: requestId,
    });
  }
  return response;
}
