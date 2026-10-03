"""Report job endpoints: create -> poll -> download, plus failure modes."""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import fakeredis.aioredis as fakeredis
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from fastapi_limiter import FastAPILimiter
from pypdf import PdfReader

from app.api.concurrency import InFlightLimiter
from app.config.settings import get_settings
from app.main import create_app
from app.repositories.report_jobs import ReportJobStore
from app.services.report_jobs import report_filename
from tests.conftest import build_test_scoring_config, override_settings
from tests.test_report_data import _analysis
from tests.test_scoring import make_facility

BODY = {"lat": -36.848, "lon": 174.763, "radiusKm": 5, "categories": ["schools"]}


def _build_client(redis_client, max_in_flight: int = 2):
    application = create_app()
    application.dependency_overrides[get_settings] = override_settings
    scoring_config = build_test_scoring_config()
    FastAPILimiter.redis = None  # rate limiting off; covered in test_rate_limit
    with (
        # Never touch a real Redis (a dev machine may have one running): its
        # persisted rate-limit counters would make these tests order-dependent.
        patch("app.main.redis_module.init_redis", new=AsyncMock()),
        patch("app.main.redis_module.get_client", new=AsyncMock(return_value=None)),
        patch("app.main.create_pool", new=AsyncMock(return_value=MagicMock())),
        patch("app.main.close_pool", new=AsyncMock()),
        patch("app.main.load_scoring_config", new=AsyncMock(return_value=scoring_config)),
    ):
        with TestClient(application) as client:
            application.state.scoring_config = scoring_config
            application.state.report_store = ReportJobStore(redis_client, ttl_seconds=60)
            application.state.report_in_flight_limiter = InFlightLimiter(max_in_flight)
            yield client


@pytest.fixture
def client():
    yield from _build_client(fakeredis.FakeRedis(decode_responses=True))


@pytest.fixture
def client_no_redis():
    yield from _build_client(None)


@pytest.fixture
def analysis():
    return _analysis([make_facility("schools", 0.4, name="Ponsonby Primary")], ["schools"])


def _patch_analysis(result=None, error=None):
    return patch(
        "app.services.report_jobs.run_analysis",
        new=AsyncMock(return_value=result, side_effect=error),
    )


def test_happy_path_create_poll_download(client, analysis):
    with _patch_analysis(analysis):
        created = client.post("/reports", json=BODY)
    assert created.status_code == 202
    job_id = created.json()["jobId"]
    uuid.UUID(job_id)

    status = client.get(f"/reports/{job_id}").json()
    assert status["status"] == "ready"
    assert status["expiresAt"]
    assert status["filename"].endswith(".pdf")

    pdf = client.get(f"/reports/{job_id}/download")
    assert pdf.status_code == 200
    assert pdf.headers["content-type"] == "application/pdf"
    assert (
        'filename="intelligence-report-1-queen-st-auckland.pdf"'
        in (pdf.headers["content-disposition"])
    )
    assert pdf.content.startswith(b"%PDF")
    text = "\n".join(
        p.extract_text() for p in PdfReader(__import__("io").BytesIO(pdf.content)).pages
    )
    assert "Ponsonby Primary" in text


def test_create_returns_queued_before_work_runs(client, analysis):
    """The POST response itself reports `queued`; work happens after it."""
    with _patch_analysis(analysis):
        created = client.post("/reports", json=BODY)
    assert created.json()["status"] == "queued"


def test_unknown_and_malformed_ids_404(client):
    assert client.get(f"/reports/{uuid.uuid4()}").status_code == 404
    assert client.get("/reports/not-a-uuid").status_code == 404
    assert client.get(f"/reports/{uuid.uuid4()}/download").status_code == 404
    assert client.get("/reports/not-a-uuid/download").status_code == 404


def test_download_before_ready_is_409(client):
    store = client.app.state.report_store
    job_id = str(uuid.uuid4())
    client.portal.call(store.set_status, job_id, "running")
    resp = client.get(f"/reports/{job_id}/download")
    assert resp.status_code == 409


