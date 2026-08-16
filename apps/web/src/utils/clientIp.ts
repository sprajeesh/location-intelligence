/**
 * Asserts the real visitor IP to the FastAPI backend for rate-limiting.
 *
 * Cloudflare sits in front of this BFF, so the request's own connecting IP
 * (what Caddy/FastAPI would otherwise see) is just this Worker's egress IP --
 * useless for per-visitor limiting. Cloudflare's `CF-Connecting-IP` header
 * carries the true client IP and can't be spoofed by the client (Cloudflare
 * sets it at the edge). `X-Forwarded-For`'s first entry is a fallback for
 * local dev / non-Cloudflare deploys where that header won't exist.
 *
 * Named distinctly from `X-Forwarded-For` so it's unambiguous in code/logs
 * that this is a BFF-asserted value, not a hop-by-hop proxy header. Takes
 * the incoming request's `Headers` directly (rather than a `NextRequest`)
 * so it isn't coupled to Next's request type.
 */
export function clientIpHeaders(requestHeaders: Headers): HeadersInit {
  const ip =
    requestHeaders.get("cf-connecting-ip") ??
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()

  return ip ? { "X-Forwarded-Client-Ip": ip } : {}
}
