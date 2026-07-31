from fastapi import APIRouter, Request

from app.schemas.responses import CategoryInfo

router = APIRouter()


@router.get("/categories", response_model=list[CategoryInfo])
async def list_categories(request: Request) -> list[CategoryInfo]:
    return request.app.state.scoring_config.categories
