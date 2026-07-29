from fastapi import APIRouter
from app.schemas.search import SearchRankRequest, SearchRankResponse
from app.services import search_service

router = APIRouter(prefix="/search-rank", tags=["search"])


@router.post("", response_model=SearchRankResponse)
async def search_rank(req: SearchRankRequest):
    expanded = search_service.expand_query(req.query)
    results = await search_service.search_products(
        expanded,
        req.category_id,
        req.page,
        req.page_size,
        min_price=req.min_price,
        max_price=req.max_price,
        in_stock_only=req.in_stock_only,
        sort_by=req.sort_by,
        brand=req.brand,
    )
    return SearchRankResponse(original_query=req.query, expanded_query=expanded, results=results)
