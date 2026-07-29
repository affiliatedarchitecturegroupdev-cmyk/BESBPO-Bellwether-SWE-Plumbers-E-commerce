from fastapi import APIRouter
from app.schemas.estimate import EstimateRequest, EstimateResponse
from app.services import estimate_service

router = APIRouter(prefix="/estimate", tags=["estimate"])

_LOW_CONFIDENCE_NOTE = (
    "Couldn't confidently match this description to a service — showing a general "
    "callout estimate. A field team will confirm the actual scope and price."
)
_MEDIUM_CONFIDENCE_NOTE = (
    "Estimate based on the description provided, though some details were unclear — "
    "final price confirmed on-site."
)
_HIGH_CONFIDENCE_NOTE = "Estimate based on the description provided — final price confirmed on-site."
_NO_PRICE_BOOK_NOTE = "No price book entry exists yet for this sector/service combination."


@router.post("", response_model=EstimateResponse)
async def estimate(req: EstimateRequest):
    sector, service_code, multiplier_codes, confidence = await estimate_service.classify(req.description)
    quote = await estimate_service.get_quote(sector, service_code, multiplier_codes, req.trade_pricing)

    if quote is None:
        note = _NO_PRICE_BOOK_NOTE
    elif confidence == "high":
        note = _HIGH_CONFIDENCE_NOTE
    elif confidence == "medium":
        note = _MEDIUM_CONFIDENCE_NOTE
    else:
        note = _LOW_CONFIDENCE_NOTE

    return EstimateResponse(
        matched_sector=sector,
        matched_service_code=service_code,
        confidence=confidence,
        suggested_multiplier_codes=multiplier_codes,
        quote=quote,
        note=note,
    )
