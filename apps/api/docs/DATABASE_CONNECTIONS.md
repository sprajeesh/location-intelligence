# Database Connection Budget

The API talks to PostGIS through one SQLAlchemy async engine on the `asyncpg`
driver (`app/repositories/db/connection.py`). That engine owns the only
connection pool in each process, and every repository shares it.

Each uvicorn/gunicorn worker process builds its own engine, so each worker
holds its own pool. The total number of Postgres connections the app can open
is therefore:

```
total connections = workers × (DB_POOL_SIZE + DB_POOL_MAX_OVERFLOW)
```

`DB_POOL_SIZE` is the number of connections a worker keeps open. `DB_POOL_MAX_OVERFLOW`
is how many extra connections it may open under load, on top of that, and
close again afterwards.

## Settings

| Variable               | Default | Meaning                                                |
| ---------------------- | ------- | ------------------------------------------------------ |
| `DB_POOL_SIZE`         | `5`     | Persistent connections per worker process              |
| `DB_POOL_MAX_OVERFLOW` | `5`     | Extra connections per worker allowed under burst load  |
| `DB_STATEMENT_TIMEOUT_MS` | `5000` | Server-side `statement_timeout` on every connection  |

Pool sizes are read from `app/config/settings.py` (`db_pool_size`,
`db_pool_max_overflow`) and passed to `create_engine` at startup. Changing
them requires an API restart.

With the defaults, one worker can use up to 10 connections.

## Statement timeout

Every connection is opened with `statement_timeout` set (through asyncpg's
`server_settings`), so PostgreSQL cancels any statement that runs longer than
`DB_STATEMENT_TIMEOUT_MS`. A slow query therefore can't hold a pooled connection
indefinitely and starve other requests.

When a query is cancelled, the repository raises `QueryTimeoutError`
(`app/repositories/db/errors.py`) and the API responds with a clear error
instead of a 500:

| Endpoint                     | Response                                                |
| ---------------------------- | ------------------------------------------------------- |
| `GET /search/address`        | `504` `"Address search timed out, please try again"`    |
| `POST /location/analyze`     | `504` `"Address lookup timed out, please try again"`    |

Other database errors keep their existing handling. Set the timeout to a value
comfortably above normal query time: address search typically completes in
milliseconds.

## Staying under `max_connections`

PostgreSQL rejects new connections once it reaches `max_connections`
(100 by default on the PostGIS image in `docker/Dockerfile.postgis`). Some of
those slots are reserved for superusers (`superuser_reserved_connections`,
3 by default), and other clients share the same server: `psql`, Alembic
migrations, monitoring, and any other service.

Keep the app's budget comfortably below the server limit:

```
workers × (DB_POOL_SIZE + DB_POOL_MAX_OVERFLOW) ≤ max_connections − reserved − other clients
```

Example: with `max_connections = 100`, 3 reserved, and about 10 held back for
other clients, the app has about 87 connections to spend. At the defaults that
allows up to 8 workers (8 × 10 = 80). Before adding workers or raising the
pool sizes, check the budget with:

```sql
SHOW max_connections;
SHOW superuser_reserved_connections;
SELECT count(*) FROM pg_stat_activity WHERE datname = 'gis';
```

## Current deployment

The API runs as a single uvicorn worker (see
[PROTECTION.md](PROTECTION.md#the-threat-model-briefly)), so the app's peak
usage is `DB_POOL_SIZE + DB_POOL_MAX_OVERFLOW` = 10 connections by default.
That leaves plenty of headroom.

If you add workers, do the arithmetic above first. It is usually better to
lower `DB_POOL_SIZE` per worker than to raise `max_connections` on the server.
