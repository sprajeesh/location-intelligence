import { NextRequest, NextResponse } from "next/server";
import { apiKeyHeaders } from "@/utils/apiAuth";
import { clientIpHeaders } from "@/utils/clientIp";

/** Starts a background PDF report job (forwards to FastAPI POST /reports). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.address || body.lat === undefined || body.lon === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: address, lat, lon" },
        { status: 400 },
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const response = await fetch(`${apiUrl}/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...apiKeyHeaders(),
        ...clientIpHeaders(request.headers),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail ?? `FastAPI responded with status ${response.status}` },
        { status: response.status },
      );
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error forwarding report request to FastAPI:", error);
    return NextResponse.json(
      { error: "Failed to reach report service" },
      { status: 502 },
    );
  }
}
