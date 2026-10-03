import { NextRequest, NextResponse } from "next/server";
import { apiKeyHeaders } from "@/utils/apiAuth";
import { clientIpHeaders } from "@/utils/clientIp";

/** Report job status (forwards to FastAPI GET /reports/{id}). */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/reports/[id]">,
) {
  try {
    const { id } = await ctx.params;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const response = await fetch(`${apiUrl}/reports/${encodeURIComponent(id)}`, {
      headers: { ...apiKeyHeaders(), ...clientIpHeaders(request.headers) },
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail ?? `FastAPI responded with status ${response.status}` },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching report status from FastAPI:", error);
    return NextResponse.json(
      { error: "Failed to reach report service" },
      { status: 502 },
    );
  }
}
