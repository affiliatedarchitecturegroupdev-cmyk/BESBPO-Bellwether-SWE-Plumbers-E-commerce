# Catalog Import — Policy Decisions & Process

The Bellwether SWE product catalog (`Bellwether_SWE_Products_Catalogue.xlsx`,
10,250 rows) needed four real policy decisions before it could be loaded —
none of them purely technical. This document records what was decided, why,
and what a human should revisit later. `prisma/import-catalog.ts` is the
script that actually loads the result; it defers to this document for
rationale rather than re-explaining it inline.

## Why this took a pass through analysis first

The raw feed shows several signs of being synthetically generated rather
than organically curated: every row's `Created Date` falls within the same
~2-minute window, category counts are suspiciously round (1000, 900, 800...),
`Description` is 100% identical boilerplate ("Premium plumbing product -
{name}") across all 10,250 rows, and `Unit` is 100% "Piece." None of that
makes the data unusable — the product names, categories, brands, prices, and
specifications are all real, usable content — but it's worth naming
directly rather than treating the feed as if it came from a live,
organically-maintained inventory system.

## The four decisions

### 1. Trade price

**No trade/retail split existed in the raw feed at all** — just one `Price
(ZAR)` column. `Product.tradePrice` is a required field.

**Decision:** `tradePrice = retailPrice × 0.85` (a 15% trade discount),
rounded to the nearest cent.

**Reasoning:** 15% is a reasonable, industry-typical starting point for a
trade/wholesale discount in building-materials distribution — not a
business decision this import is trying to make permanently. Every
imported product's trade price is independently editable afterward via the
existing admin product edit page, exactly like any product created by
hand. If Bellwether's real trade margin differs by category or supplier
relationship, that's a normal post-import editing pass, not a reason to
delay the import itself.

### 2. Duplicate products

**1,468 groups (3,227 of the 10,250 rows) shared an identical product name
AND identical Specifications JSON, differing only in SKU, price, and stock
level.** Nothing else in the feed distinguishes them — no supplier field,
no batch/lot number, no date-received field that might explain multiple
real listings for the same item.

**Decision:** For each duplicate group, keep the row with the LOWEST price,
and SUM the stock quantity across every row in the group onto that
surviving row. The dropped rows' SKUs are never silently discarded — every
one is recorded in `prisma/data/catalog-import-dropped-duplicates.json`,
alongside which SKU absorbed the group's stock.

**Reasoning:** Given no field distinguishes these rows, they most plausibly
represent duplication introduced wherever the raw feed was produced, not
genuinely distinct products. Keeping the lowest price is the
customer-favorable choice when collapsing duplicates; summing stock
preserves the real, total quantity information rather than discarding it.
This is a judgment call, not a certainty — if it later turns out any of
these groups really were meant to be distinct listings (e.g. different
suppliers at different price points), the audit log makes it possible to
identify exactly which ones and reconstruct them.

**Result:** 10,250 raw rows → 8,491 unique products.

### 3. Category hierarchy

**19 categories, completely flat in the raw feed** — no parent/child
relationship of any kind.

**Decision:** Import all 19 as flat, top-level categories (`parentId:
null`).

**Reasoning:** `Category.parentId` already supports optional nesting in the
schema. But inventing a hierarchy that isn't actually present in the
source data would be fabricating organizational structure, not importing
it. If Bellwether wants a real hierarchy (e.g. grouping "Taps & Mixers"
and "Showerheads & Shower Systems" under a "Fixtures" parent), that's a
straightforward admin action against the existing category management UI
once someone who actually knows the intended structure decides on it — not
something this import should guess at.

### 4. Weight & dimensions

**No weight or dimension data exists anywhere in the raw feed.**
`Product.weightKg`/`lengthCm`/`widthCm`/`heightCm` are required,
non-nullable fields (needed for real courier rate quotes via
`ShipLogicService`).

**Decision:** Every imported product uses the schema's existing placeholder
default (1kg, 20×15×10cm) — this import doesn't introduce a new decision
here, it just means all 8,491 imported products currently rely on that
existing, already-documented placeholder (see `Product`'s own schema
comment).

**Reasoning:** Fabricating specific, differentiated fake dimensions per
product would be actively misleading — there's no way to know a real
product's actual weight from this feed, and a specific-looking but false
number is worse than an honest, uniform placeholder. The real, known
consequence: courier rate quotes for these 8,491 products will be
inaccurate until real measurements are entered, product by product, via
the existing admin edit page. This is a genuine data-quality gap, not
hidden — it's the direct, mechanical consequence of the source feed simply
not containing this information.

## Descriptions

Not one of the four "policy decisions" above, but worth noting: the raw
feed's `Description` column was checked and found to be 100% identical
boilerplate for every row. Rather than import that, each product's
description was regenerated as a plain "Key: Value" list drawn directly
from that row's own `Specifications` JSON (e.g. "Brand: Duravit; Shape:
Asymmetric; Size: 400mm; Type: Ceramic") — a faithful restatement of data
already present on the row, not invented marketing copy. An earlier attempt
at assembling natural-language prose from the same fields produced awkward,
repetitive text (duplicating words already in the product name itself)
across the 14 different specification-key shapes this catalog uses; the
plain key:value format avoids that without inventing anything.

## Do dedicated product pages need to be built for this?

No. `apps/web/app/(showroom)/product/[slug]/page.tsx` is a single dynamic
route that already serves any product by slug, rendered on request (no
`generateStaticParams`, so nothing gets statically pre-built per SKU at
build time). It handles 1 product or 100,000 identically — there is no
per-product page to write, for these 8,491 products or any future catalog
size.

## Running the import

```bash
cd apps/api
npm run import:catalog
```

Safe to re-run: `createMany`'s `skipDuplicates: true` means an
already-imported SKU or slug is skipped rather than erroring, so a partial
or repeated run never duplicates rows or fails partway through.

## What this import does NOT do

- Does not touch `ProductVariantGroup` — nothing in the raw feed indicates
  genuine product variants (the duplicate-group analysis above already
  ruled out the one field-shape that might have suggested it).
- Does not set `sansCompliant` to anything but its schema default
  (`false`) — the raw feed has no compliance flag, and defaulting to
  "not verified" is the honest choice.
- Does not attempt to source product images — none exist in the raw feed.
- Does not touch pricing/stock for any product already in the database
  from before this import (Bellwether SWE's own hand-curated
  `prisma/seed.ts` products, if seeded, are matched by SKU/slug and simply
  skipped, not overwritten).
