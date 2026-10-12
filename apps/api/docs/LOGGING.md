# Logging

The API writes one JSON object per line to stdout. Lines written while a request
is in progress carry that request's ID, so one request's lines can be pulled
from the log backend with a single filter. Startup and background lines have
no request, so their `request_id` is `null`.

## Fields

| Field        | Meaning                                                             |
| ------------ | ------------------------------------------------------------------- |
| `ts`         | UTC timestamp, millisecond precision                                |
| `level`      | `INFO`, `WARNING`, `ERROR`                                          |
| `logger`     | Python logger name, e.g. `app.clients.osrm`                         |
| `message`    | Human-readable summary (fixed text, no values interpolated)         |
| `event`      | Stable tag for filtering, e.g. `overpass.retry`. `null` if untagged |
| `request_id` | The `X-Request-ID` of the request that produced the line, or `null` outside a request |

Extra fields depend on the event: `route`, `method`, `status`, `duration_ms`,
`error_type`, `stack`, `job_id`, `categories`, and similar.

## Request IDs

- Each response carries `X-Request-ID`. A valid incoming header is reused;
  otherwise a 32-character hex ID is generated.
- A valid ID matches `^[A-Za-z0-9-]{1,64}$`. Anything else is discarded, so
  a caller can't inject newlines or forge log content.
- Unhandled errors return `500 {"detail": "Internal server error", "requestId": "..."}`.
  Quote that `requestId` when reporting a failure.
- Background report jobs run inside the originating request, so their lines
  carry the request ID of the `POST /reports` call that started them.

## Access log

Each request gets one `event="http.request"` line with `method`, `route`,
`status`, and `duration_ms`. The `route` field is the matched route template
(e.g. `/reports/{job_id}`), or `<unmatched>`. The raw path and query string are
never logged, because a caller can put an address in either, including on a 404.

## Events

Warnings and errors use the tags below. Search the `event` field for a
prefix, e.g. `event:overpass.*`.

| Event                             | Level   | Raised by                                       |
| --------------------------------- | ------- | ----------------------------------------------- |
| `http.request`                    | INFO    | request context middleware (every request)      |
| `unhandled_exception`             | ERROR   | request context middleware                      |
| `overpass.retry`                  | WARNING | Overpass client, before each retry              |
| `overpass.batch_failed`           | ERROR   | facilities service, after retries are exhausted |
| `overpass.unmatched_element`      | WARNING | Overpass client                                 |
| `osrm.route_unavailable`          | WARNING | OSRM client, route call                         |
| `osrm.route_failed`               | WARNING | OSRM client, route call                         |
| `osrm.breaker_open`               | WARNING | OSRM client, route call                         |
| `osrm.table_unavailable_fallback` | WARNING | OSRM client, distance table (Haversine used)    |
| `osrm.table_failed_fallback`      | WARNING | OSRM client, distance table (Haversine used)    |
| `osrm.breaker_open_fallback`      | WARNING | OSRM client, distance table (Haversine used)    |
| `circuit_breaker.opened`          | WARNING | circuit breaker                                 |
| `circuit_breaker.reopened`        | WARNING | circuit breaker                                 |
| `address_db.query_failed`         | ERROR   | geocoding service                               |
| `cache.get_failed`                | WARNING | cache repository                                |
| `cache.set_failed`                | WARNING | cache repository                                |
| `redis.unavailable`               | WARNING | Redis client at startup                         |
| `rate_limit.disabled`             | WARNING | startup, when Redis is unavailable              |
| `rate_limit.fail_open`            | WARNING | rate limiter, Redis error                       |
| `routing.failed`                  | ERROR   | `GET /route`                                    |
| `linz.parcel_lookup_failed`       | ERROR   | `GET /parcels`                                  |
| `contact.send_failed`             | ERROR   | contact mailer                                  |
| `wikidata.enrichment_failed`      | WARNING | Wikidata enrichment                             |
| `report.job_failed`               | ERROR   | report job                                      |
| `report.render_timeout`           | ERROR   | report job                                      |
| `report.store_unavailable`        | ERROR   | report job                                      |
| `report.failure_not_recorded`     | ERROR   | report job                                      |
| `report.map_render_failed`        | ERROR   | report section (falls back to a table)          |
| `report_store.*`                  | WARNING | report Redis store reads and writes             |
| `client.error`                    | WARNING / ERROR | `POST /client-errors`, browser reports (WARNING for `kind=api`) |

## Browser errors

The web app reports its own failures to `POST /client-errors`. Each report is logged
as `event=client.error` with `kind` (`error`, `unhandledrejection`, `boundary`, or `api`),
`error_message`, `stack`, `route` (page pathname), `endpoint` (API path), `status`, and
`client_request_id`. `client_request_id` is the ID the browser sent with the failed call,
so searching for it in the logs returns the backend lines for that same call. Page loads
send at most 20 reports.

## What is never logged

- Addresses, including the `q` query parameter and the bound parameters of
  database errors.
- Contact form fields (name, email, message).
- Client IP addresses and rate-limit keys.
- API keys and URLs with credentials. httpx's own request logging is set to
  WARNING because it writes the full URL, which can include the LINZ key.
- Exception messages. Driver, httpx, and SQLAlchemy messages can carry any
  of the above, so error logs record `error_type` and the stack frames
  (`exception_fields` in `app/logging_config.py`). Add an exception's
  message to a log line only after checking that it can't carry user input.

## Configuration

| Setting      | Env var      | Default | Notes                                             |
| ------------ | ------------ | ------- | ------------------------------------------------- |
| `log_level`  | `LOG_LEVEL`  | `INFO`  | Root logger level                                 |
| `log_format` | `LOG_FORMAT` | `json`  | Set `text` for a readable local terminal          |

## Adding a log line

Use a stable `event` tag, a fixed message, and `extra=` for values:

```python
logger.warning(
    "Upstream call failed",
    extra={"event": "example.call_failed", "categories": cats, **exception_fields(exc)},
)
```
