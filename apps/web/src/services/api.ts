/**
 * Typed fetch wrappers for BFF API routes.
 * These functions call the Next.js API routes (localhost:3000/api/*),
 * which in turn forward requests to the FastAPI backend.
 */

import {
  AddressResult,
  AnalyzeResponse,
  CategoryId,
  Category,
  FacilityStatus,
  RouteResult,
  RouteTransportMode,
} from "@/types/api";
import type { HazardCellCollection, HazardResult, HazardSubScore } from "@/types/hazard";
import type { ParcelFeature } from "@/types/parcel";

/**
 * Base URL for API calls. Uses NEXT_PUBLIC_API_URL if set,
 * falls back to localhost:3000 (the frontend's own BFF routes).
 */
const getBaseUrl = (): string => {
  // In a browser environment, we use relative URLs (the Next.js BFF routes)
  if (typeof window !== "undefined") {
    return "";
  }
  // In SSR/server context, use the environment variable or localhost
  return process.env.NEXT_PUBLIC_APP_ORIGIN || "http://localhost:3000";
};

/**
 * Error class for API errors.
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Generic fetch wrapper with error handling.
 */
async function fetchJson<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.error ||
        `API error: ${response.status} ${response.statusText}`;
      throw new ApiError(response.status, errorMessage);
    }

    const data: T = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network or parsing error
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    throw new ApiError(0, `Failed to fetch ${endpoint}: ${message}`, error);
  }
}

/**
 * Search for addresses by query string.
 * Calls GET /api/search/address?q=...
 *
 * @param q - Search query (e.g., "123 Queen St, Auckland")
 * @returns Array of address suggestions
 * @throws ApiError on network or server error
 */
export async function searchAddress(q: string): Promise<AddressResult[]> {
  if (!q.trim()) {
    return [];
  }

  const endpoint = `/search/address?q=${encodeURIComponent(q)}`;
  return fetchJson<AddressResult[]>(endpoint, { method: "GET" });
}

/**
 * Request for location analysis.
 * Must include: address, lat, lon, radiusKm, distanceMode.
 * `categories` is optional — omit it to let the backend use its
 * DB-configured default facility set; pass an explicit list (or `[]`) to
 * override it.
 */
export interface AnalyzeRequest {
  address: string;
  lat: number;
  lon: number;
  radiusKm: number;
  categories?: string[];
  categoryWeights?: Record<string, number>;
  distanceMode: "driving" | "walking";
}

/**
 * Wire-format types — reflect exactly what FastAPI serializes for
 * POST /location/analyze. FastAPI's default response serialization uses
 * `by_alias=True`, so FacilityScoreResult's aliased fields go over the
 * wire as snake_case (facility_type, nearest_distance_km) even though the
 * Pydantic model's attribute names are camelCase. Every other field has
 * no alias and is already camelCase/plain on the wire. These wire types
 * (and normalizeAnalyzeResponse below) are the only place in the app that
 * ever touches the snake_case field names.
 */
interface WireFacilityScoreResult {
  facility_type: string;
  status: FacilityStatus;
  score: number | null;
  nearest_distance_km: number | null;
  count: number;
  explanation: string;
}

interface WireCategoryScoreResult {
  category: CategoryId;
  status: FacilityStatus;
  score: number | null;
  facilities: WireFacilityScoreResult[];
}

interface WireScoreResult {
  overall: number | null;
  coverage: string;
  categories: WireCategoryScoreResult[];
}

interface WireHazardSubScore {
  hazard_type: string;
  score: number;
  severe: boolean;
  is_proxy: boolean;
  source_name: string;
  licence: string;
  data_currency_date: string;
}

interface WireHazardResult {
  h3_index: string;
  resolution: number;
  composite_score: number;
  worst_hazard_type: string;
  worst_hazard_score: number;
  any_severe: boolean;
  hazards: WireHazardSubScore[];
  disclaimer: string;
}

interface WireAnalyzeResponse extends Omit<AnalyzeResponse, "score" | "hazard"> {
  score: WireScoreResult;
  hazard: WireHazardResult | null;
}

interface WireRouteStep {
  instruction: string;
  name: string;
  distance_m: number;
  duration_s: number;
}

interface WireRouteOption {
  coordinates: number[][];
  distance_m: number;
  duration_s: number;
  summary: string;
  steps: WireRouteStep[];
}

interface WireRouteResult {
  routes: WireRouteOption[];
  fallback?: boolean;
}

function normalizeHazardResult(raw: WireHazardResult | null): HazardResult | null {
  if (!raw) return null;

  return {
    composite: raw.composite_score,
    worstHazard: raw.worst_hazard_score,
    worstHazardType: raw.worst_hazard_type,
    anySevere: raw.any_severe,
    disclaimer: raw.disclaimer,
    hazards: raw.hazards.map(
      (h): HazardSubScore => ({
        hazardType: h.hazard_type,
        score: h.score,
        source: h.source_name,
        currencyDate: h.data_currency_date,
        isProxy: h.is_proxy,
        isSevere: h.severe,
      }),
    ),
  };
}

