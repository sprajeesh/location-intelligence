import { NextRequest, NextResponse } from "next/server";
import { apiKeyHeaders } from "@/utils/apiAuth";
import { clientIpHeaders } from "@/utils/clientIp";

/** Forwards a contact-form submission to FastAPI POST /contact, which emails it. */
export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const response = await fetch(`${apiUrl}/contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...apiKeyHeaders(),
        ...clientIpHeaders(request.headers),
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: response.status },
      );
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error forwarding contact request to FastAPI:", error);
    return NextResponse.json({ error: "Failed to reach contact service" }, { status: 502 });
  }
}
