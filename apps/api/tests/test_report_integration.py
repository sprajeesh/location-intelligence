"""End-to-end report tests through the real analyze pipeline.

Only the network edges (Overpass fetch, OSRM distances) are stubbed; scoring,
report-data building, PDF rendering and the job endpoints all run for real.
Content accuracy is checked by comparing the PDF with /location/analyze output
for the same input.
"""

import re
from io import BytesIO
from unittest.mock import AsyncMock, patch

import fakeredis.aioredis as fakeredis
import pytest
from pypdf import PdfReader

from app.models.domain import Facility
from tests.test_report_api import _build_client

LAT, LON = -36.848, 174.763


@pytest.fixture
def client():
    yield from _build_client(fakeredis.FakeRedis(decode_responses=True))


def _facility(i: int, category: str, distance_km: float, name: str | None = None) -> Facility:
    # ~1 km grid so the 100 m dedupe never merges synthetic POIs.
    return Facility(
        id=f"osm_node_{category}_{i}",
        name=name or f"{category.title()} {i}",
        category=category,
        lat=LAT + (i % 40) * 0.009,
        lon=LON + (i // 40) * 0.011,
        distance_km=distance_km,
    )


def _stub_network(facilities: list[Facility], warnings: list[str] | None = None):
    return (
        patch(
            "app.services.facilities.FacilitiesService.fetch_all",
            new=AsyncMock(return_value=(facilities, warnings or [], set())),
        ),
        patch(
            "app.services.distance.DistanceService.attach_distances",
            new=AsyncMock(return_value=[]),
        ),
    )


def _generate(client, facilities, body_extra=None, warnings=None):
    """Runs analyze and a report for the same body; returns (analysis_json, pdf_bytes)."""
    body = {
        "address": "1 Queen Street, Auckland",
        "lat": LAT,
        "lon": LON,
        "radiusKm": 10,
        "categories": ["schools", "gps"],
        **(body_extra or {}),
    }
    fetch, distances = _stub_network(facilities, warnings)
    with fetch, distances:
        analysis = client.post("/location/analyze", json=body)
        assert analysis.status_code == 200, analysis.text
        created = client.post("/reports", json=body)
        assert created.status_code == 202
    job_id = created.json()["jobId"]
    status = client.get(f"/reports/{job_id}").json()
    assert status["status"] == "ready", status
    pdf = client.get(f"/reports/{job_id}/download")
    assert pdf.status_code == 200
    return analysis.json(), pdf.content


def _text(pdf: bytes) -> str:
    raw = "\n".join(p.extract_text() for p in PdfReader(BytesIO(pdf)).pages)
    return re.sub(r"\s+", " ", raw)


# --- Content accuracy -------------------------------------------------------


def test_pdf_numbers_match_analyze_response(client):
    facilities = [
        _facility(0, "schools", 0.4, "Ponsonby Primary"),
        _facility(1, "schools", 1.1, "Grey Lynn School"),
        _facility(2, "gps", 6.5, "Distant Medical"),
    ]
    analysis, pdf = _generate(client, facilities)
    text = _text(pdf)

    score = analysis["score"]
    assert f"{score['overall']:.0f}" in text
    assert f"coverage {score['coverage']}" in text

    scored = [f for c in score["categories"] for f in c["facilities"] if f["status"] == "scored"]
    assert scored
    for f in scored:
        assert f"{f['proximity_score']:.1f}" in text
        assert f"{f['density_score']:.1f}" in text
        assert f"{f['count']} found" in text
    for feature in analysis["features"]:
        assert feature["name"] in text
        assert f"{feature['distanceKm']:.2f} km" in text


def test_low_score_facility_gets_hint_and_good_one_does_not(client):
    near_schools = [_facility(i, "schools", 0.15 + i * 0.05) for i in range(10)]
    far_gp = _facility(50, "gps", 8.0, "Distant Medical")
    _, pdf = _generate(client, [*near_schools, far_gp])
    text = _text(pdf)
    assert text.count("would add ~") == 1
    assert "no GPs" not in text and "nearest GP is 8.0 km away" in text


# --- Edge cases -------------------------------------------------------------


def test_no_facilities_still_produces_a_report(client):
    _, pdf = _generate(client, [])
    text = _text(pdf)
    assert "No facilities were found" in text
    assert "No facilities to list" in text
    assert "Address Intelligence Report" in text


def test_empty_categories_means_no_overall_score(client):
    analysis, pdf = _generate(client, [], {"categories": []})
    assert analysis["score"]["overall"] is None
    assert "no overall score" in _text(pdf)


def test_partial_coverage_is_reported_and_unscored_not_zero(client):
    analysis, pdf = _generate(client, [_facility(0, "schools", 0.5)], {"categories": ["schools"]})
    text = _text(pdf)
    assert f"coverage {analysis['score']['coverage']}" in text
    assert "Not scored" in text


def test_single_facility(client):
    _, pdf = _generate(client, [_facility(0, "schools", 0.3, "Only School")])
    assert "Only School" in _text(pdf)


def test_very_long_address_and_unicode(client):
    address = "Unit 12, " + "Whakarewarewa Ōtūmoetai Māngere " * 12 + "Rotorua"
    _, pdf = _generate(client, [_facility(0, "schools", 0.3)], {"address": address})
    text = _text(pdf)
    assert "Ōtūmoetai" in text and "Māngere" in text


def test_hundreds_of_facilities_paginate_and_complete(client):
    facilities = [_facility(i, "schools", 0.2 + (i % 50) * 0.1, f"School {i}") for i in range(600)]
    analysis, pdf = _generate(client, facilities, {"categories": ["schools"]})
    reader = PdfReader(BytesIO(pdf))
    assert len(reader.pages) > 10
    text = _text(pdf)
    assert "School 0" in text and "School 599" in text
    assert len(pdf) < 2_000_000


def test_osrm_fallback_warning_appears_in_report(client):
    warning = "OSRM unavailable: distances are straight-line estimates"
    _, pdf = _generate(client, [_facility(0, "schools", 0.5)], warnings=[warning])
    assert warning in _text(pdf)


def test_map_failure_does_not_fail_the_job(client):
    with patch("app.services.report_sections.build_map_drawing", side_effect=RuntimeError("x")):
        _, pdf = _generate(client, [_facility(0, "schools", 0.5)])
    text = _text(pdf)
    assert "map could not be drawn" in text
    assert "Facility appendix" in text


def test_unknown_category_fails_job_with_message(client):
    body = {"lat": LAT, "lon": LON, "categories": ["not_a_category"]}
    job_id = client.post("/reports", json=body).json()["jobId"]
    status = client.get(f"/reports/{job_id}").json()
    assert status["status"] == "failed"
    assert "Unknown categories" in status["error"]
