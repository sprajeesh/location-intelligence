import { NextRequest, NextResponse } from "next/server";
import type { RouteOption, RouteStep } from "@/types/api";

const LOCAL_OSRM = process.env.OSRM_URL || "http://localhost:5000";
const PUBLIC_OSRM = "https://router.project-osrm.org";

const OSRM_PROFILE: Record<string, string> = {
  driving: "car",
  walking: "foot",
  cycling: "bike",
};

interface OsrmManeuver {
  type: string;
  modifier?: string;
}

interface OsrmStep {
  name: string;
  distance: number;
  duration: number;
  maneuver: OsrmManeuver;
}

interface OsrmLeg {
  summary: string;
  steps: OsrmStep[];
}

interface OsrmRoute {
  duration: number;
  distance: number;
  geometry: { coordinates: [number, number][] };
  legs: OsrmLeg[];
}

interface OsrmResponse {
  code: string;
  routes?: OsrmRoute[];
}

function buildInstruction(maneuver: OsrmManeuver, street: string): string {
  const name = street || "unnamed road";
  switch (maneuver.type) {
    case "depart":
      return `Head ${maneuver.modifier ?? "straight"} on ${name}`;
    case "arrive":
      return "Arrive at destination";
    case "turn":
      if (maneuver.modifier === "left") return `Turn left onto ${name}`;
      if (maneuver.modifier === "right") return `Turn right onto ${name}`;
      if (maneuver.modifier === "slight left") return `Keep left onto ${name}`;
      if (maneuver.modifier === "slight right")
        return `Keep right onto ${name}`;
      if (maneuver.modifier === "sharp left")
        return `Sharp left onto ${name}`;
      if (maneuver.modifier === "sharp right")
        return `Sharp right onto ${name}`;
      return `Continue straight on ${name}`;
    case "roundabout":
    case "rotary":
      return `Take the roundabout onto ${name}`;
    case "merge":
      return `Merge onto ${name}`;
    case "on ramp":
      return `Take the ramp onto ${name}`;
    case "off ramp":
      return `Take the exit onto ${name}`;
    case "fork":
      return maneuver.modifier?.includes("left")
        ? `Keep left onto ${name}`
        : `Keep right onto ${name}`;
    case "end of road":
      return maneuver.modifier === "left"
        ? `Turn left onto ${name}`
        : `Turn right onto ${name}`;
    case "new name":
    case "continue":
      return `Continue on ${name}`;
    default:
      return `Proceed on ${name}`;
  }
}

function parseRoutes(data: OsrmResponse): RouteOption[] {
  if (data.code !== "Ok" || !data.routes?.length) return [];

  return data.routes.map((route) => {
    const leg = route.legs[0];
    const steps: RouteStep[] = (leg?.steps ?? []).map((step) => ({
      instruction: buildInstruction(step.maneuver, step.name),
      name: step.name,
      distanceM: step.distance,
      durationS: step.duration,
    }));

    return {
      durationS: route.duration,
      distanceM: route.distance,
      summary: leg?.summary ?? "",
      coordinates: route.geometry.coordinates.map(
        ([lon, lat]) => [lat, lon] as [number, number],
      ),
      steps,
    };
  });
}

async function fetchOsrmRoutes(
  baseUrl: string,
  profile: string,
  coords: string,
): Promise<RouteOption[] | null> {
  const url = `${baseUrl}/route/v1/${profile}/${coords}?overview=full&geometries=geojson&alternatives=3&steps=true`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  const data: OsrmResponse = await response.json();
  const routes = parseRoutes(data);
  return routes.length ? routes : null;
}

export async function GET(request: NextRequest) {
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

  const profile = OSRM_PROFILE[mode] ?? "car";
  const coords = `${srcLon},${srcLat};${dstLon},${dstLat}`;

  let routes: RouteOption[] | null = null;
  let fallback = false;

  // For driving, try local OSRM first (likely faster); other modes go straight to public
  if (mode === "driving") {
    try {
      routes = await fetchOsrmRoutes(LOCAL_OSRM, profile, coords);
    } catch {
      // Local OSRM unavailable — fall through to public
    }
  }

  if (!routes) {
    try {
      routes = await fetchOsrmRoutes(PUBLIC_OSRM, profile, coords);
      fallback = mode !== "driving" ? false : true;
    } catch {
      // Both failed
    }
  }

  if (!routes) {
    return NextResponse.json({
      routes: [
        {
          coordinates: [
            [srcLat, srcLon],
            [dstLat, dstLon],
          ],
          durationS: 0,
          distanceM: 0,
          summary: "",
          steps: [],
        },
      ],
      fallback: true,
    });
  }

  return NextResponse.json({ routes, fallback });
}
