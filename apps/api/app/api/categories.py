from fastapi import APIRouter

from app.schemas.responses import CategoryInfo

router = APIRouter()

CATEGORIES: list[CategoryInfo] = [
    CategoryInfo(id="schools", label="Schools", implemented=True, color="#F59E0B"),
    CategoryInfo(id="bus_stops", label="Bus Stops", implemented=True, color="#14B8A6"),
    CategoryInfo(id="hospitals", label="Hospitals", implemented=False, color="#EF4444"),
    CategoryInfo(id="universities", label="Universities", implemented=False, color="#8B5CF6"),
    CategoryInfo(id="supermarkets", label="Supermarkets", implemented=False, color="#10B981"),
    CategoryInfo(id="parks", label="Parks", implemented=False, color="#22C55E"),
    CategoryInfo(id="libraries", label="Libraries", implemented=False, color="#3B82F6"),
    CategoryInfo(id="pharmacies", label="Pharmacies", implemented=False, color="#EC4899"),
]


@router.get("/categories", response_model=list[CategoryInfo])
async def list_categories() -> list[CategoryInfo]:
    return CATEGORIES
