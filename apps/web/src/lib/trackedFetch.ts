import { reportClientError, stripQuery } from "@/lib/errorReporting";
import { CORRELATION_ID_HEADER, createTraceId, REQUEST_ID_HEADER } from "@/lib/tracing";

/**
 * fetch() that sends the request and correlation IDs, and reports failed calls.
 *
 * `correlationId` identifies the user action this call belongs to. Callers in an
 * action pass the action's ID. Standalone calls get their own, so every request has one.
 *
 * A failure is a non-2xx response or a network error. Either one is reported with the
 * endpoint (query string removed), the status, and both IDs. The response is returned
 * unchanged, so callers keep their own handling. Network errors are rethrown.
 */
export async function trackedFetch(
  url: string,
  init: RequestInit = {},
  correlationId: string = createTraceId(),
): Promise<Response> {
  const requestId = createTraceId();
  const headers = new Headers(init.headers);
  headers.set(REQUEST_ID_HEADER, requestId);
  headers.set(CORRELATION_ID_HEADER, correlationId);
  const endpoint = stripQuery(url);

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch (error) {
    reportClientError({ kind: "api", error, endpoint, status: 0, requestId, correlationId });
    throw error;
  }

  if (!response.ok) {
    reportClientError({
      kind: "api",
      errorMessage: `API error: ${response.status}`,
      endpoint,
      status: response.status,
      requestId,
      correlationId,
    });
  }
  return response;
}
