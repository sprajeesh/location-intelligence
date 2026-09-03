import { NextRequest, NextResponse } from 'next/server'
import { apiKeyHeaders } from '@/utils/apiAuth'
import { clientIpHeaders } from '@/utils/clientIp'

export async function GET(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const queryString = request.nextUrl.search
  const upstreamUrl = `${apiUrl}/parcels${queryString}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(upstreamUrl, {
      signal: controller.signal,
      headers: { ...apiKeyHeaders(), ...clientIpHeaders(request.headers) },
    })

    clearTimeout(timeoutId)
    return new NextResponse(response.body, {
      status: response.status,
      headers: response.headers,
    })
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 504 }
      )
    }

    console.error('Error forwarding request to FastAPI:', error)
    return NextResponse.json(
      { error: 'Failed to fetch from parcel lookup service' },
      { status: 500 }
    )
  }
}
