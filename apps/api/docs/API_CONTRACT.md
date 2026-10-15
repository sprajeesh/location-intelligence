# API contract

Endpoints and request/response shapes for the FastAPI backend. Where each module lives and how the pieces fit: [`apps/api/README.md`](../README.md) (Key Components). Logging fields and events: [`LOGGING.md`](LOGGING.md).

## Endpoints

| Method | Path                            | Notes                                                   |
| ------ | ------------------------------- | ------------------------------------------------------- |
| GET    | `/health`                       | `{"status": "ok", "version": <apps/api/pyproject.toml>}` |
| GET    | `/search/address?q=&country=nz` | LINZ PostGIS address search, top 5, NZ addresses        |
| GET    | `/categories`                   | All categories with `implemented` flag + marker `color` |
| POST   | `/location/analyze`             | Full analysis — geocode + Overpass + OSRM + score       |
| POST   | `/reports`                      | Start a background PDF report job → `202 {jobId}` (see `apps/api/docs/REPORTS.md`) |
| GET    | `/reports/{jobId}`              | Job status: `queued\|running\|ready\|failed`            |
| GET    | `/reports/{jobId}/download`     | The finished PDF (`409` until ready, `404` once expired) |
| GET    | `/route`                        | Turn-by-turn route to a facility (driving/walking/cycling) |
| GET    | `/category-weights`             | Per-category score weights                              |
| GET    | `/parcels`                      | Parcel lookup at a point                                |
| POST   | `/contact`                      | Contact form → emailed via Resend to `CONTACT_RECIPIENT_EMAIL` (`202`; `503` if unconfigured) |
| POST   | `/client-errors`                | Browser error reports, logged as `event=client.error` (`202`) |
| POST   | `/map-corrections`              | Add or remove a facility from the map → `202 {id,status}`, `200` if already mapped/removed (see below) |

## POST /location/analyze contract

Request:

```json
{
  "address": "...",
  "lat": -36.848,
  "lon": 174.763,
  "radiusKm": 10,
  "categories": ["schools", "bus_stops"],
  "distanceMode": "driving"
}
```

`categories` is optional. If omitted entirely, the API uses the DB-configured
default facility set (currently: `schools`, `gps`, `bus_stops`,
`railway_stations`, `supermarkets` — one from education, one from
healthcare, two from transport, and the only shopping facility type;
recreation is excluded from defaults). Pass `"categories": []` explicitly to
request no facilities (score comes back with `overall: null`). Which facility
types count as defaults is DB-driven (`facility_types.is_default`, see
`apps/api/docs/DATA_MODEL.md`) — editable without a redeploy.

Response:

```json
{
  "location": { "lat": -36.848, "lon": 174.763, "displayName": "..." },
  "features": [
    {
      "id": "osm_node_12345",
      "name": "...",
      "category": "schools",
      "lat": -36.852,
      "lon": 174.77,
      "distanceKm": 1.2
    }
  ],
  "score": {
    "education": 72,
    "healthcare": null,
    "transport": 85,
    "shopping": null,
    "overall": 77,
    "coverage": "2/4"
  },
  "warnings": []
}
```

## GET /categories response

Returns every facility type (12 currently), for example:

```json
[
  { "id": "schools", "label": "Schools", "implemented": true, "color": "#F59E0B", "isDefault": true },
  { "id": "bus_stops", "label": "Bus Stops", "implemented": true, "color": "#14B8A6", "isDefault": true }
]
```

## POST /map-corrections

Users submit corrections to OpenStreetMap-derived facilities: `add` (a facility missing from the map) or `remove` (a facility that is closed or wrong). Stored as pending for review. Per-type rules are enforced by the request model (`app/schemas/requests.py`), the bounding box and facility slug by the service (`app/services/map_corrections.py`).

Request (`add`):

```json
{ "correctionType": "add", "facilityType": "restaurants", "lat": -36.848, "lon": 174.763, "name": "Optional", "address": "Optional", "reporterEmail": "optional@example.com", "website": "" }
```

Request (`remove`): `correctionType: "remove"`, `targetOsmId` (`node/12345`, `way/…` or `relation/…`), `reason` (`closed`, `not_found` or `other`), and `facilityType`, `lat` and `lon` (the facility's type and point, stored with the row) are all required; `name` and `address` are not allowed.

| Type     | Condition                                                  | Response                                  |
| -------- | ---------------------------------------------------------- | ----------------------------------------- |
| `add`    | Same-type OSM element within 100 m                         | `200 {"status":"already_mapped"}`, nothing stored |
| `add`    | Pending `add` of the same type within 50 m                 | `202 {id,status}` with the existing id, `report_count` + 1 |
| `add`    | Otherwise                                                  | `202 {id,status:"pending"}`               |
| `remove` | Target missing from OSM or no longer carries the type's tags | `200 {"status":"already_removed"}`, nothing stored |
| `remove` | Pending `remove` for the same target                       | `202 {id,status}` with the existing id, `report_count` + 1 |
| `remove` | Otherwise                                                  | `202 {id,status:"pending"}`               |

- A non-empty `website` (honeypot) returns `202` with an unstored id and stores nothing.
- If Overpass fails or its breaker is open, the row is stored with `dedupe_checked = false`.
- `422` for invalid input, including coordinates outside NZ (lat -48 to -33, lon 165 to 180). The echoed body masks `reporterEmail`.
- `429` per IP: `add` 5 per hour, `remove` 3 per hour. Fails open when Redis is unavailable.
- Privacy: the IP is stored only as an HMAC-SHA256 (`MAP_CORRECTION_IP_HASH_SECRET`). Logs carry event names and correction types, never the email or raw IP.
