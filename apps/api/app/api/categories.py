from fastapi import APIRouter

from app.schemas.responses import CategoryInfo

router = APIRouter()

CATEGORIES: list[CategoryInfo] = [
    CategoryInfo(id="schools", label="Schools", implemented=True, color="#F59E0B"),
    CategoryInfo(id="kindergartens", label="Kindergartens", implemented=True, color="#FB923C"),
    CategoryInfo(id="bus_stops", label="Bus Stops", implemented=True, color="#14B8A6"),
    CategoryInfo(
        id="railway_stations", label="Railway Stations", implemented=True, color="#0EA5E9"
    ),
    CategoryInfo(id="hospitals", label="Hospitals", implemented=True, color="#EF4444"),
    CategoryInfo(id="universities", label="Universities", implemented=True, color="#8B5CF6"),
    CategoryInfo(id="supermarkets", label="Supermarkets", implemented=True, color="#10B981"),
    CategoryInfo(id="parks", label="Parks", implemented=True, color="#22C55E"),
    CategoryInfo(id="playgrounds", label="Playgrounds", implemented=True, color="#A3E635"),
    CategoryInfo(id="libraries", label="Libraries", implemented=True, color="#3B82F6"),
    CategoryInfo(id="pharmacies", label="Pharmacies", implemented=True, color="#EC4899"),
]


@router.get("/categories", response_model=list[CategoryInfo])
async def list_categories() -> list[CategoryInfo]:
    return CATEGORIES
