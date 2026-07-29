from sqlalchemy.ext.asyncio import AsyncSession
from app.db import fetch_all
from app.schemas.recommend import RecommendedProduct

# Three signals, tried in order of strength, each filling in whatever the
# stronger ones didn't: real order-purchase co-occurrence (actual customer
# behavior — the strongest signal, once real order volume exists to draw
# it from), curated bundle composition (a human already decided these
# belong together — real, zero-cost, but a human's judgment rather than
# demonstrated behavior), and same-category (the weakest signal, used only
# to fill out the list when neither of the above returns enough).
#
# This was v1's own stated upgrade path before it was built — see the
# original comment this replaced: "Once real order volume exists, add a
# second query here scoring by order-level co-occurrence and blend it
# in — the service's public interface (recommend()) doesn't need to
# change for that." It didn't.

_ORDER_COOCCURRENCE_QUERY = """
    SELECT oli2."productId" AS product_id, p.name, p.slug, COUNT(*) AS co_purchase_count
    FROM order_line_items oli1
    JOIN order_line_items oli2 ON oli1."orderId" = oli2."orderId" AND oli1."productId" != oli2."productId"
    JOIN orders o ON o.id = oli1."orderId"
    JOIN products p ON p.id = oli2."productId"
    -- CANCELLED/REFUNDED orders aren't genuine "bought together" signal —
    -- the purchase didn't actually stick, so counting it would be noise,
    -- not behavior.
    WHERE oli1."productId" = :product_id AND o.status NOT IN ('CANCELLED', 'REFUNDED')
    GROUP BY oli2."productId", p.name, p.slug
    -- A minimum support threshold, not just "any co-occurrence at all" —
    -- one single coincidental co-purchase (two unrelated items in the same
    -- order by chance) shouldn't outrank curated bundle composition. 2 is
    -- a deliberately low bar for a platform that may still have thin order
    -- volume, not a claim that 2 is definitively "enough" in general.
    HAVING COUNT(*) >= 2
    ORDER BY co_purchase_count DESC
    LIMIT :limit
"""

_BUNDLE_COOCCURRENCE_QUERY = """
    SELECT DISTINCT p.id AS product_id, p.name, p.slug
    FROM bundle_items bi1
    JOIN bundle_items bi2 ON bi1."bundleId" = bi2."bundleId" AND bi1."productId" != bi2."productId"
    JOIN products p ON p.id = bi2."productId"
    WHERE bi1."productId" = :product_id
    LIMIT :limit
"""

_SAME_CATEGORY_QUERY = """
    SELECT p2.id AS product_id, p2.name, p2.slug
    FROM products p1
    JOIN products p2 ON p2."categoryId" = p1."categoryId" AND p2.id != p1.id
    WHERE p1.id = :product_id
    LIMIT :limit
"""


async def recommend(session: AsyncSession, product_id: str, limit: int) -> list[RecommendedProduct]:
    results: list[RecommendedProduct] = []
    seen_ids = {product_id}

    async def _fill_from(query: str, reason: str) -> None:
        if len(results) >= limit:
            return
        remaining = limit - len(results)
        rows = await fetch_all(session, query, {"product_id": product_id, "limit": remaining + len(seen_ids)})
        for row in rows:
            if row["product_id"] in seen_ids:
                continue
            results.append(RecommendedProduct(product_id=row["product_id"], name=row["name"], slug=row["slug"], reason=reason))
            seen_ids.add(row["product_id"])
            if len(results) >= limit:
                break

    await _fill_from(_ORDER_COOCCURRENCE_QUERY, "frequently bought together")
    await _fill_from(_BUNDLE_COOCCURRENCE_QUERY, "frequently bundled together")
    await _fill_from(_SAME_CATEGORY_QUERY, "same category")

    return results[:limit]