def test_expired_job_404(client, analysis):
    with _patch_analysis(analysis):
        job_id = client.post("/reports", json=BODY).json()["jobId"]
    redis = client.app.state.report_store._client
    client.portal.call(redis.delete, f"report:pdf:{job_id}")
    assert client.get(f"/reports/{job_id}/download").status_code == 404
    client.portal.call(redis.delete, f"report:job:{job_id}")
    assert client.get(f"/reports/{job_id}").status_code == 404


def test_invalid_body_422(client):
    assert client.post("/reports", json={**BODY, "radiusKm": 9999}).status_code == 422
    assert client.post("/reports", json={**BODY, "distanceMode": "flying"}).status_code == 422


def test_render_exception_marks_job_failed_with_safe_message(client, analysis):
    with (
        _patch_analysis(analysis),
        patch("app.services.report_jobs.render_report_pdf", side_effect=RuntimeError("secret")),
    ):
        job_id = client.post("/reports", json=BODY).json()["jobId"]
    status = client.get(f"/reports/{job_id}").json()
    assert status["status"] == "failed"
    assert "secret" not in status["error"]
    assert client.get(f"/reports/{job_id}/download").status_code == 409


def test_analysis_http_error_surfaces_detail(client):
    with _patch_analysis(error=HTTPException(status_code=404, detail="Address not found")):
        job_id = client.post("/reports", json={"address": "nowhere"}).json()["jobId"]
    status = client.get(f"/reports/{job_id}").json()
    assert status["status"] == "failed" and status["error"] == "Address not found"


def test_redis_unavailable_returns_503(client_no_redis):
    resp = client_no_redis.post("/reports", json=BODY)
    assert resp.status_code == 503
    assert "Retry-After" in resp.headers
    assert client_no_redis.get(f"/reports/{uuid.uuid4()}").status_code == 503


def test_concurrent_job_cap_returns_503_and_releases_slot(analysis):
    for client in _build_client(fakeredis.FakeRedis(decode_responses=True), max_in_flight=1):
        limiter = client.app.state.report_in_flight_limiter
        assert limiter.try_acquire()  # simulate a render already in flight
        assert client.post("/reports", json=BODY).status_code == 503
        limiter.release()
        with _patch_analysis(analysis):
            assert client.post("/reports", json=BODY).status_code == 202
        # slot was released after the job finished, so another one is accepted
        with _patch_analysis(analysis):
            assert client.post("/reports", json=BODY).status_code == 202


def test_job_ids_are_unique_uuid4(client, analysis):
    with _patch_analysis(analysis):
        ids = {client.post("/reports", json=BODY).json()["jobId"] for _ in range(3)}
    assert len(ids) == 3
    assert all(uuid.UUID(i).version == 4 for i in ids)


def test_api_key_enforced_when_configured(analysis):
    from app.config.settings import Settings

    for client in _build_client(fakeredis.FakeRedis(decode_responses=True)):
        client.app.dependency_overrides[get_settings] = lambda: Settings(api_shared_secret="s3")
        assert client.post("/reports", json=BODY).status_code == 401
        with _patch_analysis(analysis):
            ok = client.post("/reports", json=BODY, headers={"X-Internal-Api-Key": "s3"})
        assert ok.status_code == 202


@pytest.mark.parametrize(
    "address,expected",
    [
        ("12 Ōtūmoetai Rd, Tauranga", "intelligence-report-12-otumoetai-rd-tauranga.pdf"),
        ("../../etc/passwd", "intelligence-report-etc-passwd.pdf"),
        ("日本語", "intelligence-report.pdf"),
        ("x" * 200, "intelligence-report-" + "x" * 60 + ".pdf"),
    ],
)
def test_report_filename_is_ascii_safe(address, expected):
    assert report_filename(address) == expected
