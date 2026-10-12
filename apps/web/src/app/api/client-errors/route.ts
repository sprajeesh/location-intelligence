import { NextRequest, NextResponse } from "next/server";
import { apiKeyHeaders } from "@/utils/apiAuth";
import { clientIpHeaders } from "@/utils/clientIp";
import { traceHeaders } from "@/lib/tracing";

/**
 * Relays browser error reports (lib/errorReporting.ts) to the backend unchanged.
 * Failures are dropped: the page that reports them is already failing, and a second
 * error there helps nobody.
 */
export async function POST(request: NextRequest) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const response = await fetch(`${apiUrl}/client-errors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...apiKeyHeaders(),
        ...clientIpHeaders(request.headers),
        ...traceHeaders(request.headers),
      },
      body: await request.text(),
    });
    return new NextResponse(null, { status: response.status });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
