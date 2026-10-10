import json

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker


class FacilityConfigRepository:
    def __init__(self, session_factory: async_sessionmaker) -> None:
        self._session_factory = session_factory

    async def fetch_facility_types(self) -> list[dict]:
        """Fetch all facility_types rows.

        Returns dicts keyed by column name; `osm_tags` is cast to text in SQL and
        parsed into a list of [key, value] pairs. The cast keeps the result independent
        of the driver's jsonb decoding (SQLAlchemy's asyncpg dialect returns a Python
        list, not a string). The surrogate
        `id` column is included but unused by callers — `slug` is the business
        key the rest of the app keys off.
        """
        sql = """
            SELECT
                slug, label, singular_label, color, implemented,
                composite_category, category_weight,
                distance_mode, decay_constant, reference_radius, hard_cutoff,
                saturation_point, proximity_weight, density_weight, count_ceiling,
                drive_decay_constant, drive_reference_radius, drive_hard_cutoff,
                osm_tags::text AS osm_tags, is_default
            FROM facility_types
            ORDER BY slug
        """
        async with self._session_factory() as session:
            rows = (await session.execute(text(sql))).mappings().all()

        return [
            {**row, "osm_tags": [tuple(pair) for pair in json.loads(row["osm_tags"])]}
            for row in rows
        ]

    async def fetch_category_weights(self) -> list[dict]:
        """Fetch all category_weights rows as {category, weight} dicts."""
        sql = "SELECT category, weight FROM category_weights ORDER BY category"
        async with self._session_factory() as session:
            rows = (await session.execute(text(sql))).mappings().all()

        return [dict(row) for row in rows]
