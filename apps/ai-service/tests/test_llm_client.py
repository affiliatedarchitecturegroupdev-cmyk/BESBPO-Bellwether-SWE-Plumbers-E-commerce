from unittest.mock import AsyncMock, MagicMock, patch

from app.services import llm_client

_SECTORS = ["Residential", "Industrial", "Commercial", "Civil"]
_SERVICE_CODES = ["PIPE_REPAIR", "DRAIN_CLEARING", "GENERAL_CALLOUT"]
_MULTIPLIER_CODES = ["AFTER_HOURS", "MULTI_STOREY"]


def _mock_client(response_json=None, raise_status_error=None):
    """Builds a mock matching `async with httpx.AsyncClient(...) as client`
    — the async-context-manager shape is the fiddly part to get right by
    hand; this is the one place that complexity lives so every test below
    stays simple.
    """
    mock_response = MagicMock()
    if raise_status_error:
        mock_response.raise_for_status = MagicMock(side_effect=raise_status_error)
    else:
        mock_response.raise_for_status = MagicMock()
        mock_response.json = MagicMock(return_value=response_json)

    mock_client_instance = AsyncMock()
    mock_client_instance.post = AsyncMock(return_value=mock_response)
    mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_client_instance.__aexit__ = AsyncMock(return_value=False)
    return mock_client_instance


async def test_returns_none_without_calling_out_at_all_when_not_configured(monkeypatch):
    monkeypatch.setattr("app.config.settings.anthropic_api_key", None)

    with patch("app.services.llm_client.httpx.AsyncClient") as mock_client_class:
        result = await llm_client.classify_with_tool("a leak", _SECTORS, _SERVICE_CODES, _MULTIPLIER_CODES)

    assert result is None
    mock_client_class.assert_not_called()


async def test_sends_tool_forced_request_with_the_real_enum_constraints(monkeypatch):
    monkeypatch.setattr("app.config.settings.anthropic_api_key", "test-key")
    mock_instance = _mock_client(response_json={"content": []})

    with patch("app.services.llm_client.httpx.AsyncClient", return_value=mock_instance):
        await llm_client.classify_with_tool("a leak", _SECTORS, _SERVICE_CODES, _MULTIPLIER_CODES)

    _, kwargs = mock_instance.post.call_args
    assert kwargs["headers"]["x-api-key"] == "test-key"
    assert kwargs["json"]["tool_choice"] == {"type": "tool", "name": "classify_plumbing_request"}
    tool = kwargs["json"]["tools"][0]
    assert tool["input_schema"]["properties"]["sector"]["enum"] == _SECTORS
    assert tool["input_schema"]["properties"]["service_code"]["enum"] == _SERVICE_CODES


async def test_parses_a_real_tool_use_response_block(monkeypatch):
    monkeypatch.setattr("app.config.settings.anthropic_api_key", "test-key")
    mock_instance = _mock_client(
        response_json={
            "content": [
                {"type": "text", "text": "Let me classify this."},
                {
                    "type": "tool_use",
                    "name": "classify_plumbing_request",
                    "input": {
                        "sector": "Residential",
                        "service_code": "PIPE_REPAIR",
                        "multiplier_codes": ["AFTER_HOURS"],
                        "confidence": "high",
                    },
                },
            ]
        }
    )

    with patch("app.services.llm_client.httpx.AsyncClient", return_value=mock_instance):
        result = await llm_client.classify_with_tool("a leak", _SECTORS, _SERVICE_CODES, _MULTIPLIER_CODES)

    assert result == {
        "sector": "Residential",
        "service_code": "PIPE_REPAIR",
        "multiplier_codes": ["AFTER_HOURS"],
        "confidence": "high",
    }


async def test_returns_none_on_a_non_2xx_response_rather_than_raising(monkeypatch):
    monkeypatch.setattr("app.config.settings.anthropic_api_key", "test-key")
    import httpx

    mock_instance = _mock_client(raise_status_error=httpx.HTTPStatusError("bad", request=None, response=None))

    with patch("app.services.llm_client.httpx.AsyncClient", return_value=mock_instance):
        result = await llm_client.classify_with_tool("a leak", _SECTORS, _SERVICE_CODES, _MULTIPLIER_CODES)

    assert result is None


async def test_returns_none_when_no_tool_use_block_is_present(monkeypatch):
    monkeypatch.setattr("app.config.settings.anthropic_api_key", "test-key")
    mock_instance = _mock_client(response_json={"content": [{"type": "text", "text": "I refuse to classify this."}]})

    with patch("app.services.llm_client.httpx.AsyncClient", return_value=mock_instance):
        result = await llm_client.classify_with_tool("a leak", _SECTORS, _SERVICE_CODES, _MULTIPLIER_CODES)

    assert result is None
