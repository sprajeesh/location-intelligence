# How the API Is Protected

This is a plain-language brief on the abuse-protection and resilience layers
in front of the API's expensive work — who's throttled, what happens when a
downstream dependency goes down, and how to tune any of it. It exists because
the app is anonymous (no sign-in, no API keys per user) and shared publicly,
so the only thing standing between a legitimate visitor and someone hammering
the service is what's described here.

## The threat model, briefly

There's no per-user identity. Every caller looks the same to the API except
for the IP address the Next.js BFF forwards on their behalf. That means
protection has to work without knowing "who" is asking — it can only limit
*how much* and *how expensive*. Two failure modes matter most:

1. **One visitor (or script) sends too many requests, or one very expensive
   request.** `POST /location/analyze` is the expensive endpoint — it calls
   out to Overpass (OpenStreetMap) and OSRM (routing) and used to accept an
   unbounded `categories` list, so a single request could have triggered
   thousands of real outbound calls.
2. **A downstream dependency (Overpass, OSRM, Redis) goes down or gets slow.**
   The API runs as a single uvicorn worker with no `--workers` — one stuck
   request can affect every other concurrent visitor, so failures need to be
   fast, not just eventually-correct.

Everything below addresses one of those two.

## Rate limiting

Every route except `/health` is rate-limited per caller, backed by Redis
(`app/api/rate_limit.py`, using `fastapi-limiter`'s Lua script for atomic
counting). `POST /location/analyze` gets the strictest default since it's the
one that fans out to Overpass/OSRM; `/search/address` and `/categories` are
cheap lookups and get looser limits.

| Route | Default limit |
|---|---|
| `POST /location/analyze` | 10 requests / 60s |
| `GET /search/address` | 30 requests / 60s |
| `GET /categories` | 60 requests / 60s |

Exceeding the limit returns `429` with a `Retry-After` header (seconds until
the window resets):

```json
{"detail": "Too many requests. Please slow down."}
```

**Who's "a caller"?** The API has no user accounts, so it keys on IP address.
Cloudflare sits in front of the Next.js BFF, so the API would otherwise only
ever see the BFF's shared egress IP — useless for per-visitor limiting. The
BFF forwards the real visitor IP (Cloudflare's `CF-Connecting-IP`, or the
first `X-Forwarded-For` entry as a local-dev fallback) in a
`X-Forwarded-Client-Ip` header (see `apps/web/src/utils/clientIp.ts`), which
the API trusts because nothing else can reach it directly — see
"Trusting the forwarded IP" below.

**Fails open, not closed.** If Redis is unreachable, rate limiting is simply
disabled rather than blocking every request — consistent with every other
Redis touchpoint in this app (the facility/geocoding cache also fails open).
A Redis outage should degrade to "no rate limiting," not "the API is down."
Look for `Rate limiting disabled -- Redis unavailable, failing open` in the
logs if this happens.

**Tuning:** every number above is a `Settings` field
(`app/config/settings.py`) — `rate_limit_analyze_times`,
`rate_limit_analyze_seconds`, and the `_search_`/`_categories_` equivalents —
settable via environment variables, no code change needed.

## Circuit breakers

Overpass and OSRM each get their own circuit breaker
(`app/clients/circuit_breaker.py`) so a sustained outage fails fast instead
of every concurrent request paying the full timeout-and-retry cost:

- **Closed** (normal): calls go through as usual.
- **Open**: after 5 consecutive failures, the breaker skips the network call
  entirely for a 30-second cooldown.
- **Half-open**: once the cooldown elapses, exactly one trial call is let
  through — success closes the breaker again, failure reopens it for another
  cooldown.

The two clients react differently to an open breaker, matching what they
already did on individual failures:

- **OSRM**: skips straight to straight-line (haversine) distance, the same
  fallback it already uses for a single failed call — just without waiting
  out the 15-second HTTP timeout first. The response still carries the
  existing `"Using straight-line distance"` warning.
- **Overpass**: the whole merged-query call (including its own internal
  retries) counts as one breaker outcome, not each HTTP attempt. When open,
  that batch of categories fails immediately and is reported the same way
  a real Overpass failure already was — `warnings: ["Could not fetch
  <category> data"]` for just that batch, not the whole request.

**Tuning:** `overpass_breaker_failure_threshold` /
`overpass_breaker_cooldown_seconds` and the `osrm_breaker_*` equivalents in
`app/config/settings.py`.

## Concurrency limits

Three separate limits guard against one request (or one visitor) monopolizing
shared resources:

