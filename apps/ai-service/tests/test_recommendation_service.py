from unittest.mock import AsyncMock, patch

from app.services.recommendation_service import recommend

# fetch_all is called up to 3 times per recommend() call, in a fixed
# order: order co-occurrence, then bundle co-occurrence, then
# same-category — side_effect as a list matches each call to its
# position, which is simpler to set up correctly than trying to
# distinguish calls by inspecting the SQL string each was given.


def _row(product_id: str, name: str, slug: str) -> dict:
    return {"product_id": product_id, "name": name, "slug": slug}


async def test_order_cooccurrence_is_used_first_and_labeled_correctly():
    with patch(
        "app.services.recommendation_service.fetch_all",
        new=AsyncMock(side_effect=[[_row("p2", "Ball Valve", "ball-valve")], [], []]),
    ):
        results = await recommend(session=None, product_id="p1", limit=4)

    assert len(results) == 1
    assert results[0].product_id == "p2"
    assert results[0].reason == "frequently bought together"


async def test_bundle_cooccurrence_fills_in_when_order_signal_is_short():
    with patch(
        "app.services.recommendation_service.fetch_all",
        new=AsyncMock(
            side_effect=[
                [_row("p2", "Ball Valve", "ball-valve")],
                [_row("p3", "Pipe Sealant", "pipe-sealant")],
                [],
            ]
        ),
    ):
        results = await recommend(session=None, product_id="p1", limit=2)

    assert [r.product_id for r in results] == ["p2", "p3"]
    assert results[1].reason == "frequently bundled together"


async def test_same_category_only_fills_whatever_is_still_missing():
    with patch(
        "app.services.recommendation_service.fetch_all",
        new=AsyncMock(
            side_effect=[
                [],
                [],
                [_row("p4", "Copper Elbow", "copper-elbow")],
            ]
        ),
    ):
        results = await recommend(session=None, product_id="p1", limit=3)

    assert len(results) == 1
    assert results[0].reason == "same category"


async def test_a_product_already_returned_by_a_stronger_signal_is_not_duplicated_by_a_weaker_one():
    with patch(
        "app.services.recommendation_service.fetch_all",
        new=AsyncMock(
            side_effect=[
                [_row("p2", "Ball Valve", "ball-valve")],
                [_row("p2", "Ball Valve", "ball-valve"), _row("p3", "Pipe Sealant", "pipe-sealant")],
                [],
            ]
        ),
    ):
        results = await recommend(session=None, product_id="p1", limit=5)

    product_ids = [r.product_id for r in results]
    assert product_ids.count("p2") == 1
    assert "p3" in product_ids


async def test_never_recommends_the_product_itself_even_if_a_query_somehow_returned_it():
    # Shouldn't happen given the real SQL's own productId != productId join
    # condition — this proves recommend()'s own seen_ids guard would catch
    # it regardless, not just rely on the SQL alone. Mixed with a genuine
    # other result so the assertion is meaningful: an all() check over an
    # empty list would pass vacuously and prove nothing.
    with patch(
        "app.services.recommendation_service.fetch_all",
        new=AsyncMock(
            side_effect=[[_row("p1", "Same Product", "same-product"), _row("p2", "Ball Valve", "ball-valve")], [], []]
        ),
    ):
        results = await recommend(session=None, product_id="p1", limit=3)

    assert len(results) == 1
    assert results[0].product_id == "p2"


async def test_stops_calling_weaker_signals_once_the_limit_is_already_met():
    fetch_mock = AsyncMock(
        side_effect=[
            [_row("p2", "A", "a"), _row("p3", "B", "b")],
        ]
    )
    with patch("app.services.recommendation_service.fetch_all", new=fetch_mock):
        results = await recommend(session=None, product_id="p1", limit=2)

    assert len(results) == 2
    assert fetch_mock.call_count == 1
