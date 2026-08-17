import json

from fastapi import APIRouter, HTTPException, Query, Request

from app.services.hazard_scoring import weighted_composite_score

router = APIRouter()

# 5 degrees comfortably covers a full-country map viewport (NZ spans ~13deg
# longitude end to end) while bounding the ST_Intersects row-fanout in
# fetch_cells_in_bbox against a client requesting the entire grid at once.
MAX_BBOX_SPAN_DEGREES = 5.0


def _parse_bbox(bbox: str) -> tuple[float, float, float, float]:
    parts = bbox.split(",")
    if len(parts) != 4:
        raise HTTPException(status_code=422, detail="bbox must be minLon,minLat,maxLon,maxLat")
    try:
        min_lon, min_lat, max_lon, max_lat = (float(p) for p in parts)
    except ValueError:
        raise HTTPException(status_code=422, detail="bbox must be minLon,minLat,maxLon,maxLat")

    if not (-180.0 <= min_lon <= 180.0 and -180.0 <= max_lon <= 180.0):
        raise HTTPException(status_code=422, detail="bbox longitudes must be between -180 and 180")
    if not (-90.0 <= min_lat <= 90.0 and -90.0 <= max_lat <= 90.0):
        raise HTTPException(status_code=422, detail="bbox latitudes must be between -90 and 90")
    if min_lon >= max_lon or min_lat >= max_lat:
        raise HTTPException(status_code=422, detail="bbox min values must be less than max values")
    if max_lon - min_lon > MAX_BBOX_SPAN_DEGREES or max_lat - min_lat > MAX_BBOX_SPAN_DEGREES:
        raise HTTPException(
            status_code=422,
            detail=f"bbox span must not exceed {MAX_BBOX_SPAN_DEGREES} degrees",
        )

    return min_lon, min_lat, max_lon, max_lat


@router.get("/hazard/cells")
async def get_hazard_cells(
    request: Request,
    bbox: str = Query(..., description="minLon,minLat,maxLon,maxLat"),
) -> dict:
    """GeoJSON FeatureCollection of H3 hazard cells intersecting bbox, for the
    map layer. Properties are emitted already-camelCase (unlike the rest of
    this API's snake_case-alias convention) since this is a bulk/tile-like
    payload where per-record remapping client-side would be wasteful."""
    min_lon, min_lat, max_lon, max_lat = _parse_bbox(bbox)

    hazard_repo = request.app.state.hazard_repo
    hazard_types = request.app.state.hazard_config.hazard_types
    rows = await hazard_repo.fetch_cells_in_bbox(min_lon, min_lat, max_lon, max_lat)

    features = []
    for row in rows:
        raw_hazards = row["hazards"]
        hazards = json.loads(raw_hazards) if isinstance(raw_hazards, str) else raw_hazards
        if not hazards:
            continue

        composite = weighted_composite_score(
            [h["score"] for h in hazards],
            [hazard_types[h["hazard_type_slug"]].default_weight for h in hazards],
        )
        worst = max(hazards, key=lambda h: h["score"])

        features.append(
            {
                "type": "Feature",
                "geometry": json.loads(row["geom_json"]),
                "properties": {
                    "cellId": row["h3_index"],
                    "resolution": row["resolution"],
                    "composite": round(composite, 1),
                    "worstHazard": worst["score"],
                    "worstHazardType": worst["hazard_type_slug"],
                    "anySevere": any(h["severe"] for h in hazards),
                    "hazards": [
                        {
                            "hazardType": h["hazard_type_slug"],
                            "score": h["score"],
                            "isProxy": h["is_proxy"],
                            "isSevere": h["severe"],
                            "currencyDate": str(h["data_currency_date"]),
                            "source": h["source_name"],
                        }
                        for h in hazards
                    ],
                },
            }
        )

    return {"type": "FeatureCollection", "features": features}