| Limit | Default | Setting | Why |
|---|---|---|---|
| Concurrent Overpass calls (app-wide) | 2 | `overpass_max_concurrency` | The public Overpass API tolerates only ~2 concurrent slots per IP |
| Concurrent OSRM calls (app-wide) | 4 | `osrm_max_concurrency` | OSRM is self-hosted on the same VM, so it can take a bit more, but it's still one process |
| Concurrent `/location/analyze` requests in flight (process-wide) | 8 | `analyze_max_in_flight` | Protects the single uvicorn worker itself, independent of which client the requests came from |

The first two are `asyncio.Semaphore`s inside each client. The third
(`app/api/concurrency.py`) rejects with a fast `503` once the cap is hit,
rather than queuing — on a single worker, queuing would just turn a fast
failure into every caller's request hanging behind the others:

```json
{"detail": "Server is busy, please retry shortly"}
```

with a `Retry-After: 2` header.

## Input validation

`POST /location/analyze`'s `categories` list used to be unbounded and
unvalidated — the concrete abuse case this whole effort responds to was
`categories: ["x"] * 6000`, which would have triggered roughly a thousand
real Overpass calls plus an uncapped OSRM destination list, from one request.
Fixed with several layers, each independent of the others:

- `categories` is capped at 50 entries, stripped, and de-duplicated at the
  schema level (`app/schemas/requests.py`) — an oversized or garbage-heavy
  list is rejected with `422` before it reaches any service code.
- Anything that *looks* like a category but isn't a real one is rejected
  with `422` too (`app/api/analyze.py`), checked against the actual
  DB-loaded category set (the schema alone can't see that).
- `radius_km` is capped at 50km (was 100km) — a structural bound independent
  of the DB-configured per-category search radii.
- Even with valid categories, the number of destinations sent to OSRM in a
  single `table` call is capped per facility-type/leg
  (`osrm_max_destinations_per_leg`, default 200,
  `app/services/distance.py`) — defense in depth against a legitimate
  category that happens to match a huge number of facilities in a wide
  radius. Facilities past the cap don't get a distance, and the response
  carries a warning saying so.

## Trusting the forwarded IP

The API sits on a port only reachable via a Caddy reverse proxy (see the
root `docker-compose.prod.yml`), and every rate-limited route requires the
`X-Internal-Api-Key` shared secret, which is a server-only environment
variable in the Next.js BFF (never sent to browsers). In practice the only
thing that can successfully call these routes is the BFF itself, which is
why the API trusts whatever IP the BFF asserts in `X-Forwarded-Client-Ip`
rather than needing its own independent verification.

**Known gap:** Caddy is a bare passthrough (`docker/Caddyfile`) on a public
hostname with no header manipulation, so anyone who holds the shared secret
can call Caddy directly and set `X-Forwarded-Client-Ip` to whatever they
like, rotating past the per-visitor rate limit. Restricting by
`request.client.host` at the FastAPI layer doesn't close this -- that value
is always Caddy's own address, for both legitimate BFF traffic and this
attack, since Caddy can't distinguish the two either. Closing this properly
would need something independent of the header itself (e.g. an aggregate
rate cap, or restricting Caddy's `remote_ip` to Cloudflare's ranges).
Not implemented yet -- tracked as future work.

## What to check when something looks wrong

| Symptom | Likely cause | Where to look |
|---|---|---|
| Legitimate-looking requests getting `429` | Limit too strict for real usage, or several visitors sharing one IP (e.g. behind NAT/school wifi) | Raise the relevant `rate_limit_*_times`/`_seconds` setting |
| Every request from one visitor 503ing | `analyze_max_in_flight` reached — either genuinely high concurrent load, or requests that aren't completing (check for a stuck downstream call) | `analyze_max_in_flight`, application logs |
| Distances suddenly all straight-line | OSRM circuit breaker open (or OSRM actually down) | `docker compose logs osrm`; breaker recovers automatically after the cooldown |
| A batch of categories missing with "Could not fetch ... data" | Overpass circuit breaker open, or Overpass itself failing/rate-limiting this app's IP | Application logs (`Circuit breaker overpass: opening ...`) |
| Rate limiting silently not enforcing | Redis unreachable — intentional fail-open | `Rate limiting disabled -- Redis unavailable, failing open` in logs; check `docker compose ps redis` |

## Code map

| Concern | File |
|---|---|
| Circuit breaker | `app/clients/circuit_breaker.py` |
| Rate limiting | `app/api/rate_limit.py` |
| Process-wide concurrency cap | `app/api/concurrency.py` |
| Request validation | `app/schemas/requests.py`, `app/api/analyze.py` |
| OSRM destination cap | `app/services/distance.py` |
| All tunable defaults | `app/config/settings.py` |
| Visitor IP forwarding | `apps/web/src/utils/clientIp.ts` |
