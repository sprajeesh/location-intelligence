import { NextRequest, NextResponse } from "next/server";
import { apiKeyHeaders } from "@/utils/apiAuth";
import { clientIpHeaders } from "@/utils/clientIp";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const fromLat = searchParams.get("fromLat");
    const fromLon = searchParams.get("fromLon");
    const toLat = searchParams.get("toLat");
    const toLon = searchParams.get("toLon");
    const mode = searchParams.get("mode") ?? "driving";

    if (!fromLat || !fromLon || !toLat || !toLon) {
      return NextResponse.json(
        { error: "Missing required params: fromLat, fromLon, toLat, toLon" },
        { status: 400 },
      );
    }

    const srcLat = Number(fromLat);
    const srcLon = Number(fromLon);
    const dstLat = Number(toLat);
    const dstLon = Number(toLon);

    const isInvalidCoord =
      !Number.isFinite(srcLat) ||
      !Number.isFinite(srcLon) ||
      !Number.isFinite(dstLat) ||
      !Number.isFinite(dstLon) ||
      Math.abs(srcLat) > 90 ||
      Math.abs(srcLon) > 180 ||
      Math.abs(dstLat) > 90 ||
      Math.abs(dstLon) > 180;

    if (isInvalidCoord) {
      return NextResponse.json(
        { error: "Invalid coordinate values" },
        { status: 400 },
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const backendUrl = `${apiUrl}/route`;

    const params = new URLSearchParams({
      fromLat: String(srcLat),
      fromLon: String(srcLon),
      toLat: String(dstLat),
      toLon: String(dstLon),
      mode,
    });

    const response = await fetch(`${backendUrl}?${params}`, {
      headers: {
        "Content-Type": "application/json",
        ...apiKeyHeaders(),
        ...clientIpHeaders(request.headers),
      },
    });

    if (!response.ok) {
      console.error(`Route service returned ${response.status}`);
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Route handler error:", error);
    return NextResponse.json(
      { error: "Routing service unavailable" },
      { status: 502 },
    );
  }
}
