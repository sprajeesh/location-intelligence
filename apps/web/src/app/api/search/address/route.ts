import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const q = searchParams.get('q')

  if (!q) {
    return NextResponse.json(
      { error: 'Missing required query parameter: q' },
      { status: 400 }
    )
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const fastApiUrl = `${apiUrl}/search/address?q=${encodeURIComponent(q)}&country=nz`

  try {
    const response = await fetch(fastApiUrl)

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
      { error: 'Failed to fetch from search service' },
      { status: 500 }
    )
  }
}
