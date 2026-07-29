import httpx
from app.config import settings
from app.services import llm_client

# v1 rule-based approach, now the FALLBACK rather than the only path — see
# classify() below. Kept as-is deliberately: llm_client's tool-forced
# classification can only choose from these same sectors/service codes/
# multipliers (derived from this exact list), so this remains the single
# source of truth for what's actually valid, not a second, drifting copy.
_CLASSIFICATION_RULES: list[tuple[list[str], str, str, list[str]]] = [
    (["leak", "leaking", "drip", "dripping"], "Residential", "PIPE_REPAIR", []),
    (["burst", "flooding"], "Residential", "PIPE_REPAIR", ["AFTER_HOURS"]),
    (["blocked", "clogged", "drain"], "Residential", "DRAIN_CLEARING", []),
    (["geyser", "water heater", "hot water"], "Residential", "WATER_HEATING_INSTALL", []),
    (["backflow", "contamination", "process water"], "Industrial", "BACKFLOW_PREVENTION", []),
    (["booster", "low pressure", "pump station"], "Commercial", "BOOSTER_PUMP_INSTALL", []),
    (["trench", "civil", "site-wide", "municipal"], "Civil", "TRENCHING_CIVIL", ["MULTI_STOREY"]),
]
_DEFAULT = ("Residential", "GENERAL_CALLOUT", [])

_KNOWN_SECTORS = sorted({sector for _, sector, _, _ in _CLASSIFICATION_RULES} | {_DEFAULT[0]})
_KNOWN_SERVICE_CODES = sorted({code for _, _, code, _ in _CLASSIFICATION_RULES} | {_DEFAULT[1]})
_KNOWN_MULTIPLIER_CODES = sorted({m for _, _, _, ms in _CLASSIFICATION_RULES for m in ms})


async def classify(description: str) -> tuple[str, str, list[str], str]:
    # Tried first, not exclusively — llm_client.classify_with_tool returns
    # None on missing config, a network failure, or a malformed response,
    # and this falls straight through to the same rule-based logic that
    # was the only path before llm_client existed. A customer's estimate
    # request never fails outright just because the LLM call didn't work.
    llm_result = await llm_client.classify_with_tool(
        description, _KNOWN_SECTORS, _KNOWN_SERVICE_CODES, _KNOWN_MULTIPLIER_CODES
    )
    if llm_result is not None:
        try:
            return (
                llm_result["sector"],
                llm_result["service_code"],
                list(llm_result["multiplier_codes"]),
                llm_result["confidence"],
            )
        except (KeyError, TypeError):
            pass  # Malformed tool input despite the schema — fall through rather than crash on it.

    lowered = description.lower()
    for keywords, sector, service_code, multipliers in _CLASSIFICATION_RULES:
        if any(keyword in lowered for keyword in keywords):
            return sector, service_code, multipliers, "high"

    sector, service_code, multipliers = _DEFAULT
    return sector, service_code, multipliers, "low"


async def get_quote(sector: str, service_code: str, multiplier_codes: list[str], trade_pricing: bool) -> dict | None:
    payload = {
        "sector": sector,
        "serviceCode": service_code,
        "complexityMultiplierCodes": multiplier_codes,
        "tradePricing": trade_pricing,
    }
    async with httpx.AsyncClient(base_url=settings.api_base_url, timeout=5.0) as client:
        try:
            response = await client.post("/v1/pricing/quote", json=payload)
            response.raise_for_status()
            return response.json()["data"]
        except httpx.HTTPStatusError:
            # No price-book entry for this sector/service yet — a real gap
            # (the price book needs that row), not something to paper over
            # with a guessed number. Caller returns None + an honest note.
            return None
