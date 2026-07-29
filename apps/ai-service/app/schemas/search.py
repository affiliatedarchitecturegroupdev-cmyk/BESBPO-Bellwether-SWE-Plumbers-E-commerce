from pydantic import BaseModel


class SearchRankRequest(BaseModel):
    query: str
    category_id: str | None = None
    page: int = 1
    page_size: int = 24
    # Passed straight through to apps/api's own GET /v1/products — this
    # service never filters/sorts itself, only expands the query text (see
    # app/services/search_service.py). Kept in sync manually with
    # apps/api's QueryProductsDto; there's no shared-types package between
    # the two languages (see docs/GAP-ANALYSIS-III-FEATURE-EXPANSION.md).
    min_price: float | None = None
    max_price: float | None = None
    in_stock_only: bool | None = None
    sort_by: str | None = None
    brand: str | None = None


class SearchRankResponse(BaseModel):
    original_query: str
    expanded_query: str
    # The actual ranked results — this service doesn't re-implement ranking,
    # it expands the query and delegates to apps/api's Postgres full-text
    # search (see app/services/search_service.py for why).
    results: dict
