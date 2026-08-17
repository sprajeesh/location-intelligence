import { NextRequest, NextResponse } from 'next/server'
import { apiKeyHeaders } from '@/utils/apiAuth'
import { clientIpHeaders } from '@/utils/clientIp'

export async function GET(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const fastApiUrl = `${apiUrl}/hazard/cells${request.nextUrl.search}`

  // Transparent proxy -- bbox validation lives entirely in the FastAPI
  // handler (range/inversion/max-span checks), so this route doesn't
  // duplicate it. The response body is streamed through as-is (not
  // parsed/re-serialized) since GeoJSON hazard cell payloads are a
  // bulk/tile-like response where a JSON round-trip is wasted work; the
  // upstream status and headers pass through unchanged too, including its
  // own error responses.
  try {
    const response = await fetch(fastApiUrl, {
      headers: { ...apiKeyHeaders(), ...clientIpHeaders(request.headers) },
    })

    return new NextResponse(response.body, {
      status: response.status,
      headers: response.headers,
    })
  } catch (error) {
    console.error('Error forwarding request to FastAPI:', error)
    return NextResponse.json(
      { error: 'Failed to fetch from hazard cells service' },
      { status: 502 }
    )
  }
}
