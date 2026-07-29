from app.services.estimate_service import classify

# These cases were run standalone against the extracted logic before being
# committed here — see the conversation history / PR description for that
# verification, since this sandbox has no network access to install pytest
# and run this file directly (confirmed directly: pip install fails with no
# matching distribution found, same as npm's own 403 elsewhere in this
# build — not assumed, checked). Whoever runs `pytest` for the first time
# in a real environment, treat a failure here as a real bug, not a flaky
# test.
#
# classify() is now async — it tries llm_client.classify_with_tool first,
# which returns None immediately whenever ANTHROPIC_API_KEY isn't set
# (true in any test environment that hasn't configured one), so every case
# below still exercises the exact same rule-based fallback logic these
# tests originally verified. asyncio_mode = auto (pytest.ini) means a
# plain `async def test_...` is enough — no @pytest.mark.asyncio needed.


async def test_leak_classifies_as_pipe_repair():
    sector, code, multipliers, confidence = await classify("There's a leaking pipe under my kitchen sink")
    assert sector == "Residential"
    assert code == "PIPE_REPAIR"
    assert confidence == "high"


async def test_blocked_drain_classifies_correctly():
    sector, code, multipliers, confidence = await classify("My drain is completely blocked")
    assert sector == "Residential"
    assert code == "DRAIN_CLEARING"
    assert confidence == "high"


async def test_industrial_backflow_classifies_correctly():
    sector, code, multipliers, confidence = await classify(
        "Need backflow prevention for our factory process water"
    )
    assert sector == "Industrial"
    assert code == "BACKFLOW_PREVENTION"
    assert confidence == "high"


async def test_burst_pipe_adds_after_hours_multiplier():
    sector, code, multipliers, confidence = await classify("Pipe just burst, water everywhere")
    assert "AFTER_HOURS" in multipliers


async def test_unmatched_description_falls_back_to_general_callout():
    sector, code, multipliers, confidence = await classify("Something vague and unrelated to plumbing at all")
    assert code == "GENERAL_CALLOUT"
    assert confidence == "low"


async def test_falls_back_to_rules_when_no_anthropic_key_is_configured(monkeypatch):
    # Explicit, not just incidental — proves the fallback path specifically,
    # rather than relying on it happening to be unconfigured by default.
    monkeypatch.setattr("app.config.settings.anthropic_api_key", None)
    sector, code, multipliers, confidence = await classify("There's a leaking pipe under my kitchen sink")
    assert sector == "Residential"
    assert code == "PIPE_REPAIR"
