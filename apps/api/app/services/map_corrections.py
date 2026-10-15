import hashlib
import hmac
import logging
import uuid
from dataclasses import dataclass
from typing import Any, NoReturn

from app.clients.overpass import OverpassClient
from app.config.scoring_config_loader import ScoringConfig
from app.config.settings import Settings
from app.repositories.db.map_correction_repository import MapCorrectionRepository
from app.schemas.requests import MapCorrectionRequest

logger = logging.getLogger(__name__)

# An `add` within this distance of an existing mapped element of the same type
# means the facility is already on the map.
MAPPED_CHECK_RADIUS_M = 100.0
# An `add` within this distance of a pending `add` of the same type is treated
# as the same report, so the second submitter bumps report_count instead.
DUPLICATE_RADIUS_M = 50.0

# Used only when map_correction_ip_hash_secret is unset (local dev). Production
# refuses to start without a real secret (see Settings).
_DEV_IP_HASH_SECRET = "development-only-map-correction-key"


class MapCorrectionRejected(Exception):
    """A submission that passed the request model but fails a check that needs
    the loaded config or the NZ bounding box. The route turns it into a 422 with
    the same error shape Pydantic uses."""

    def __init__(self, loc: str, msg: str) -> None:
        super().__init__(msg)
        self.loc = loc
        self.msg = msg


@dataclass(frozen=True)
class SubmissionResult:
    http_status: int
    body: dict[str, Any]


class MapCorrectionService:
    """Per-type decision logic for POST /map-corrections (see the table in
    issue #388). Stateless apart from its injected collaborators."""

    def __init__(
        self,
        repo: MapCorrectionRepository,
        overpass: OverpassClient,
        scoring_config: ScoringConfig,
        settings: Settings,
    ) -> None:
        self._repo = repo
        self._overpass = overpass
        self._config = scoring_config
        self._settings = settings

    async def submit(self, body: MapCorrectionRequest, *, client_ip: str) -> SubmissionResult:
        logger.info(
            "Map correction received",
            extra={"event": "map_correction.received", "correction_type": body.correction_type},
        )

        # Honeypot: a filled-in hidden field means a bot. Answer like a real
        # submission, with an id that was never stored, and store nothing.
        if body.website:
            logger.info(
                "Map correction ignored by honeypot",
                extra={"event": "map_correction.rejected", "reason": "honeypot"},
            )
            return SubmissionResult(202, {"id": str(uuid.uuid4()), "status": "pending"})

        facility = self._config.facility_configs.get(body.facility_type)
        if facility is None:
            self._reject("facilityType", "unknown facility type")
        if not self._within_nz(body.lat, body.lon):
            self._reject("lat", "location is outside New Zealand")

        ip_hash = self._hash_ip(client_ip)
        if body.correction_type == "add":
            return await self._submit_add(body, facility.osm_tags, ip_hash)
        return await self._submit_remove(body, facility.osm_tags, ip_hash)

    async def _submit_add(
        self,
        body: MapCorrectionRequest,
        osm_tags: list[tuple[str, str]],
        ip_hash: str,
    ) -> SubmissionResult:
        dedupe_checked = True
        try:
            nearby = await self._overpass.find_elements_near(
                osm_tags, body.lat, body.lon, MAPPED_CHECK_RADIUS_M
            )
        except RuntimeError:
            # Overpass is down or its breaker is open. Store the report anyway,
            # flagged for review, rather than block the submitter on a third party.
            dedupe_checked = False
        else:
            if nearby:
                logger.info(
                    "Map correction already mapped",
                    extra={"event": "map_correction.already_mapped", "correction_type": "add"},
                )
                return SubmissionResult(200, {"status": "already_mapped"})

        pending = await self._repo.find_pending_add_near(
            body.facility_type, body.lat, body.lon, DUPLICATE_RADIUS_M
        )
        if pending:
            return await self._merge_into(pending[0].id, "add")

        row = await self._repo.insert(
            correction_type="add",
            facility_type_slug=body.facility_type,
            lat=body.lat,
            lon=body.lon,
            client_ip_hash=ip_hash,
            name=body.name,
            address=body.address,
            reporter_email=body.reporter_email,
            dedupe_checked=dedupe_checked,
        )
        return self._stored(row.id, "add", dedupe_checked)

    async def _submit_remove(
        self,
        body: MapCorrectionRequest,
        osm_tags: list[tuple[str, str]],
        ip_hash: str,
    ) -> SubmissionResult:
        target = body.target_osm_id
        assert target is not None  # the request model requires it for remove

        dedupe_checked = True
        try:
            still_mapped = await self._overpass.fetch_element_tags(target, osm_tags)
        except RuntimeError:
            dedupe_checked = False
        else:
            if not still_mapped:
                logger.info(
                    "Map correction already removed",
                    extra={"event": "map_correction.already_removed", "correction_type": "remove"},
                )
                return SubmissionResult(200, {"status": "already_removed"})

        pending = await self._repo.find_pending_remove_for_target(target)
        if pending:
            return await self._merge_into(pending[0].id, "remove")

        row = await self._repo.insert(
            correction_type="remove",
            facility_type_slug=body.facility_type,
            lat=body.lat,
            lon=body.lon,
            client_ip_hash=ip_hash,
            target_osm_id=target,
            reason=body.reason,
            reporter_email=body.reporter_email,
            dedupe_checked=dedupe_checked,
        )
        return self._stored(row.id, "remove", dedupe_checked)

    async def _merge_into(self, correction_id: uuid.UUID, correction_type: str) -> SubmissionResult:
        await self._repo.increment_report_count(correction_id)
        logger.info(
            "Map correction merged into pending report",
            extra={"event": "map_correction.merged", "correction_type": correction_type},
        )
        return SubmissionResult(202, {"id": str(correction_id), "status": "pending"})

    def _stored(
        self, correction_id: uuid.UUID, correction_type: str, dedupe_checked: bool
    ) -> SubmissionResult:
        logger.info(
            "Map correction stored",
            extra={
                "event": "map_correction.stored",
                "correction_type": correction_type,
                "dedupe_checked": dedupe_checked,
            },
        )
        return SubmissionResult(202, {"id": str(correction_id), "status": "pending"})

    def _within_nz(self, lat: float, lon: float) -> bool:
        s = self._settings
        return (
            s.map_correction_min_lat <= lat <= s.map_correction_max_lat
            and s.map_correction_min_lon <= lon <= s.map_correction_max_lon
        )

    def _hash_ip(self, client_ip: str) -> str:
        secret = self._settings.map_correction_ip_hash_secret or _DEV_IP_HASH_SECRET
        return hmac.new(secret.encode(), client_ip.encode(), hashlib.sha256).hexdigest()

    def _reject(self, loc: str, msg: str) -> NoReturn:
        logger.info(
            "Map correction rejected",
            extra={"event": "map_correction.rejected", "error_loc": loc},
        )
        raise MapCorrectionRejected(loc, msg)
