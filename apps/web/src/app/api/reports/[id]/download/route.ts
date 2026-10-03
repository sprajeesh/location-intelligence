import { NextRequest, NextResponse } from "next/server";
import { apiKeyHeaders } from "@/utils/apiAuth";
import { clientIpHeaders } from "@/utils/clientIp";

/** Finished report PDF (forwards to FastAPI GET /reports/{id}/download). */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/reports/[id]/download">,
) {
  try {
    const { id } = await ctx.params;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const response = await fetch(
      `${apiUrl}/reports/${encodeURIComponent(id)}/download`,
      {
        headers: { ...apiKeyHeaders(), ...clientIpHeaders(request.headers) },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.detail ?? `FastAPI responded with status ${response.status}` },
        { status: response.status },
      );
    }

    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          response.headers.get("content-disposition") ??
          'attachment; filename="intelligence-report.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Error downloading report from FastAPI:", error);
    return NextResponse.json(
      { error: "Failed to reach report service" },
      { status: 502 },
    );
  }
}
