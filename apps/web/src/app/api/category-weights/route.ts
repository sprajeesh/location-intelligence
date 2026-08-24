import { NextRequest, NextResponse } from 'next/server'
import { apiKeyHeaders } from '@/utils/apiAuth'
import { clientIpHeaders } from '@/utils/clientIp'

export async function GET(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const fastApiUrl = `${apiUrl}/category-weights${request.nextUrl.search}`

  // Transparent proxy -- the response body, status, and headers pass
  // through unchanged (not parsed/re-serialized), including the upstream's
  // own error responses, matching hazard/cells/route.ts.
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
      { error: 'Failed to fetch from category-weights service' },
      { status: 500 }
    )
  }
}
