import httpx
from app.config import settings

# v1 approach: a hand-curated synonym map for plumbing/water-engineering
# vocabulary, expanding a customer's natural-language query before handing
# it to apps/api's existing Postgres full-text search (see
# apps/api/src/modules/products/products.service.ts). This is genuinely
# useful — "leaking pipe under sink" alone would miss products titled with
# trade terminology like "compression fitting" — and it costs nothing to
# run.
#
# Upgrade path, when there's budget for it: swap this dictionary lookup for
# an embeddings-based query expansion (or an LLM call) — the function
# signature (query in, expanded query out) doesn't need to change, so
# nothing downstream breaks when that swap happens.
_SYNONYM_MAP: dict[str, list[str]] = {
    "leak": ["leak", "leaking", "drip", "pipe repair", "fitting"],
    "leaking": ["leak", "leaking", "drip", "pipe repair", "fitting"],
    "burst": ["burst", "pipe repair", "emergency", "coupling"],
    "blocked": ["blocked", "clogged", "drain", "hydro-jetting", "cctv drainage"],
    "clogged": ["blocked", "clogged", "drain", "hydro-jetting"],
    "geyser": ["geyser", "water heater", "hot water cylinder"],
    "hot water": ["geyser", "water heater", "hot water cylinder"],
    "backflow": ["backflow", "backflow prevention", "non-return valve"],
    "low pressure": ["low pressure", "booster pump", "pressure pump"],
    "pump": ["pump", "booster pump", "pressure pump"],
    "valve": ["valve", "ball valve", "isolation valve", "shut-off valve"],
}


def expand_query(query: str) -> str:
    lowered = query.lower()
    expansions: set[str] = set()
    for term, synonyms in _SYNONYM_MAP.items():
        if term in lowered:
            expansions.update(synonyms)

    if not expansions:
        return query  # no known domain terms matched — pass the original through unchanged

    return f"{query} {' '.join(sorted(expansions))}"


def _build_search_params(
    expanded_query: str,
    category_id: str | None,
    page: int,
    page_size: int,
    min_price: float | None,
    max_price: float | None,
    in_stock_only: bool | None,
    sort_by: str | None,
    brand: str | None,
) -> dict:
    params: dict = {"search": expanded_query, "page": page, "pageSize": page_size}
    if category_id:
        params["categoryId"] = category_id
    if min_price is not None:
        params["minPrice"] = min_price
    if max_price is not None:
        params["maxPrice"] = max_price
    if in_stock_only is not None:
        params["inStockOnly"] = str(in_stock_only).lower()  # apps/api parses the literal string 'true'/'false', not Python's True/False repr
    if sort_by:
        params["sortBy"] = sort_by
    if brand:
        params["brand"] = brand
    return params


async def search_products(
    expanded_query: str,
    category_id: str | None,
    page: int,
    page_size: int,
    min_price: float | None = None,
    max_price: float | None = None,
    in_stock_only: bool | None = None,
    sort_by: str | None = None,
    brand: str | None = None,
) -> dict:
    params = _build_search_params(
        expanded_query, category_id, page, page_size, min_price, max_price, in_stock_only, sort_by, brand
    )

    async with httpx.AsyncClient(base_url=settings.api_base_url, timeout=5.0) as client:
        response = await client.get("/v1/products", params=params)
        response.raise_for_status()
        return response.json()["data"]
