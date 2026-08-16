"""Tests for OSRM destination-count capping (app/services/distance.py)."""

from unittest.mock import AsyncMock, MagicMock

from app.clients.osrm import OSRMClient
from app.config.scoring_config import FACILITY_CONFIGS
from app.models.domain import Facility
from app.repositories.cache import CacheRepository
from app.services.distance import DistanceService


def _schools(count: int) -> list[Facility]:
    return [
        Facility(
            id=f"s{i}", name=f"School {i}", category="schools", lat=-36.8 - i * 0.01, lon=174.7
        )
        for i in range(count)
    ]


class TestMaxDestinationsPerLeg:
    async def test_below_cap_sends_every_destination(self) -> None:
        osrm = MagicMock(spec=OSRMClient)
        osrm.table_distances_km = AsyncMock(return_value=([1.0, 2.0], False))
        service = DistanceService(
            osrm, CacheRepository(client=None), FACILITY_CONFIGS, max_destinations_per_leg=5
        )

        warnings = await service.attach_distances(_schools(2), -36.8, 174.7)

        destinations_sent = osrm.table_distances_km.call_args.args[2]
        assert len(destinations_sent) == 2
        assert warnings == []

    async def test_above_cap_truncates_and_warns(self) -> None:
        osrm = MagicMock(spec=OSRMClient)
        osrm.table_distances_km = AsyncMock(return_value=([1.0, 2.0], False))
        facilities = _schools(5)
        service = DistanceService(
            osrm, CacheRepository(client=None), FACILITY_CONFIGS, max_destinations_per_leg=2
        )

        warnings = await service.attach_distances(facilities, -36.8, 174.7)

        destinations_sent = osrm.table_distances_km.call_args.args[2]
        assert len(destinations_sent) == 2  # capped from 5 down to 2
        assert any("schools" in w and "nearest 2" in w for w in warnings)
        # facilities beyond the cap never get a distance attached
        assert facilities[2].distance_km is None
        assert facilities[3].distance_km is None
        assert facilities[4].distance_km is None

    async def test_default_cap_is_200(self) -> None:
        service = DistanceService(MagicMock(spec=OSRMClient), CacheRepository(client=None), {})
        assert service._max_destinations_per_leg == 200
