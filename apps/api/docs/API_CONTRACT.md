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
