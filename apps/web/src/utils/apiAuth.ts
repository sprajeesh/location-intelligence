/**
 * Header sent by BFF Route Handlers when forwarding to the FastAPI backend.
 * The backend's port is reachable from the whole internet (no fixed egress
 * IP to allowlist for a Cloudflare Worker caller -- see infra/oci/network.tf),
 * so this shared secret is the app-layer access control. API_SHARED_SECRET
 * is a server-only env var (never NEXT_PUBLIC_*) set via `wrangler secret
 * put` in production; unset in local dev, where the API doesn't enforce it.
 */
export function apiKeyHeaders(): HeadersInit {
  const key = process.env.API_SHARED_SECRET
  return key ? { "X-Internal-Api-Key": key } : {}
}
