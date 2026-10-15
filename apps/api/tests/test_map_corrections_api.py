"""Tests for POST /map-corrections (app/api/map_corrections.py, app/services/map_corrections.py).

Layers, fastest first:
- request model: the validation matrix (no I/O)
- route: real app and service, fake repository and Overpass client
- rate limit: real Lua limiter on fakeredis
- integration: real service and repository against live PostGIS, stubbed Overpass
  (skipped when the database or migration 0008 is unavailable)
"""

import hashlib
import hmac
import math
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import fakeredis.aioredis as fakeredis
import httpx
import pytest
from fastapi.testclient import TestClient
from fastapi_limiter import FastAPILimiter
from pydantic import ValidationError
from sqlalchemy import text

from app.api.rate_limit import bff_client_identifier, rate_limit_exceeded
from app.clients.circuit_breaker import CircuitOpenError
from app.clients.overpass import OverpassClient
from app.config.settings import Settings, get_settings
from app.main import create_app
from app.repositories.db.connection import create_engine, create_session_factory
from app.repositories.db.map_correction_repository import MapCorrectionRepository
from app.schemas.requests import MapCorrectionRequest
from app.services.map_corrections import MapCorrectionService
from tests.conftest import build_test_scoring_config

SECRET = "test-ip-hash-secret"
CLIENT_IP = "203.0.113.9"
PRIVATE_EMAIL = "private.person@example.com"
NEW_ID = uuid.UUID("11111111-2222-3333-4444-555555555555")
PENDING_ID = uuid.UUID("66666666-7777-8888-9999-000000000000")

ADD_RESTAURANT = {
    "correctionType": "add",
    "facilityType": "restaurants",
    "lat": -36.848,
    "lon": 174.763,
}
REMOVE_RESTAURANT = {
    "correctionType": "remove",
    "facilityType": "restaurants",
    "lat": -36.848,
    "lon": 174.763,
    "targetOsmId": "node/12345",
    "reason": "closed",
}
RESTAURANT_TAGS = [("amenity", "restaurant")]


def _settings() -> Settings:
    return Settings(
        database_url="postgresql://testuser:testpass@localhost/testdb",
        overpass_url="http://mock-overpass",
        osrm_url="http://mock-osrm",
        redis_url="redis://localhost:6379",
        map_correction_ip_hash_secret=SECRET,
    )


def _body(base: dict, **changes: object) -> dict:
    return {**base, "website": "", **changes}


def _repo() -> MagicMock:
    repo = MagicMock(spec=MapCorrectionRepository)
    repo.insert = AsyncMock(return_value=SimpleNamespace(id=NEW_ID))
    repo.find_pending_add_near = AsyncMock(return_value=[])
    repo.find_pending_remove_for_target = AsyncMock(return_value=[])
    repo.increment_report_count = AsyncMock(return_value=2)
    return repo


def _overpass() -> MagicMock:
    overpass = MagicMock(spec=OverpassClient)
    overpass.find_elements_near = AsyncMock(return_value=[])
    overpass.fetch_element_tags = AsyncMock(return_value=True)
    return overpass


@pytest.fixture
def repo() -> MagicMock:
    return _repo()


@pytest.fixture
def overpass() -> MagicMock:
    return _overpass()


