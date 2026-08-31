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
      return NextResponse.json(
        {
          routes: [
            {
              coordinates: [
                [srcLat, srcLon],
                [dstLat, dstLon],
              ],
              duration_s: 0,
              distance_m: 0,
              summary: "",
              steps: [],
            },
          ],
          fallback: true,
        },
        { status: 200 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Route handler error:", error);
    const searchParams = new URL(
      request.nextUrl.toString().split("?")[0] || "",
    ).searchParams;
    const srcLat = Number(searchParams.get("fromLat") || 0);
    const srcLon = Number(searchParams.get("fromLon") || 0);
    const dstLat = Number(searchParams.get("toLat") || 0);
    const dstLon = Number(searchParams.get("toLon") || 0);

    return NextResponse.json(
      {
        routes: [
          {
            coordinates: [
              [srcLat, srcLon],
              [dstLat, dstLon],
            ],
            duration_s: 0,
            distance_m: 0,
            summary: "",
            steps: [],
          },
        ],
        fallback: true,
      },
      { status: 200 },
    );
  }
}
