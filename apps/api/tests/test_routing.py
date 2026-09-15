"""Tests for RoutingService (app/services/routing.py).

Specifically guards against the walking/cycling regression where every
transport mode silently hit the same OSRM client/instance -- asserts each
mode is dispatched to its own client with the expected profile segment.
"""

from unittest.mock import AsyncMock

from app.services.routing import RoutingService


def _mock_client(distance: float, duration: float) -> AsyncMock:
    client = AsyncMock()
    client.route = AsyncMock(
        return_value={
            "code": "Ok",
            "routes": [
                {
                    "geometry": {"coordinates": [[174.7, -36.8], [174.71, -36.81]]},
                    "distance": distance,
                    "duration": duration,
                    "legs": [{"summary": "Test Rd", "steps": []}],
                }
            ],
        }
    )
    return client


class TestRoutingServiceModeDispatch:
    def _clients(self) -> dict[str, AsyncMock]:
        return {
            "driving": _mock_client(distance=5000.0, duration=600.0),
            "walking": _mock_client(distance=1200.0, duration=900.0),
            "cycling": _mock_client(distance=3000.0, duration=450.0),
        }

    async def test_driving_uses_driving_client_and_car_profile(self) -> None:
        clients = self._clients()
        svc = RoutingService(clients)

        await svc.get_routes(-36.8, 174.7, -36.81, 174.71, mode="driving")

        clients["driving"].route.assert_awaited_once()
        clients["walking"].route.assert_not_awaited()
        clients["cycling"].route.assert_not_awaited()
        assert clients["driving"].route.await_args.args[0] == "car"

    async def test_walking_uses_foot_client_and_foot_profile(self) -> None:
        clients = self._clients()
        svc = RoutingService(clients)

        await svc.get_routes(-36.8, 174.7, -36.81, 174.71, mode="walking")

        clients["walking"].route.assert_awaited_once()
        clients["driving"].route.assert_not_awaited()
        clients["cycling"].route.assert_not_awaited()
        assert clients["walking"].route.await_args.args[0] == "foot"

    async def test_cycling_uses_bike_client_and_bike_profile(self) -> None:
        clients = self._clients()
        svc = RoutingService(clients)

        await svc.get_routes(-36.8, 174.7, -36.81, 174.71, mode="cycling")

        clients["cycling"].route.assert_awaited_once()
        clients["driving"].route.assert_not_awaited()
        clients["walking"].route.assert_not_awaited()
        assert clients["cycling"].route.await_args.args[0] == "bike"

    async def test_unrecognized_mode_falls_back_to_driving_client(self) -> None:
        clients = self._clients()
        svc = RoutingService(clients)

        await svc.get_routes(-36.8, 174.7, -36.81, 174.71, mode="teleport")

        clients["driving"].route.assert_awaited_once()

    async def test_driving_and_walking_return_different_results(self) -> None:
        """Regression guard: before the fix, every mode hit the same OSRM
        instance/profile and returned identical distance/duration."""
        clients = self._clients()
        svc = RoutingService(clients)

        driving_routes = await svc.get_routes(-36.8, 174.7, -36.81, 174.71, mode="driving")
        walking_routes = await svc.get_routes(-36.8, 174.7, -36.81, 174.71, mode="walking")

        assert driving_routes[0].distanceM != walking_routes[0].distanceM
        assert driving_routes[0].durationS != walking_routes[0].durationS
