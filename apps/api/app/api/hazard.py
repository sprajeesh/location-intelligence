import json

from fastapi import APIRouter, HTTPException, Query, Request

router = APIRouter()


def _parse_bbox(bbox: str) -> tuple[float, float, float, float]:
    parts = bbox.split(",")
    if len(parts) != 4:
        raise HTTPException(status_code=422, detail="bbox must be minLon,minLat,maxLon,maxLat")
    try:
        min_lon, min_lat, max_lon, max_lat = (float(p) for p in parts)
    except ValueError:
        raise HTTPException(status_code=422, detail="bbox must be minLon,minLat,maxLon,maxLat")
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
    rows = await hazard_repo.fetch_cells_in_bbox(min_lon, min_lat, max_lon, max_lat)

    features = []
    for row in rows:
        raw_hazards = row["hazards"]
        hazards = json.loads(raw_hazards) if isinstance(raw_hazards, str) else raw_hazards
        if not hazards:
            continue

        composite = sum(h["score"] for h in hazards) / len(hazards)
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