@pytest.fixture
def client(repo: MagicMock, overpass: MagicMock, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """Real app with the service wired to fakes. Rate limiting is off: the
    lifespan may have connected to a real Redis, so it is cleared after startup."""
    application = create_app()
    application.dependency_overrides[get_settings] = _settings
    scoring = build_test_scoring_config()
    with patch("app.main.load_scoring_config", new=AsyncMock(return_value=scoring)):
        with TestClient(application) as test_client:
            monkeypatch.setattr(FastAPILimiter, "redis", None)
            application.state.map_correction_svc = MapCorrectionService(
                repo, overpass, scoring, _settings()
            )
            yield test_client


# ─── Request model: the validation matrix ──────────────────────────────────


class TestRequestModel:
    @pytest.mark.parametrize(
        "payload",
        [
            pytest.param({**ADD_RESTAURANT, "targetOsmId": "node/1"}, id="add-with-target"),
            pytest.param({**ADD_RESTAURANT, "reason": "closed"}, id="add-with-reason"),
            pytest.param({**REMOVE_RESTAURANT, "targetOsmId": None}, id="remove-no-target"),
            pytest.param({**REMOVE_RESTAURANT, "reason": None}, id="remove-no-reason"),
            pytest.param({**REMOVE_RESTAURANT, "name": "Cafe"}, id="remove-with-name"),
            pytest.param({**REMOVE_RESTAURANT, "address": "1 Queen St"}, id="remove-with-address"),
            pytest.param({**ADD_RESTAURANT, "correctionType": "edit"}, id="unknown-type"),
            pytest.param({**REMOVE_RESTAURANT, "reason": "bored"}, id="unknown-reason"),
            pytest.param({**REMOVE_RESTAURANT, "targetOsmId": "node/abc"}, id="osm-id-non-numeric"),
            pytest.param({**REMOVE_RESTAURANT, "targetOsmId": "nodes/1"}, id="osm-id-bad-type"),
            pytest.param({**REMOVE_RESTAURANT, "targetOsmId": "node/1;x"}, id="osm-id-injection"),
            pytest.param({**ADD_RESTAURANT, "facilityType": "   "}, id="blank-facility"),
            pytest.param({**ADD_RESTAURANT, "facilityType": "x" * 65}, id="facility-too-long"),
            pytest.param({**ADD_RESTAURANT, "lat": math.nan}, id="lat-nan"),
            pytest.param({**ADD_RESTAURANT, "lon": math.inf}, id="lon-infinite"),
            pytest.param({**ADD_RESTAURANT, "name": "x" * 201}, id="name-too-long"),
            pytest.param({**ADD_RESTAURANT, "address": "x" * 301}, id="address-too-long"),
            pytest.param({**ADD_RESTAURANT, "name": "Cafe\nBcc: x"}, id="name-multiline"),
            pytest.param({**ADD_RESTAURANT, "address": "1 Queen\r St"}, id="address-carriage"),
            pytest.param({**ADD_RESTAURANT, "reporterEmail": "not-an-email"}, id="email-invalid"),
            pytest.param(
                {**ADD_RESTAURANT, "reporterEmail": "a@b.co\nBcc: x@y.z"}, id="email-multiline"
            ),
            pytest.param(
                {**ADD_RESTAURANT, "reporterEmail": "a" * 250 + "@b.co"}, id="email-too-long"
            ),
        ],
    )
    def test_rejects(self, payload: dict) -> None:
        with pytest.raises(ValidationError):
            MapCorrectionRequest.model_validate(payload)

    def test_valid_add_minimal(self) -> None:
        model = MapCorrectionRequest.model_validate(ADD_RESTAURANT)

        assert model.correction_type == "add"
        assert model.target_osm_id is None
        assert model.reason is None
        assert model.reporter_email is None

    def test_valid_remove_minimal(self) -> None:
        model = MapCorrectionRequest.model_validate(REMOVE_RESTAURANT)

        assert model.target_osm_id == "node/12345"
        assert model.reason == "closed"

    def test_facility_type_is_trimmed(self) -> None:
        model = MapCorrectionRequest.model_validate({**ADD_RESTAURANT, "facilityType": " cafes "})

        assert model.facility_type == "cafes"

    def test_blank_optional_text_is_treated_as_not_given(self) -> None:
        model = MapCorrectionRequest.model_validate(
            {**ADD_RESTAURANT, "name": "   ", "address": "", "reporterEmail": "  "}
        )

        assert model.name is None
        assert model.address is None
        assert model.reporter_email is None

    def test_name_and_address_are_trimmed(self) -> None:
        model = MapCorrectionRequest.model_validate(
            {**ADD_RESTAURANT, "name": "  Cafe  ", "address": " 1 Queen St "}
        )

        assert model.name == "Cafe"
        assert model.address == "1 Queen St"

    def test_email_domain_is_lowercased_and_local_part_kept(self) -> None:
        model = MapCorrectionRequest.model_validate(
            {**ADD_RESTAURANT, "reporterEmail": "  Some.One@Example.CO.NZ "}
        )

        assert model.reporter_email == "Some.One@example.co.nz"

    def test_populate_by_field_name_is_accepted(self) -> None:
        model = MapCorrectionRequest.model_validate(
            {"correction_type": "add", "facility_type": "restaurants", "lat": 1, "lon": 2}
        )

        assert model.facility_type == "restaurants"


# ─── Route: decision table ─────────────────────────────────────────────────


class TestAddRoute:
    def test_valid_add_is_stored_and_returns_202(
        self, client: TestClient, repo: MagicMock, overpass: MagicMock
    ) -> None:
        response = client.post("/map-corrections", json=_body(ADD_RESTAURANT))

        assert response.status_code == 202
        assert response.json() == {"id": str(NEW_ID), "status": "pending"}
        overpass.find_elements_near.assert_awaited_once_with(
            RESTAURANT_TAGS, -36.848, 174.763, 100.0
        )
        repo.find_pending_add_near.assert_awaited_once_with("restaurants", -36.848, 174.763, 50.0)
        assert repo.insert.await_args.kwargs["dedupe_checked"] is True
        assert repo.insert.await_args.kwargs.get("target_osm_id") is None

    def test_element_already_mapped_returns_200_and_stores_nothing(
        self, client: TestClient, repo: MagicMock, overpass: MagicMock
    ) -> None:
        overpass.find_elements_near.return_value = [{"type": "node", "id": 1}]

        response = client.post("/map-corrections", json=_body(ADD_RESTAURANT))

        assert response.status_code == 200
        assert response.json() == {"status": "already_mapped"}
        repo.insert.assert_not_awaited()
        repo.increment_report_count.assert_not_awaited()

    def test_second_pending_add_nearby_increments_count(
        self, client: TestClient, repo: MagicMock
    ) -> None:
        repo.find_pending_add_near.return_value = [SimpleNamespace(id=PENDING_ID)]

        response = client.post("/map-corrections", json=_body(ADD_RESTAURANT))

        assert response.status_code == 202
        assert response.json() == {"id": str(PENDING_ID), "status": "pending"}
        repo.increment_report_count.assert_awaited_once_with(PENDING_ID)
        repo.insert.assert_not_awaited()

    def test_overpass_failure_stores_with_dedupe_unchecked(
        self, client: TestClient, repo: MagicMock, overpass: MagicMock
    ) -> None:
        overpass.find_elements_near.side_effect = RuntimeError("Overpass query failed")

        response = client.post("/map-corrections", json=_body(ADD_RESTAURANT))

        assert response.status_code == 202
        assert repo.insert.await_args.kwargs["dedupe_checked"] is False

    def test_open_breaker_stores_with_dedupe_unchecked(
        self, client: TestClient, repo: MagicMock, overpass: MagicMock
    ) -> None:
        overpass.find_elements_near.side_effect = CircuitOpenError("open")

        response = client.post("/map-corrections", json=_body(ADD_RESTAURANT))

        assert response.status_code == 202
        assert repo.insert.await_args.kwargs["dedupe_checked"] is False

    def test_pending_lookup_still_runs_when_overpass_fails(
        self, client: TestClient, repo: MagicMock, overpass: MagicMock
    ) -> None:
        overpass.find_elements_near.side_effect = RuntimeError("down")
        repo.find_pending_add_near.return_value = [SimpleNamespace(id=PENDING_ID)]

        response = client.post("/map-corrections", json=_body(ADD_RESTAURANT))

        assert response.json() == {"id": str(PENDING_ID), "status": "pending"}
        repo.insert.assert_not_awaited()

    def test_optional_name_and_address_are_stored(
        self, client: TestClient, repo: MagicMock
    ) -> None:
        client.post(
            "/map-corrections",
            json=_body(ADD_RESTAURANT, name="  Cafe ", address="1 Queen St"),
        )

        assert repo.insert.await_args.kwargs["name"] == "Cafe"
        assert repo.insert.await_args.kwargs["address"] == "1 Queen St"


class TestRemoveRoute:
    def test_valid_remove_is_stored_and_returns_202(
        self, client: TestClient, repo: MagicMock, overpass: MagicMock
    ) -> None:
        response = client.post("/map-corrections", json=_body(REMOVE_RESTAURANT))

        assert response.status_code == 202
        assert response.json() == {"id": str(NEW_ID), "status": "pending"}
        overpass.fetch_element_tags.assert_awaited_once_with("node/12345", RESTAURANT_TAGS)
        kwargs = repo.insert.await_args.kwargs
        assert kwargs["correction_type"] == "remove"
        assert kwargs["target_osm_id"] == "node/12345"
        assert kwargs["reason"] == "closed"
        assert kwargs.get("name") is None
        assert kwargs["dedupe_checked"] is True

    def test_target_gone_or_untagged_returns_200(
        self, client: TestClient, repo: MagicMock, overpass: MagicMock
    ) -> None:
        overpass.fetch_element_tags.return_value = False

        response = client.post("/map-corrections", json=_body(REMOVE_RESTAURANT))

        assert response.status_code == 200
        assert response.json() == {"status": "already_removed"}
        repo.insert.assert_not_awaited()

    def test_second_pending_remove_for_target_increments_count(
        self, client: TestClient, repo: MagicMock
    ) -> None:
        repo.find_pending_remove_for_target.return_value = [SimpleNamespace(id=PENDING_ID)]

        response = client.post("/map-corrections", json=_body(REMOVE_RESTAURANT))

        assert response.status_code == 202
        assert response.json() == {"id": str(PENDING_ID), "status": "pending"}
        repo.increment_report_count.assert_awaited_once_with(PENDING_ID)
        repo.insert.assert_not_awaited()

    def test_overpass_failure_stores_with_dedupe_unchecked(
        self, client: TestClient, repo: MagicMock, overpass: MagicMock
    ) -> None:
        overpass.fetch_element_tags.side_effect = RuntimeError("down")

        response = client.post("/map-corrections", json=_body(REMOVE_RESTAURANT))

        assert response.status_code == 202
        assert repo.insert.await_args.kwargs["dedupe_checked"] is False


class TestHoneypotAndDomainChecks:
    def test_filled_honeypot_returns_202_and_touches_nothing(
        self, client: TestClient, repo: MagicMock, overpass: MagicMock
    ) -> None:
        response = client.post(
            "/map-corrections", json={**ADD_RESTAURANT, "website": "http://spam.example"}
        )

        assert response.status_code == 202
        assert uuid.UUID(response.json()["id"])
        assert response.json()["status"] == "pending"
        overpass.find_elements_near.assert_not_awaited()
        repo.insert.assert_not_awaited()

    def test_unknown_facility_type_returns_422(self, client: TestClient, repo: MagicMock) -> None:
        response = client.post(
            "/map-corrections", json=_body(ADD_RESTAURANT, facilityType="spaceports")
        )

        assert response.status_code == 422
        assert response.json()["detail"][0]["loc"] == ["body", "facilityType"]
        repo.insert.assert_not_awaited()

    @pytest.mark.parametrize(
        ("lat", "lon", "accepted"),
        [
            pytest.param(-48.0, 170.0, True, id="south-edge"),
            pytest.param(-33.0, 170.0, True, id="north-edge"),
            pytest.param(-48.01, 170.0, False, id="south-of-box"),
            pytest.param(-32.99, 170.0, False, id="north-of-box"),
            pytest.param(-40.0, 165.0, True, id="west-edge"),
            pytest.param(-40.0, 164.99, False, id="west-of-box"),
            pytest.param(-40.0, 180.0, True, id="east-edge"),
            pytest.param(-40.0, 180.01, False, id="east-of-box"),
            pytest.param(51.5, -0.12, False, id="london"),
        ],
    )
    def test_nz_bounding_box(
        self, client: TestClient, lat: float, lon: float, accepted: bool
    ) -> None:
        response = client.post("/map-corrections", json=_body(ADD_RESTAURANT, lat=lat, lon=lon))

        if accepted:
            assert response.status_code == 202
        else:
            assert response.status_code == 422
            assert response.json()["detail"][0]["loc"] == ["body", "lat"]


# ─── Privacy: masking, hashing, logs ───────────────────────────────────────


class TestPrivacy:
    def test_invalid_email_is_not_echoed_back(self, client: TestClient) -> None:
        response = client.post(
            "/map-corrections",
            json=_body(ADD_RESTAURANT, reporterEmail="private.person@@example"),
        )

        assert response.status_code == 422
        assert "private.person" not in response.text

    def test_model_level_error_masks_the_email_in_echoed_body(self, client: TestClient) -> None:
        # add + targetOsmId fails the per-type rule at model level, and the
        # error echoes the whole body, email included. The email must be masked.
        response = client.post(
            "/map-corrections",
            json=_body(ADD_RESTAURANT, targetOsmId="node/1", reporterEmail=PRIVATE_EMAIL),
        )

        assert response.status_code == 422
        assert PRIVATE_EMAIL not in response.text

    def test_ip_is_stored_as_hmac_and_email_is_stored(
        self, client: TestClient, repo: MagicMock
    ) -> None:
        client.post(
            "/map-corrections",
            json=_body(ADD_RESTAURANT, reporterEmail=PRIVATE_EMAIL),
            headers={"X-Forwarded-Client-Ip": CLIENT_IP},
        )

        kwargs = repo.insert.await_args.kwargs
        expected = hmac.new(SECRET.encode(), CLIENT_IP.encode(), hashlib.sha256).hexdigest()
        assert kwargs["client_ip_hash"] == expected
        assert CLIENT_IP not in kwargs["client_ip_hash"]
        assert kwargs["reporter_email"] == PRIVATE_EMAIL

    def test_logs_contain_no_email_and_no_raw_ip(
        self, client: TestClient, caplog: pytest.LogCaptureFixture
    ) -> None:
        with caplog.at_level("INFO"):
            response = client.post(
                "/map-corrections",
                json=_body(ADD_RESTAURANT, reporterEmail=PRIVATE_EMAIL),
                headers={"X-Forwarded-Client-Ip": CLIENT_IP},
            )
            client.post(
                "/map-corrections",
                json=_body(ADD_RESTAURANT, reporterEmail="bad@@x", name="A"),
                headers={"X-Forwarded-Client-Ip": CLIENT_IP},
            )
            client.post(
                "/map-corrections",
                json=_body(ADD_RESTAURANT, lat=0),
                headers={"X-Forwarded-Client-Ip": CLIENT_IP},
            )

        assert response.status_code == 202
        events = {getattr(record, "event", None) for record in caplog.records}
        assert {"map_correction.stored", "map_correction.rejected"} <= events
        assert PRIVATE_EMAIL not in caplog.text
        assert "bad@@x" not in caplog.text
        assert CLIENT_IP not in caplog.text


# ─── Rate limiting (real Lua limiter on fakeredis) ─────────────────────────


@pytest.fixture
async def fake_redis():
    redis = fakeredis.FakeRedis(decode_responses=True)
    yield redis
    await redis.aclose()


@pytest.fixture
async def limiter_script_sha(fake_redis: fakeredis.FakeRedis) -> str:
    """The limiter's Lua script, loaded the way FastAPILimiter.init would load it."""
    return await fake_redis.script_load(FastAPILimiter.lua_script)


@pytest.fixture
def limited_client(
    fake_redis: fakeredis.FakeRedis,
    limiter_script_sha: str,
    repo: MagicMock,
    overpass: MagicMock,
    monkeypatch: pytest.MonkeyPatch,
) -> TestClient:
    application = create_app()
    application.dependency_overrides[get_settings] = _settings
    scoring = build_test_scoring_config()
    with patch("app.main.load_scoring_config", new=AsyncMock(return_value=scoring)):
        with TestClient(application) as test_client:
            # Swap in the fake after startup: the lifespan may have connected to a
            # real Redis, and this test must count against fakeredis only.
            monkeypatch.setattr(FastAPILimiter, "redis", fake_redis)
            monkeypatch.setattr(FastAPILimiter, "identifier", bff_client_identifier)
            monkeypatch.setattr(FastAPILimiter, "http_callback", rate_limit_exceeded)
            monkeypatch.setattr(FastAPILimiter, "lua_sha", limiter_script_sha)
            application.state.map_correction_svc = MapCorrectionService(
                repo, overpass, scoring, _settings()
            )
            yield test_client


class TestRateLimit:
    def test_add_allows_five_per_hour_then_429_with_retry_after(
        self, limited_client: TestClient
    ) -> None:
        headers = {"X-Forwarded-Client-Ip": "203.0.113.20"}
        for _ in range(5):
            assert (
                limited_client.post(
                    "/map-corrections", json=_body(ADD_RESTAURANT), headers=headers
                ).status_code
                == 202
            )

        response = limited_client.post(
            "/map-corrections", json=_body(ADD_RESTAURANT), headers=headers
        )

        assert response.status_code == 429
        assert int(response.headers["Retry-After"]) > 0

    def test_remove_is_stricter_than_add(self, limited_client: TestClient) -> None:
        headers = {"X-Forwarded-Client-Ip": "203.0.113.21"}
        for _ in range(3):
            assert (
                limited_client.post(
                    "/map-corrections", json=_body(REMOVE_RESTAURANT), headers=headers
                ).status_code
                == 202
            )

        assert (
            limited_client.post(
                "/map-corrections", json=_body(REMOVE_RESTAURANT), headers=headers
            ).status_code
            == 429
        )

    def test_add_and_remove_have_separate_buckets(self, limited_client: TestClient) -> None:
        headers = {"X-Forwarded-Client-Ip": "203.0.113.22"}
        for _ in range(3):
            limited_client.post("/map-corrections", json=_body(REMOVE_RESTAURANT), headers=headers)

        response = limited_client.post(
            "/map-corrections", json=_body(ADD_RESTAURANT), headers=headers
        )

        assert response.status_code == 202

    def test_invalid_body_does_not_spend_quota(self, limited_client: TestClient) -> None:
        headers = {"X-Forwarded-Client-Ip": "203.0.113.23"}
        for _ in range(10):
            limited_client.post("/map-corrections", json={"correctionType": "add"}, headers=headers)

        response = limited_client.post(
            "/map-corrections", json=_body(ADD_RESTAURANT), headers=headers
        )

        assert response.status_code == 202

    def test_redis_down_fails_open(
        self, limited_client: TestClient, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr(FastAPILimiter, "redis", None)
        headers = {"X-Forwarded-Client-Ip": "203.0.113.24"}

        statuses = [
            limited_client.post(
                "/map-corrections", json=_body(ADD_RESTAURANT), headers=headers
            ).status_code
            for _ in range(8)
        ]

        assert statuses == [202] * 8


# ─── Overpass client: the two lookups ──────────────────────────────────────


def _http_response(elements: list[dict]) -> httpx.Response:
    return httpx.Response(
        200,
        json={"elements": elements},
        request=httpx.Request("POST", "http://mock-overpass"),
    )


class TestOverpassLookups:
    async def test_find_elements_near_builds_radius_query_for_all_tags(self) -> None:
        http = MagicMock()
        http.post = AsyncMock(return_value=_http_response([]))
        client = OverpassClient("http://mock-overpass", http, {})

        await client.find_elements_near(
            [("amenity", "pub"), ("amenity", "bar")], -36.848, 174.763, 100.0
        )

        query = http.post.await_args.kwargs["content"]
        assert 'nwr["amenity"="pub"](around:100.0,-36.848,174.763);' in query
        assert 'nwr["amenity"="bar"](around:100.0,-36.848,174.763);' in query
        assert query.endswith("out center;")

    async def test_find_elements_near_returns_raw_elements(self) -> None:
        http = MagicMock()
        http.post = AsyncMock(return_value=_http_response([{"type": "node", "id": 7}]))
        client = OverpassClient("http://mock-overpass", http, {})

        found = await client.find_elements_near(RESTAURANT_TAGS, 0.0, 0.0, 100.0)

        assert found == [{"type": "node", "id": 7}]

    async def test_fetch_element_tags_queries_the_element_by_id(self) -> None:
        http = MagicMock()
        http.post = AsyncMock(return_value=_http_response([]))
        client = OverpassClient("http://mock-overpass", http, {})

        await client.fetch_element_tags("way/987", RESTAURANT_TAGS)

        assert "way(987);" in http.post.await_args.kwargs["content"]

    async def test_fetch_element_tags_true_when_tag_still_present(self) -> None:
        http = MagicMock()
        http.post = AsyncMock(
            return_value=_http_response(
                [{"type": "node", "id": 1, "tags": {"amenity": "restaurant"}}]
            )
        )
        client = OverpassClient("http://mock-overpass", http, {})

        assert await client.fetch_element_tags("node/1", RESTAURANT_TAGS) is True

    async def test_fetch_element_tags_false_when_tag_removed(self) -> None:
        http = MagicMock()
        http.post = AsyncMock(
            return_value=_http_response([{"type": "node", "id": 1, "tags": {"name": "Old"}}])
        )
        client = OverpassClient("http://mock-overpass", http, {})

        assert await client.fetch_element_tags("node/1", RESTAURANT_TAGS) is False

    async def test_fetch_element_tags_false_when_element_missing(self) -> None:
        http = MagicMock()
        http.post = AsyncMock(return_value=_http_response([]))
        client = OverpassClient("http://mock-overpass", http, {})

        assert await client.fetch_element_tags("node/1", RESTAURANT_TAGS) is False


# ─── Integration: real service and repository against PostGIS ──────────────

LON = 174.7701
LAT = -41.2901  # Wellington, away from the other fixtures' coordinates


@pytest.fixture
async def session_factory():  # type: ignore[no-untyped-def]
    settings = get_settings()
    engine = create_engine(
        settings.database_url,
        pool_size=1,
        max_overflow=0,
        pool_recycle_seconds=settings.db_pool_recycle_seconds,
        statement_timeout_ms=settings.db_statement_timeout_ms,
    )
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1 FROM map_corrections LIMIT 0"))
    except Exception as exc:  # no database, or migration 0008 not applied
        await engine.dispose()
        pytest.skip(f"map_corrections not reachable: {type(exc).__name__}")

    factory = create_session_factory(engine)
    created: list[str] = []
    yield factory, created

    if created:
        async with factory() as session, session.begin():
            await session.execute(
                text("DELETE FROM map_corrections WHERE id = ANY(CAST(:ids AS uuid[]))"),
                {"ids": created},
            )
    await engine.dispose()


class TestServiceAgainstPostGIS:
    async def test_add_then_second_add_merges_then_remove_is_stored(
        self, session_factory, overpass: MagicMock
    ) -> None:
        factory, created = session_factory
        scoring = build_test_scoring_config()
        service = MapCorrectionService(
            MapCorrectionRepository(factory), overpass, scoring, _settings()
        )

        add = MapCorrectionRequest.model_validate(
            {"correctionType": "add", "facilityType": "schools", "lat": LAT, "lon": LON}
        )
        first = await service.submit(add, client_ip="203.0.113.50")
        assert first.http_status == 202
        created.append(first.body["id"])

        second = await service.submit(add, client_ip="203.0.113.51")
        assert second.http_status == 202
        assert second.body["id"] == first.body["id"]

        async with factory() as session:
            count = await session.scalar(
                text("SELECT report_count FROM map_corrections WHERE id = CAST(:id AS uuid)"),
                {"id": first.body["id"]},
            )
        assert count == 2

        remove = MapCorrectionRequest.model_validate(
            {
                "correctionType": "remove",
                "facilityType": "schools",
                "lat": LAT,
                "lon": LON,
                "targetOsmId": f"node/{uuid.uuid4().int % 10**9}",
                "reason": "not_found",
            }
        )
        stored = await service.submit(remove, client_ip="203.0.113.50")
        assert stored.http_status == 202
        created.append(stored.body["id"])
