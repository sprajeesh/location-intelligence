/**
 * Typed fetch wrappers for BFF API routes.
 * These functions call the Next.js API routes (localhost:3000/api/*),
 * which in turn forward requests to the FastAPI backend.
 */

import { AddressResult, AnalyzeResponse, Category } from "@/types/api";

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
 * Must include: address, lat, lon, radiusKm, categories, distanceMode
 */
export interface AnalyzeRequest {
  address: string;
  lat: number;
  lon: number;
  radiusKm: number;
  categories: string[];
  distanceMode: "driving" | "walking";
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
  return fetchJson<AnalyzeResponse>("/location/analyze", {
    method: "POST",
    body: JSON.stringify(request),
  });
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

export interface RouteResult {
  coordinates: [number, number][];
  fallback?: boolean;
}

/**
 * Fetch a route between two points from OSRM via BFF proxy.
 * Returns [lat, lon] pairs for Leaflet Polyline.
 */
export async function fetchRoute(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): Promise<RouteResult> {
  const params = new URLSearchParams({
    fromLat: String(fromLat),
    fromLon: String(fromLon),
    toLat: String(toLat),
    toLon: String(toLon),
  });
  return fetchJson<RouteResult>(`/route?${params}`, { method: "GET" });
}
