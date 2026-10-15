import { NextRequest, NextResponse } from "next/server";
import { apiKeyHeaders } from "@/utils/apiAuth";
import { clientIpHeaders } from "@/utils/clientIp";
import { traceHeaders } from "@/lib/tracing";

// Matches the other write-path proxies: the API's own Overpass lookup can take a few seconds.
const UPSTREAM_TIMEOUT_MS = 15_000;

/**
 * Forwards a map correction to FastAPI POST /map-corrections. The status and body
 * are relayed unchanged, so the client sees the API's 422 field errors and 202/200
 * outcomes as they are. `Retry-After` is passed through for 429.
 */
export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const response = await fetch(`${apiUrl}/map-corrections`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...apiKeyHeaders(),
        ...clientIpHeaders(request.headers),
        ...traceHeaders(request.headers),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const data = await response.json().catch(() => ({}));
    const headers: Record<string, string> = {};
    const retryAfter = response.headers.get("Retry-After");
    if (retryAfter) headers["Retry-After"] = retryAfter;
    return NextResponse.json(data, { status: response.status, headers });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return NextResponse.json({ error: "Map corrections service timed out" }, { status: 504 });
    }
    console.error("Error forwarding map correction to FastAPI:", error);
    return NextResponse.json({ error: "Failed to reach map corrections service" }, { status: 502 });
  }
}
