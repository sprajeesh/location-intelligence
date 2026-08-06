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

interface WireAnalyzeResponse extends Omit<AnalyzeResponse, "score"> {
  score: WireScoreResult;
}

export function normalizeAnalyzeResponse(
  raw: WireAnalyzeResponse,
): AnalyzeResponse {
  return {
    location: raw.location,
    features: raw.features,
    warnings: raw.warnings,
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
 * Fetch a route between two points from OSRM via BFF proxy.
 * Returns up to 3 route alternatives with turn-by-turn steps.
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
  return fetchJson<RouteResult>(`/route?${params}`, { method: "GET" });
}
