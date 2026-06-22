import { NextRequest, NextResponse } from 'next/server';

const LOCAL_OSRM = process.env.OSRM_URL || 'http://localhost:5000';
const PUBLIC_OSRM = 'https://router.project-osrm.org';

async function fetchOsrmRoute(baseUrl: string, coords: string): Promise<[number, number][] | null> {
  const url = `${baseUrl}/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

  if (!response.ok) return null;

  const data = await response.json();
  if (data.code !== 'Ok' || !data.routes?.[0]?.geometry?.coordinates) return null;

  // Convert GeoJSON [lon, lat] → Leaflet [lat, lon]
  return data.routes[0].geometry.coordinates.map(
    ([lon, lat]: [number, number]) => [lat, lon] as [number, number]
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const fromLat = searchParams.get('fromLat');
  const fromLon = searchParams.get('fromLon');
  const toLat = searchParams.get('toLat');
  const toLon = searchParams.get('toLon');

  if (!fromLat || !fromLon || !toLat || !toLon) {
    return NextResponse.json(
      { error: 'Missing required params: fromLat, fromLon, toLat, toLon' },
      { status: 400 }
    );
  }

  const coords = `${fromLon},${fromLat};${toLon},${toLat}`;

  // Try local OSRM first, fall back to public demo
  let coordinates: [number, number][] | null = null;
  let fallback = false;

  try {
    coordinates = await fetchOsrmRoute(LOCAL_OSRM, coords);
  } catch {
    // Local OSRM unavailable — try public demo
  }

  if (!coordinates) {
    try {
      coordinates = await fetchOsrmRoute(PUBLIC_OSRM, coords);
      fallback = true;
    } catch {
      // Both failed — return straight line
    }
  }

  if (!coordinates) {
    coordinates = [
      [parseFloat(fromLat), parseFloat(fromLon)],
      [parseFloat(toLat), parseFloat(toLon)],
    ];
    return NextResponse.json({ coordinates, fallback: true });
  }

  return NextResponse.json({ coordinates, fallback });
}