export function normalizeRouteResult(raw: WireRouteResult): RouteResult {
  return {
    routes: raw.routes.map((route) => ({
      coordinates: route.coordinates as [number, number][],
      durationS: route.duration_s,
      distanceM: route.distance_m,
      summary: route.summary,
      steps: route.steps.map((step) => ({
        instruction: step.instruction,
        name: step.name,
        durationS: step.duration_s,
        distanceM: step.distance_m,
      })),
    })),
    fallback: raw.fallback,
  };
}

export function normalizeAnalyzeResponse(
  raw: WireAnalyzeResponse,
): AnalyzeResponse {
  return {
    location: raw.location,
    features: raw.features,
    warnings: raw.warnings,
    hazard: normalizeHazardResult(raw.hazard),
    score: {
      overall: raw.score.overall,
      coverage: raw.score.coverage,
      categories: raw.score.categories.map((cat) => ({
        category: cat.category,
        status: cat.status,
        score: cat.score,
        facilities: cat.facilities.map((f) => ({
          facilityType: f.facility_type,
          status: f.status,
          score: f.score,
          nearestDistanceKm: f.nearest_distance_km,
          count: f.count,
          explanation: f.explanation,
        })),
      })),
    },
  };
}

/**
 * Analyze a location for nearby facilities and scores.
 * Calls POST /api/location/analyze
 *
 * @param request - AnalyzeRequest with location and search parameters
 * @returns AnalyzeResponse containing location, features, scores, and warnings
 * @throws ApiError on network or server error
 */
export async function analyzeLocation(
  request: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  const raw = await fetchJson<WireAnalyzeResponse>("/location/analyze", {
    method: "POST",
    body: JSON.stringify(request),
  });
  return normalizeAnalyzeResponse(raw);
}

/**
 * Get all available facility categories.
 * Calls GET /api/categories
 *
 * @returns Array of category metadata
 * @throws ApiError on network or server error
 */
export async function getCategories(): Promise<Category[]> {
  return fetchJson<Category[]>("/categories", { method: "GET" });
}

/**
 * Get the server's DB-configured default composite-category weights
 * (education, transport, ...), used to seed the Settings weight sliders.
 * Calls GET /api/category-weights
 */
export async function getCategoryWeights(): Promise<Record<string, number>> {
  return fetchJson<Record<string, number>>("/category-weights", { method: "GET" });
}

/**
 * Fetch a route between two points from OSRM via BFF proxy.
 * Returns up to 3 route alternatives with turn-by-turn steps.
 *
 * The BFF returns snake_case fields (duration_s, distance_m) to match the
 * backend's wire format; this function normalizes them to camelCase.
 */
export async function fetchRoute(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  mode: RouteTransportMode = "driving",
): Promise<RouteResult> {
  const params = new URLSearchParams({
    fromLat: String(fromLat),
    fromLon: String(fromLon),
    toLat: String(toLat),
    toLon: String(toLon),
    mode,
  });
  const raw = await fetchJson<WireRouteResult>(`/route?${params}`, { method: "GET" });
  return normalizeRouteResult(raw);
}

/**
 * Fetch the GeoJSON hazard cell layer for the map, within a bbox.
 * Calls GET /api/hazard/cells?bbox=minLon,minLat,maxLon,maxLat
 *
 * Unlike the rest of this API, the backend emits these properties already
 * camelCase (a bulk/tile-like payload, not worth per-record remapping), so
 * no wire/normalize step is needed here.
 */
export async function fetchHazardCells(
  bbox: [number, number, number, number],
): Promise<HazardCellCollection> {
  const params = new URLSearchParams({ bbox: bbox.join(",") });
  return fetchJson<HazardCellCollection>(`/hazard/cells?${params}`, {
    method: "GET",
  });
}

/**
 * Fetch the cadastral parcel nearest a point, for highlighting the parcel a
 * searched address sits on. Calls GET /api/parcels?lat=&lon=
 *
 * A 404 (no parcel within the lookup radius -- e.g. the point is over water
 * or a road reserve) is a normal, expected outcome here, not a failure: it
 * resolves to `null` rather than throwing, so callers can fall back to the
 * plain marker without a try/catch. Any other error still throws ApiError.
 */
export async function fetchParcelAtPoint(
  lat: number,
  lon: number,
): Promise<ParcelFeature | null> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  try {
    return await fetchJson<ParcelFeature>(`/parcels?${params}`, {
      method: "GET",
    });
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}
