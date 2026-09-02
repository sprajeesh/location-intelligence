import { NextRequest, NextResponse } from 'next/server'
import { apiKeyHeaders } from '@/utils/apiAuth'
import { clientIpHeaders } from '@/utils/clientIp'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'Missing required query parameters: lat, lon' },
      { status: 400 }
    )
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const fastApiUrl = `${apiUrl}/parcels/at-point?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`

  try {
    const response = await fetch(fastApiUrl, {
      headers: { ...apiKeyHeaders(), ...clientIpHeaders(request.headers) },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `FastAPI responded with status ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error forwarding request to FastAPI:', error)
    return NextResponse.json(
      { error: 'Failed to fetch from parcel lookup service' },
      { status: 500 }
    )
  }
}
