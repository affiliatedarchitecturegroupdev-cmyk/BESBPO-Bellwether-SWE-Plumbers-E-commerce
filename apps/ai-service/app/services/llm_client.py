"""Thin client for Anthropic's Messages API, used for structured
classification tasks — currently just estimate_service's plumbing-issue
classifier. Deliberately NOT the anthropic Python SDK: this service uses
httpx for every other external call, so a raw httpx call against the
documented Messages API avoids adding a second HTTP client convention
for one integration.

Same graceful-degradation shape as every other optional integration in
this codebase (PayFast, ShipLogic, BulkSMS on the Node side): returns
None rather than raising on missing config or any failure, so a caller
always has a real, honest fallback path rather than a crash.
"""

import httpx
from app.config import settings

_MESSAGES_URL = "https://api.anthropic.com/v1/messages"
_ANTHROPIC_VERSION = "2023-06-01"
# Haiku, deliberately — this is a single-shot structured classification
# call (pick one sector, one service code, zero or more multipliers from
# small known lists), not a task needing deep reasoning. Using the
# cheapest, fastest model that can reliably do structured tool-calling is
# the right engineering call here, not a cost-cutting compromise.
_MODEL = "claude-haiku-4-5-20251001"


def is_configured() -> bool:
    return bool(settings.anthropic_api_key)


async def classify_with_tool(
    description: str,
    sectors: list[str],
    service_codes: list[str],
    multiplier_codes: list[str],
) -> dict | None:
    """Asks the model to classify a free-text plumbing issue description
    into a real, KNOWN sector/service_code/multiplier_codes combination —
    tool_choice forces it to actually call the tool, and the enum
    constraints on each field mean the model literally cannot return a
    sector or service code that doesn't exist in this deployment's price
    book. Returns None — never raises — on missing config, a network
    failure, a non-2xx response, or a response shape that doesn't match
    what was asked for; the caller (estimate_service.classify) always
    has a rule-based fallback ready.
    """
    if not settings.anthropic_api_key:
        return None

    tool = {
        "name": "classify_plumbing_request",
        "description": (
            "Classify a customer's plumbing issue description into the correct "
            "service sector, service code, and any applicable complexity multipliers."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "sector": {"type": "string", "enum": sectors},
                "service_code": {"type": "string", "enum": service_codes},
                "multiplier_codes": {
                    "type": "array",
                    "items": {"type": "string", "enum": multiplier_codes},
                    "description": "Any complexity multipliers that apply, based on details in the description (e.g. after-hours, multi-storey access). Empty array if none apply.",
                },
                "confidence": {
                    "type": "string",
                    "enum": ["high", "medium", "low"],
                    "description": "How confident this classification is, given how much detail the description actually provided.",
                },
            },
            "required": ["sector", "service_code", "multiplier_codes", "confidence"],
        },
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(
                _MESSAGES_URL,
                headers={
                    "x-api-key": settings.anthropic_api_key,
                    "anthropic-version": _ANTHROPIC_VERSION,
                    "content-type": "application/json",
                },
                json={
                    "model": _MODEL,
                    "max_tokens": 300,
                    "tools": [tool],
                    "tool_choice": {"type": "tool", "name": "classify_plumbing_request"},
                    "messages": [{"role": "user", "content": description}],
                },
            )
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, ValueError):
        return None

    for block in data.get("content", []):
        if block.get("type") == "tool_use" and block.get("name") == "classify_plumbing_request":
            return block.get("input")
    return None
