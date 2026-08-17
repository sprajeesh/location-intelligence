import asyncpg


class HazardRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def fetch_hazard_types(self) -> list[dict]:
        """Fetch all hazard_types rows (config, mirrors FacilityConfigRepository)."""
        sql = """
            SELECT slug, label, color, description, default_weight,
                   severe_threshold, is_proxy, implemented
            FROM hazard_types
            ORDER BY slug
        """
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(sql)
        return [dict(row) for row in rows]

    async def fetch_cell_scores(self, h3_index: str) -> list[dict]:
        """Per-hazard sub-scores + provenance for one H3 cell.

        The caller resolves lat/lon to an H3 cell id in Python first
        (h3.latlng_to_cell), so this is a plain indexed equality lookup, not
        a spatial containment query -- H3 already gives cell membership for
        free, re-deriving it via ST_Contains would cost a geometry scan for
        no accuracy gain.
        """
        sql = """
            SELECT hcs.hazard_type_slug, hcs.score, hcs.severe,
                   hcs.data_currency_date, hs.source_name, hs.licence
            FROM hazard_cell_scores hcs
            JOIN hazard_sources hs ON hs.id = hcs.source_id
            WHERE hcs.h3_index = $1
            ORDER BY hcs.hazard_type_slug
        """
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(sql, h3_index)
        return [dict(row) for row in rows]

    async def fetch_cells_in_bbox(
        self,
        min_lon: float,
        min_lat: float,
        max_lon: float,
        max_lat: float,
        limit: int = 10_000,
    ) -> list[dict]:
        """Cells (with geometry + per-hazard breakdown) intersecting a bbox,
        for the GET /hazard/cells map layer. This is the first genuinely
        spatial query in this repo -- ST_Intersects against the GIST index
        on hazard_cells.geom -- unlike the point lookup above, which is a
        plain H3-index equality match.

        `limit` is a defensive backstop, not a pagination mechanism -- the
        bbox span cap in app/api/hazard.py already bounds row-fanout, so this
        only guards against unexpectedly dense hazard coverage."""
        sql = """
            SELECT
                hc.h3_index,
                hc.resolution,
                ST_AsGeoJSON(hc.geom) AS geom_json,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'hazard_type_slug', hcs.hazard_type_slug,
                            'score', hcs.score,
                            'severe', hcs.severe,
                            'data_currency_date', hcs.data_currency_date,
                            'source_name', hs.source_name,
                            'is_proxy', ht.is_proxy
                        )
                    ) FILTER (WHERE hcs.hazard_type_slug IS NOT NULL),
                    '[]'
                ) AS hazards
            FROM hazard_cells hc
            LEFT JOIN hazard_cell_scores hcs ON hcs.h3_index = hc.h3_index
            LEFT JOIN hazard_sources hs ON hs.id = hcs.source_id
            LEFT JOIN hazard_types ht ON ht.slug = hcs.hazard_type_slug
            WHERE ST_Intersects(hc.geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
            GROUP BY hc.h3_index, hc.resolution, hc.geom
            ORDER BY hc.h3_index
            LIMIT $5
        """
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(sql, min_lon, min_lat, max_lon, max_lat, limit)
        return [dict(row) for row in rows]
