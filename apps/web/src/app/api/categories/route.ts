import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const fastApiUrl = `${apiUrl}/categories`

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
      { error: 'Failed to fetch from categories service' },
      { status: 500 }
    )
  }
}
