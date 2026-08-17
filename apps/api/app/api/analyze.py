import logging

import httpx
from fastapi import APIRouter, HTTPException, Request

from app.config.hazard_config import HAZARD_DISCLAIMER
from app.models.domain import Facility
from app.schemas.requests import AnalyzeRequest
from app.schemas.responses import (
    AnalyzeResponse,
    CategoryScoreResult,
    FacilityScoreResult,
    FeatureResult,
    HazardResult,
    HazardSubScoreResult,
    LocationResult,
    ScoreResult,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _effective_distance_km(facility: Facility) -> float | None:
    """Best-effort distance for the raw feature list. Best_of_both facilities
    (currently: railway stations) carry walk/drive legs instead of distance_km."""
    if facility.distance_km is not None:
        return facility.distance_km
    legs = [d for d in (facility.walk_distance_km, facility.drive_distance_km) if d is not None]
    return min(legs) if legs else None


@router.post("/location/analyze", response_model=AnalyzeResponse)
async def analyze_location(
    body: AnalyzeRequest,
    request: Request,
) -> AnalyzeResponse:
    geocoding_svc = request.app.state.geocoding_svc
    facilities_svc = request.app.state.facilities_svc
    distance_svc = request.app.state.distance_svc
    scoring_svc = request.app.state.scoring_svc

    warnings: list[str] = []

    # --- Step 1: Resolve coordinates ---
    lat = body.lat
    lon = body.lon
    display_name = body.address or ""

    if lat is None or lon is None:
        if not body.address:
            raise HTTPException(
                status_code=422,
                detail="Provide either lat/lon or a non-empty address",
            )
        try:
            result = await geocoding_svc.geocode_first(body.address)
        except httpx.HTTPError:
            raise HTTPException(status_code=502, detail="Address search service unavailable")

        if result is None:
            raise HTTPException(status_code=404, detail="Address not found")

        lat = result["lat"]
        lon = result["lon"]
        display_name = result["displayName"]
    elif body.address:
        display_name = body.address

    # --- Step 2: Resolve requested categories (None = use DB-configured defaults) ---
    categories = (
        body.categories
        if body.categories is not None
        else request.app.state.scoring_config.default_categories
    )

    # The schema only bounds shape (length/dedup) -- the real category set is
    # DB-loaded and only available here, so this is the authoritative check
    # against the confirmed "categories: [garbage]*N" abuse vector.
    known_categories = {c.id for c in request.app.state.scoring_config.categories}
    unknown_categories = set(categories) - known_categories
    if unknown_categories:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown categories: {sorted(unknown_categories)}",
        )

    # --- Step 3: Hazard lookup -- point-based, independent of categories/radius,
    # runs after category validation so an unknown-category request 422s before
    # any hazard DB lookup ---
    hazard_svc = request.app.state.hazard_svc
    hazard_result: HazardResult | None = None
    try:
        hazard_domain = await hazard_svc.score_point(lat, lon)
        if hazard_domain is None:
            warnings.append("No hazard grid coverage for this location yet")
        else:
            hazard_result = HazardResult(
                h3_index=hazard_domain.h3_index,
                resolution=hazard_domain.resolution,
                composite_score=hazard_domain.composite_score,
                worst_hazard_type=hazard_domain.worst_hazard_type,
                worst_hazard_score=hazard_domain.worst_hazard_score,
                any_severe=hazard_domain.any_severe,
                hazards=[
                    HazardSubScoreResult(
                        hazard_type=h.hazard_type,
                        score=h.score,
                        severe=h.severe,
                        is_proxy=h.is_proxy,
                        source_name=h.source_name,
                        licence=h.licence,
                        data_currency_date=h.data_currency_date,
                    )
                    for h in hazard_domain.hazards
                ],
                disclaimer=HAZARD_DISCLAIMER,
            )
    except Exception:
        logger.exception("Hazard lookup failed for lat=%s lon=%s", lat, lon)
        warnings.append("Hazard lookup temporarily unavailable")

    # --- Step 4: Fetch facilities for requested categories ---
    facilities, facility_warnings, failed_categories = await facilities_svc.fetch_all(
        categories, lat, lon, body.radius_km
    )
    warnings.extend(facility_warnings)

    successful_categories = set(categories) - failed_categories
    if not facilities and successful_categories:
        warnings.append("No facilities found within the configured scoring bounds")

    # --- Step 5: Compute distances (per-facility-type mode, see FACILITY_CONFIGS) ---
    if facilities:
        distance_warnings = await distance_svc.attach_distances(
            facilities, lat, lon, mode=body.distance_mode
        )
        warnings.extend(distance_warnings)

    # --- Step 6: Compute score ---
    domain_score = scoring_svc.score(facilities, categories, unavailable=failed_categories)

    # --- Assemble response ---
    feature_results = [
        FeatureResult(
            id=f.id,
            name=f.name,
            category=f.category,
            lat=f.lat,
            lon=f.lon,
            distanceKm=_effective_distance_km(f),
        )
        for f in facilities
    ]

    score_result = ScoreResult(
        overall=domain_score.overall,
        coverage=domain_score.coverage,
        categories=[
            CategoryScoreResult(
                category=cat.category,
                status=cat.status,
                score=cat.score,
                facilities=[
                    FacilityScoreResult(
                        facility_type=fac.facility_type,
                        status=fac.status,
                        score=fac.score,
                        nearest_distance_km=fac.nearest_distance_km,
                        count=fac.count,
                        explanation=fac.explanation,
                    )
                    for fac in cat.facilities
                ],
            )
            for cat in domain_score.categories
        ],
    )

    return AnalyzeResponse(
        location=LocationResult(lat=lat, lon=lon, displayName=display_name),
        features=feature_results,
        score=score_result,
        warnings=warnings,
        hazard=hazard_result,
    )
