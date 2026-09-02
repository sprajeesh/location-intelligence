import { NextRequest, NextResponse } from 'next/server'
import { clientIpHeaders } from '@/utils/clientIp'

export async function GET(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const queryString = request.nextUrl.search
  const upstreamUrl = `${apiUrl}/parcels${queryString}`

  try {
    const response = await fetch(upstreamUrl, {
      headers: clientIpHeaders(request.headers),
    })

    return new NextResponse(response.body, {
      status: response.status,
      headers: response.headers,
    })
  } catch (error) {
    console.error('Error forwarding request to FastAPI:', error)
    return NextResponse.json(
      { error: 'Failed to fetch from parcel lookup service' },
      { status: 500 }
    )
  }
}
