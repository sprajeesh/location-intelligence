from fastapi import APIRouter, Request

from app.schemas.responses import CategoryInfo

router = APIRouter()


@router.get("/categories", response_model=list[CategoryInfo])
async def list_categories(request: Request) -> list[CategoryInfo]:
    return request.app.state.scoring_config.categories


@router.get("/category-weights", response_model=dict[str, float])
async def get_category_weights(request: Request) -> dict[str, float]:
    """Default composite-category weights (education, transport, ...), DB-configured.
    Used by the frontend to seed the Settings weight sliders -- see AnalyzeRequest.category_weights
    for how a client overrides these per-request."""
    return request.app.state.scoring_config.category_weights
