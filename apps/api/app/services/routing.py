import logging

from app.clients.osrm import OSRMClient
from app.schemas.responses import RouteOption, RouteStep

logger = logging.getLogger(__name__)


class RoutingService:
    """Turn-by-turn routing via OSRM."""

    OSRM_PROFILE = {
        "driving": "car",
        "walking": "foot",
        "cycling": "bike",
    }

    def __init__(self, osrm_client: OSRMClient) -> None:
        self._osrm = osrm_client

    async def get_routes(
        self,
        from_lat: float,
        from_lon: float,
        to_lat: float,
        to_lon: float,
        mode: str = "driving",
    ) -> list[RouteOption]:
        """Get turn-by-turn routes between two points."""
        profile = self.OSRM_PROFILE.get(mode, "car")
        coords = f"{from_lon},{from_lat};{to_lon},{to_lat}"

        osrm_response = await self._osrm.route(profile, coords)
        routes = osrm_response.get("routes", [])

        result = []
        for route in routes:
            geometry = route.get("geometry", {})
            coordinates = geometry.get("coordinates", [])
            coordinates_swapped = [[lat, lon] for lon, lat in coordinates]

            legs = route.get("legs", [])
            leg = legs[0] if legs else {}

            steps = []
            for osrm_step in leg.get("steps", []):
                step = RouteStep(
                    instruction=self._build_instruction(
                        osrm_step.get("maneuver", {}),
                        osrm_step.get("name", ""),
                    ),
                    name=osrm_step.get("name", ""),
                    distance_m=osrm_step.get("distance", 0),
                    duration_s=osrm_step.get("duration", 0),
                )
                steps.append(step)

            option = RouteOption(
                coordinates=coordinates_swapped,
                distance_m=route.get("distance", 0),
                duration_s=route.get("duration", 0),
                summary=leg.get("summary", ""),
                steps=steps,
            )
            result.append(option)

        return result

    def _build_instruction(self, maneuver: dict, street: str) -> str:
        """Convert OSRM maneuver to a human-readable instruction."""
        name = street or "unnamed road"
        maneuver_type = maneuver.get("type")
        modifier = maneuver.get("modifier")

        match maneuver_type:
            case "depart":
                return f"Head {modifier or 'straight'} on {name}"
            case "arrive":
                return "Arrive at destination"
            case "turn":
                match modifier:
                    case "left":
                        return f"Turn left onto {name}"
                    case "right":
                        return f"Turn right onto {name}"
                    case "slight left":
                        return f"Keep left onto {name}"
                    case "slight right":
                        return f"Keep right onto {name}"
                    case "sharp left":
                        return f"Sharp left onto {name}"
                    case "sharp right":
                        return f"Sharp right onto {name}"
                    case _:
                        return f"Continue straight on {name}"
            case "roundabout" | "rotary":
                return f"Take the roundabout onto {name}"
            case "merge":
                return f"Merge onto {name}"
            case "on ramp":
                return f"Take the ramp onto {name}"
            case "off ramp":
                return f"Take the exit onto {name}"
            case "fork":
                if modifier and "left" in modifier:
                    return f"Keep left onto {name}"
                return f"Keep right onto {name}"
            case "end of road":
                if modifier == "left":
                    return f"Turn left onto {name}"
                return f"Turn right onto {name}"
            case "new name" | "continue":
                return f"Continue on {name}"
            case _:
                return f"Proceed on {name}"
