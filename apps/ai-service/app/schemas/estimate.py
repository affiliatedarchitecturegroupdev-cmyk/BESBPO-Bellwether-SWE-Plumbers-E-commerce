from pydantic import BaseModel


class EstimateRequest(BaseModel):
    description: str  # free-text job description, e.g. "leaking pipe under my kitchen sink"
    trade_pricing: bool = False


class EstimateResponse(BaseModel):
    matched_sector: str
    matched_service_code: str
    confidence: str  # "high" | "low" — see app/services/estimate_service.py
    suggested_multiplier_codes: list[str]
    # The actual priced quote — this service classifies the request, then
    # calls apps/api's pricing engine (POST /v1/pricing/quote) rather than
    # computing a price itself. There is exactly one place pricing logic
    # lives, and it isn't here.
    quote: dict | None
    note: str
