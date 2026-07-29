# Gap Analysis III — Feature Expansion Toward the Original Scope

**Why this document exists**: `docs/BSWE-ECOM-PRODUCTION-PLAN.md` §3
projected **~34,650 LoC** across the monorepo. Current actual total is
**~16,251 LoC** — well under half. `GAP-ANALYSIS-ROADMAP.md` and
`GAP-ANALYSIS-II.md` both cover *what exists* (completeness of built
features, bugs, coverage). This document looks at the other side: **what
was envisioned, or would naturally belong here, that hasn't been built at
all** — new pages, new modules, new capabilities. It's organized to be
directly usable as a backlog, not just a list of missing buzzwords: each
item says roughly what it would touch and why it matters.

Every figure below is a projection to plan against, not a target to hit
by padding files — the same LoC-discipline caveat
`BSWE-ECOM-PRODUCTION-PLAN.md` §2 already states applies here too.

**Section 6** was added in a second pass prompted by a direct, targeted
round of questions (account management, product tracking, courier/
logistics integration, reviews, dedicated product pages, and "what else
is key") — each checked against the actual code rather than answered
from memory, since several turned out to be more specific and more
consequential than a quick recollection would have suggested.

---

## 1. Where the LoC gap actually concentrates

| Area | Projected | Actual | Gap |
|---|---|---|---|
| API source | ~9,850 | ~6,070 | ~3,780 |
| API tests (unit + e2e) | ~4,000 | ~2,930 | ~1,070 |
| Web source | ~13,800 | ~6,965 | **~6,835** |
| Web tests | ~2,500 | **0** | **~2,500** |
| AI service source | ~2,700 | ~360 | **~2,340** |
| AI service tests | ~1,000 | ~60 | ~940 |
| Infra & tooling | ~800 | ~400 | ~400 |

The two largest, starkest gaps: **the web app has no test suite of any
kind** (not one `.test.tsx` file, no test runner configured, not even a
`test` script in `package.json`), and **the AI service is a fraction of
its planned depth** — three ~50-line rule-based stub services where the
plan described a real recommendation engine, semantic search, and a
guided quote assistant. Both are addressed below, alongside genuine
feature gaps unrelated to LoC count.

---

## 2. Platform & tooling gaps

### 2.1 No web test suite exists at all

**Infrastructure exists; coverage expanded from a 2-file starting
pattern to 6, still not exhaustive.** Jest + React Testing Library wired
in via Next.js's own official `next/jest` preset. Started with
`QuoteRequestForm.test.tsx` and `VariantSelector.test.tsx`; a later pass
added `lib/courier.test.ts` (a pure utility, the courier tracking-URL
fallback logic), `WishlistButton.test.tsx` (specifically proving the
component's stated no-optimistic-update behavior), `CouponForm.test.tsx`
(which caught and fixed a real bug along the way — a failed coupon
removal set an error that was never actually rendered anywhere), and
`RequestReturnForm.test.tsx` (dynamic multi-row FormData encoding). Also
added a small, defensive `crypto.randomUUID` polyfill to `jest.setup.js`,
since its availability across jsdom/Jest version combinations was
genuinely unverified by the earlier two files. See `docs/AGENTS.md`'s
web test coverage sections for the full detail, including the
plainly-stated limitation that none of this has actually been *run* in
this sandbox (confirmed, not assumed, no network access for `npm
install`) — reviewed carefully by hand instead.

**Still genuinely open**: coverage of everything else. Six files prove
the infrastructure works and establish several different testing
patterns (pure utilities, stated-behavior protection, dynamic forms);
the checkout forms, bulk-order table, most admin forms, and the rest of
the storefront still have zero test coverage. Extending it further is
real, separate follow-up work, not implied by this being "done."

### 2.2 No shared-types package

**Done, deliberately partial.** `packages/shared-types` now exists (a
types-only workspace package, no build step). `Product`, `ProductImage`,
`Category`, and `Paginated<T>` moved out of `apps/web/lib/types.ts`'s
hand-duplicated copies into the shared package; `PricedCart`/
`PricedCartLine` are genuinely bidirectional — `apps/api`'s own
`cart.interface.ts` now re-exports them from the shared package too,
rather than defining an independent copy. See `docs/AGENTS.md`'s
shared-types section for exactly what's shared and — just as
importantly — what's deliberately NOT: most of `apps/api`'s own response
types are Prisma-derived (real `Decimal` objects internally, not the
strings the wire-shape `Product` type declares), so forcing full
unification there would be inaccurate, not a real fix. This was a
genuine, if partial, close of the original gap — not every cross-service
type in this codebase is shared yet, and the document is explicit about
why forcing that everywhere wouldn't actually be correct.

### 2.3 No scheduled/cron jobs

**Partially addressed — the mechanism now exists, the originally-named
jobs don't.** `@nestjs/schedule`'s `@Cron()` now runs in the API process
(`CartAbandonmentService`, §6.7 below, is the first real consumer) —
not a separate Render Cron Job service, since a lightweight in-process
scan doesn't need its own deployed process. The plan's two originally
named jobs are still unbuilt: **nightly price-book sync** and **PIRB
batch processing**. If either genuinely needs to run as an independent
process rather than in-process on the API service, that's still a real
Render Cron Job service to add — this pass only closes the "no scheduled
job runs anywhere at all" gap, not those two specific jobs.

### 2.4 AI service is a small fraction of its planned depth

**Partially addressed — two of three capabilities now have real depth.**
`estimate_service.py`'s classification tries a real Anthropic Messages
API call first (tool-forced structured output, enum-constrained to this
deployment's actual sector/service-code/multiplier values), falling back
to the original rule-based keyword matching on any missing config or
failure. `recommendation_service.recommend` tries real order-purchase
co-occurrence first — actual customer behavior, the strongest signal —
before falling back to curated bundle composition, then same-category;
excludes cancelled/refunded orders from the signal and requires a
minimum of 2 co-purchases before counting a product at all, so a single
coincidental co-purchase can't outrank real curated bundling. See
`docs/AGENTS.md`'s corresponding sections for the full detail on both,
including why Haiku specifically for classification and how both were
tested without adding a new mocking dependency.

**Still genuinely open**: `search_service.py`'s query expansion — still
a hardcoded synonym dictionary, deliberately not LLM-routed, since
`SearchService`'s own 3-second timeout reflects "search should feel
instant," which an LLM round-trip would work against. If this platform's
catalog does reach the "10,500+ SKU" scale the original plan
anticipated, keyword-based search specifically becomes materially weaker
and remains a real product problem, not just an unfinished-ambition one.

### 2.5 The "stretch" photo-triage feature was never picked up

`BSWE-ECOM-PRODUCTION-PLAN.md` §6 explicitly deferred this ("needs its
own accuracy validation before going live") rather than committing to
v1 — so its absence isn't a broken promise, but it remains a real,
unstarted feature worth knowing about if AI-service work resumes: a
customer uploads a photo of their issue, gets routed to the right
service category, feeding into the booking/estimate flow.

---

## 3. Customer-facing commerce gaps

### 3.1 No guest checkout

**Done, deliberately scoped.** A visitor can now complete a purchase at
`/checkout/guest` without ever creating an account through Keycloak —
the exact gap named here. Scoped honestly, not silently narrowed: this
is a "pick products directly and pay" flow, not a full anonymous
shopping-cart experience, since this codebase's entire cart system is
built around an authenticated `Cart.accountId` and rebuilding that for
anonymous browsing would have been a much bigger undertaking than this
pass attempted. An account IS created implicitly at order time, exactly
as this section originally suggested — `Account.isGuest`, resolved
purely by email so a returning guest or someone who already has a real
account both "just work" through the same resolution. See
`docs/AGENTS.md`'s guest checkout section for the full detail, including
a real module-dependency correction made mid-build and a cascading
middleware bug (would have made the feature unreachable) caught and
fixed before delivery, not after.

### 3.2 No discount/coupon/promo code system

**Done.** `Coupon` and `CouponRedemption` models, percentage or fixed-
amount discounts, optional minimum-order/total-use/per-customer limits
and a validity window, applied on the cart page and validated fresh on
every price recalculation (not just once at apply time). Admin UI at
`/admin/coupons` for creating and toggling codes. See
`docs/AGENTS.md`'s coupons section for the real detail — the VAT-ordering
decision (discount applies before VAT, not after), why usage limits are
tracked via actual redemption rows rather than a counter that could
drift, and a stated scope decision not to auto-clear an applied coupon
from the cart after checkout (a limited-use one self-corrects via
re-validation; an unlimited one staying applied to a new cart is treated
as acceptable behavior, not a bug).

Not built: free-shipping-specific coupons (only percentage/fixed-amount
discount types exist) — a real, separate `DiscountType` value to add
later if needed, not attempted here.

### 3.3 No wishlist / saved-for-later

**Done.** `WishlistItem` model, idempotent add/remove (a wishlist button
is a toggle in the UI; the API behaves like one too), and a real toggle
on the product detail page plus a dedicated `/account/wishlist` page
(which reuses `ProductCard` directly — the wishlist response's nested
product shape matches the shared `Product` type exactly, a small, real
validation that `packages/shared-types` is paying off). See
`docs/AGENTS.md`'s wishlist section for the full detail, including why
it's a genuinely separate model from `Cart` rather than a flag on it.

Stated scope boundary, not a silent gap: wishlist buttons only appear on
the PDP and the wishlist page itself, not on every product card across
category/search/home listing pages — showing wishlist status across an
entire grid would need fetching the whole wishlist on every listing page
load (or a more involved per-card check), not judged worth it for this
pass.

### 3.4 No PDF invoice / tax invoice generation

**Done, with a real legal-honesty decision baked in.** `GET
/v1/orders/:id/invoice` (customer) and `GET /v1/orders/admin/:id/invoice`
(admin) generate a real PDF via `pdfkit` (pure-JS, no external
binary/browser dependency). A document without a real, configured VAT
number is honestly labeled "INVOICE," not "TAX INVOICE" — that's a legal
term with real requirements under South African VAT law, and this
deployment doesn't fabricate a VAT number just to make an unconfigured
document look complete. See `docs/AGENTS.md`'s invoice section for the
full detail, including a real frontend design problem this surfaced (a
plain link can't carry the Bearer token these endpoints need, solved
with a Next.js Route Handler proxy) and why the admin endpoint's
authorization needed its own explicit, scope-specific check rather than
relying only on `middleware.ts` (which doesn't cover this URL prefix at
all).

### 3.5 No product Q&A (separate from reviews)

**Done.** `ProductQuestion`/`ProductAnswer` models, genuinely separate
from `Review` — no verified-purchase requirement (asking is typically a
*before-buying* action, unlike reviews), answerable by any authenticated
account with `isFromStaff` derived from the answering caller's own JWT
scopes rather than a client-supplied field. Routes follow
`ReviewsController`'s own established top-level convention
(`/v1/questions?productId=...`) rather than introducing a new nested
pattern. See `docs/AGENTS.md`'s Q&A section for the full reasoning.

### 3.6 No multi-address / split checkout

**Done, in two parts, one of which was already solved.** Checked the
existing `CheckoutForm` first: the saved-address picker already lets a
customer ship to a different address than usual for any single order —
that part of this gap needed no new work. The genuinely missing piece,
splitting one checkout across multiple destination addresses, is now
built — `/checkout/split`, trade-credit only (a PayFast redirect can't
handle more than one destination in a single page session; trade
credit's immediate server-side confirmation can), two fixed destination
groups, and blocked when a coupon is active (which destination should
honestly keep the discount is genuinely ambiguous, not just
inconvenient). See `docs/AGENTS.md`'s split checkout section for the
full detail, including a real correctness issue found and fixed along
the way: `PaymentsService.handleItn`'s cart-clearing previously cleared
the whole cart unconditionally on any payment confirmation, which would
have been actively wrong for a split order — now scoped to the
confirmed order's own line items, a genuine improvement for the
existing single-order case too, not just an accommodation for
splitting.

---

## 4. Trade / B2B-specific gaps

### 4.1 Accounts are strictly one identity to one account — no shared company credit

**Done.** `AccountMember` lets multiple Keycloak identities share one
`Account` — invited by email, linked to a real identity on their first
login after accepting. Deliberately additive rather than the
`Organization`-model rewrite originally envisioned here: `Account`
itself stays exactly what it always was (still owns orders, addresses,
trade credit, cart), so nothing downstream needed to change — the
sharing "just works" because `TradeCreditService`/`OrdersService`/etc.
were always scoped to `accountId`, never to a specific person. See
`docs/AGENTS.md`'s multi-user trade accounts section for the full
resolution chain and a real POPIA-erasure correctness issue this
surfaced and fixed.

Both stated follow-ups from the original pass are now done too:
promotion to `OWNER` is reachable through the product
(`PATCH /v1/accounts/me/members/:id/role`, a toggle on `/account/team`),
and `Order.placedByEmail` records which specific team member placed a
given order. Still open, stated explicitly: cart stays account-level
rather than per-member (a real, considered simplification, not an
oversight), and `/account/team`'s own "am I the owner" check doesn't yet
reflect a promoted co-owner in *that page's UI*, even though the API's
own enforcement is fully correct for them either way — a small, known
display gap, not fixed either.

### 4.2 No purchase order (PO) number capture anywhere

**Done.** `Order.poNumber` (optional, free text, never validated or
interpreted by this app) is threaded through `CheckoutDto` → checkout →
displayed on both the customer's and admin's order detail pages. A
small, low-effort addition, exactly as originally scoped here.

### 4.3 Bulk ordering is manual-entry only — no CSV import/export

`BSWE-ECOM-PRODUCTION-PLAN.md` §5 explicitly named this "Bulk/CSV
ordering." What was built (`/trade/bulk-order`) is a manual quantity-entry
table across the whole catalog — genuinely useful, but not what was
planned. A trade customer with an existing internal parts list has no way
to upload a CSV/spreadsheet of SKU+quantity pairs and have it validated
and added to cart in one action. Would need: a CSV parser client-side or
a new endpoint accepting an uploaded file, validation against real
SKUs (reusing the existing bulk-add-to-cart endpoint's "reject the whole
batch on any bad line" pattern), and a downloadable CSV template.

### 4.4 No tiered/volume pricing beyond the flat retail/trade split

**Done.** `PriceTier` (`productId`, `minQuantity`, `discountPercent`) — a
percentage off whichever base price (retail/trade) the customer already
qualifies for, not a separate absolute price defined at every threshold
for both customer types. Resolution is a standalone pure function
(`resolveBestTier`), picking the highest-qualifying tier. Wired into
`CartService.price()` — the same "one place cart totals compute"
principle coupons already relied on meant `OrdersService.checkout`
needed zero changes to inherit this correctly. See `docs/AGENTS.md`'s
tiered pricing section for the full detail, including a real bug caught
and fixed before it could break the existing cart test suite. Admin UI
on the product edit page, customer-facing hints on the PDP ("Buy 10+,
save 5%") and a real "was RX, now RY" comparison on qualifying cart
lines.

### 4.5 No recurring/scheduled orders

**Done.** `RecurringOrderTemplate`/`RecurringOrderTemplateItem`, a daily
cron job (`RecurringOrdersService.processRecurringOrders`) that
generates real orders on schedule, and a customer-facing
`/account/recurring-orders` page. Trade-credit only, for the same
fundamental reason as split checkout (§3.6) — no interactive session
exists for an automated job to redirect through PayFast. A genuine
synergy with that same feature: generating an order from a template
reuses the exact `cartItemIds` mechanism split checkout introduced, so
an automatic run can never accidentally sweep up unrelated items already
sitting in the customer's own cart. A failed run reschedules to the next
cycle regardless (not retried daily) and surfaces the specific failure
reason to the customer, rather than a persistently-broken template
silently never placing an order or spamming daily failure emails. See
`docs/AGENTS.md`'s recurring orders section for the full detail.

---

## 5. Admin & operations gaps

### 5.1 No bulk product import/export

**Fully done, in two parts.** The concrete need (loading the real
Bellwether SWE catalog) was resolved first via `prisma/import-catalog.ts`
— see `docs/CATALOG-IMPORT.md`. The general, reusable capability this
section originally asked for is now also built: `ProductsBulkService`
(`POST /v1/products/bulk-import`, `GET /v1/products/export`), with the
same "validate everything, reject the whole batch on any bad row"
discipline already established in `CartService.bulkAddItems`, upsert-
by-SKU (so an offline-edited re-import updates existing products rather
than erroring), and export/import sharing one column schema so an
unmodified export is itself a valid re-import. Admin UI at
`/admin/products` (upload control + download link). See
`docs/AGENTS.md`'s general bulk import/export section for the full
detail, including why file upload was deliberately kept to a client-
read-and-post-as-JSON approach rather than introducing multipart
handling that doesn't exist anywhere else in this codebase.

### 5.2 No admin UI for pricing/multiplier data

**Done.** `PricingAdminService`/`PricingController` (admin-scoped
routes alongside the existing public `quote` endpoint) and an
`/admin/pricing` page. A real discovery shaped the design: tracing
`PricingService.quote()`'s existing query showed `PriceBookEntry` was
always meant as an append-only rate history (it reads whichever entry
has the most recent `effectiveFrom`), so there's deliberately no
`update()` for it — a rate "change" is a new entry, preserving history,
not an overwrite. `ComplexityMultiplier` has no such history concept
(unique by code) and gets real in-place editing instead. See
`docs/AGENTS.md`'s admin pricing tooling section for the full detail.

### 5.3 No returns/RMA workflow distinct from cancellation

**Done.** `ReturnRequest`/`ReturnLineItem` models with their own
independent status lifecycle (`REQUESTED → APPROVED → RECEIVED →
REFUNDED/REPLACED`, with `REJECTED` reachable from either `REQUESTED` or
`RECEIVED` — a pre-shipping rejection and a post-inspection one are
genuinely different, both built). Only requestable against a `DELIVERED`
order, confirmed distinct from `PaymentsService.cancelOrder`'s own
before-shipping assumption. Refund resolution reuses the existing
PayFast refund call (a new public `PaymentsService.refundForReturn`,
not a second implementation) and supports a genuine partial refund, not
just the order's full total. See `docs/AGENTS.md`'s returns/RMA section
for the full detail, including the module-dependency reasoning and a
stated scope boundary (no automatic replacement-order creation yet).

### 5.4 No customizable notification templates

**Done.** `NotificationTemplate` model with admin CRUD
(`/v1/notification-templates`), removing the deploy dependency for
customer-facing email copy. A real architectural discovery shaped the
implementation: the notification-rendering pipeline runs in a genuinely
separate OS process (`worker.ts`'s own minimal `WorkerModule`, not the
API's `AppModule`), so `PrismaModule`'s `@Global()` status doesn't
automatically reach it — `NotificationTemplatesModule` explicitly
imports `PrismaModule` itself to thread database access into that
process correctly. The existing hardcoded `renderNotification` function
is completely unchanged and remains the fallback for any type nobody's
customized; its conditional logic (e.g. tracking-number formatting) was
extracted into a shared, pure context-builder so it isn't duplicated
between the default renderer and the new custom-template path. See
`docs/AGENTS.md`'s notification template editing section for the full
detail, including the stated design choice to leave unrecognized
placeholders visible in the output rather than silently stripping them.

### 5.5 No role granularity beyond flat Keycloak scopes

**Partially done, with two of the three examples resolved differently
than expected.** The "finance-only sees trade-credit but not catalog"
example was already true before this pass — `TradeCreditController`'s
admin endpoints have only ever required `trade-credit:manage`, never
also `products:write` — no code change needed there. The genuinely
missing piece was a real read-only role: added a new, purely additive
`@AnyScope(...)` authorization check (OR semantics, alongside the
existing `@Scopes(...)`'s unchanged AND semantics) and applied
`orders:read`/`bookings:read` to the relevant admin list/detail
endpoints. The ask's other named example — "view customers" — doesn't
exist as an admin capability at all yet (no admin-wide account-listing
endpoint to retrofit), a separate, real gap this pass didn't attempt.
Also not retrofitted: warranty/compliance (no admin-wide view endpoint
to apply it to) or the remaining admin areas exhaustively. See
`docs/AGENTS.md`'s finer-grained admin roles section for the full
detail, including two honest, stated limitations: actually granting a
real read-only role requires external Keycloak configuration outside
this codebase's control, and the frontend doesn't yet hide write
controls for a read-only caller (the API's own enforcement is the real
security boundary regardless).

---

## 6. Logistics, catalog structure, and account management — verified gaps

Raised directly and checked against the actual code rather than assumed;
each below was confirmed, not guessed.

### 6.1 No courier/logistics integration of any kind — the single biggest fulfillment gap

**Substantially addressed — two of the three pieces are now real, not
manual.** `Order` has `courierName`, `trackingNumber`, and `trackingUrl`,
settable by an admin via a fulfillment form (usually alongside
`DISPATCHED`, which triggers a real "your order has shipped" email).
`resolveTrackingUrl` (`common/utils/courier.util.ts`) links to a
courier's own general tracking page for the two actually verified (The
Courier Guy, RAM) — checked directly rather than guessing a deep-link
pattern, since none could be confirmed to work.

**Real rate quotes now exist too**, via `modules/shipping/`'s
`ShipLogicService` — a genuine integration with ShipLogic (the platform
The Courier Guy's own official plugin integrations run on, confirmed via
that plugin's changelog referencing "ShipLogic API changes" directly),
verified against a real, working example before writing any of it, not
guessed at. `deliveryFee` is now a real quote based on the cart's actual
weight and the delivery address, falling back to the same flat `150`
placeholder only when ShipLogic isn't configured or a request fails.
`Product` gained real `weightKg`/`lengthCm`/`widthCm`/`heightCm` fields
to make this meaningful — existing/new rows default to a generic
small-parcel placeholder until real per-product values are entered. See
`docs/AGENTS.md`'s logistics section for the full detail, including the
stated parcel-aggregation simplification (one parcel per order, not real
bin-packing).

**Still genuinely open**: no label generation, no tracking webhook that
updates order status automatically (an admin still has to manually mark
`DISPATCHED` and type in the tracking number once a shipment is booked
elsewhere), and no multi-parcel splitting for orders that would
realistically need more than one box. A full implementation would also
book the shipment (create the waybill) directly from the admin order
page rather than requiring that to happen in ShipLogic's own portal
first.

### 6.2 No product variants

**Done.** `ProductVariantGroup` sits above `Product` exactly as this
document originally proposed — every variant stays a full, independent
`Product` row (no rewrite of Cart/Order/Review around a new
variant-vs-product distinction), with a "Size" (or any other option
label) selector on the PDP navigating between real sibling product
pages. Admin UI at `/admin/variant-groups` for creating groups, plus
assignment on the product create/edit forms. See `docs/AGENTS.md`'s
variants section for the two-layer validation (`@ValidateIf` at the DTO
level, a merged-state check at the service level for partial updates)
and a genuinely subtle bug caught and fixed while wiring the admin form:
`@ValidateIf` alone doesn't correctly allow clearing both fields together
via explicit `null`, since `@IsUUID()`/`@IsString()` reject `null`
outright even when the ValidateIf condition should skip them.

**Still open**: only one option type per group (no combined size *and*
color on the same product family), no rename/delete UI for a group once
created, and no per-variant image sharing — each size manages its own
photos independently rather than inheriting a shared set.

### 6.3 No multi-warehouse / multi-location stock

**Partially addressed — real per-location visibility and management now
exists, but checkout fulfillment does not.** `Warehouse`/`WarehouseStock`
give an admin a genuine per-location breakdown (`/admin/warehouses` for
the locations themselves, a stock panel on each product's edit page for
quantities), with `Product.stockQty` kept as an accurate, automatically
recomputed aggregate — not a rewrite of checkout's stock logic, a
deliberate scope decision made explicit in `docs/AGENTS.md`'s
multi-warehouse section: three separate atomic check-and-decrement
transactions (Orders checkout, Quotes conversion, Trade Credit drawdown)
were left completely untouched rather than risking correctness-critical,
money-moving code in this pass.

**Still genuinely open**: checkout has no location awareness at all — a
sale decrements the aggregate only, with no concept of which warehouse
it came from, so per-warehouse quantities can drift from reality after a
sale without manual reconciliation. No fulfill-from-nearest-warehouse
logic, and branch pickup (6.7 below) still depends on this not existing
yet.

### 6.4 No product listing/search filters beyond text + category

**Done.** `QueryProductsDto` now supports price range (`minPrice`/`maxPrice`,
filtered against `retailPrice` specifically — a stated simplification,
not an oversight; see `docs/AGENTS.md`), an in-stock-only toggle, sort
order (newest, price low/high, name A-Z), and a brand filter (`Product`
gained a `brand` field; `GET /v1/products/brands` returns only brands
actually in use, not a hardcoded list). Applied consistently across
*both* query paths — the plain Prisma query builder and the raw-SQL
full-text search path, which needed its own `ORDER BY` handling since
sorting by price/name overrides relevance ranking when requested — and
threaded all the way through the AI-service search-expansion path too,
not just the fallback (see `docs/AGENTS.md`'s search section for the
full chain and a real cross-language boolean-serialization bug caught
while wiring it). `ProductFilterBar` (shared between `/category/[slug]`
and `/search`) is a plain GET form, not client-side query manipulation —
filters stay shareable, bookmarkable URLs.

**Not done**: a "best-selling" sort option, which would need order-line
aggregation (similar to `AnalyticsService.getPopularProducts`) rather
than a plain column sort — left out of this pass's scope, not forgotten.

### 6.5 Review ratings aren't visible anywhere except the product detail page

**Done.** `ProductsService.findAll`/`searchByText` now attach
`averageRating`/`reviewCount` to every item, computed via one bulk
`review.groupBy` query per page of results (not one query per product) —
the same `_avg(rating)` aggregation `ReviewsService.findByProduct` uses
for the PDP, so a listing page's rating always matches what the PDP
shows for the same product rather than two independently-drifting
implementations. `StarRating` was extracted as a shared component in the
process — `ReviewsSection` had this exact rendering (round to nearest
star, format to one decimal) written inline, and the listing display
needed the identical output, so a second inline copy would have been
exactly the kind of duplication that quietly drifts apart over time.

### 6.6 No account profile editing — only fetch, no update

**Done.** `PATCH /v1/accounts/me` (`AccountsService.updateProfile`) lets a
customer change their email, company name, or phone — `/account/profile`
is the new first item in the account sub-nav. Email uniqueness is
checked against other accounts before saving; safe to let it diverge
from whatever Keycloak's JWT claims say, since `resolveOrCreate`'s
upsert never refreshes email on subsequent logins (`update: {}}` in its
own implementation) — an edit here won't get silently overwritten the
next time this identity signs in.

**A real bug caught while building the frontend, not after**: the first
draft of the server action used `formData.get('companyName') || undefined`
— since an intentionally-cleared field submits as an empty string, and
an empty string is falsy, `||` would silently convert "please remove my
company name" into "don't change this field at all," making the field
permanently un-clearable once set. Fixed to `??`, which only falls back
on `null`/`undefined`, not an empty string.

### 6.7 A few more, not yet covered anywhere in this document or the others

- **No click-and-collect / branch pickup.** If Bellwether has any
  physical location a customer could collect from instead of waiting for
  delivery, there's no option for it anywhere in checkout — every order
  assumes delivery. Depends on 6.3 (location-aware stock) to do properly.
- **Abandoned-cart recovery — done.** `CartAbandonmentService` runs
  hourly (`@nestjs/schedule`, the first real scheduled job anywhere in
  this codebase — see §2.3 above and `docs/AGENTS.md`), queuing a "you
  left something in your cart" email for any cart abandoned 24
  hours–7 days ago with no reminder already sent. Surfaced and fixed a
  real, pre-existing gap along the way: `Cart.updatedAt` was never
  actually touched on item changes before this (only at cart creation),
  so there was no reliable "last activity" signal to check against at
  all — `CartService.touchCart` fixes that at the source, not just for
  this feature's benefit.
- **Order amendment — partially addressed, deliberately.** A customer
  can now correct their delivery address on an order that hasn't shipped
  yet (`PATCH /v1/orders/:id/address`, through `PROCESSING`). Changing
  quantity or swapping line items remains genuinely out of scope — both
  would touch payment already captured via PayFast and stock already
  decremented at checkout, real, separate undertakings not attempted
  here. See `docs/AGENTS.md`'s order amendment section.
- **SMS — done, deliberately narrow.** `SmsService` is a real BulkSMS.com
  integration (verified against BulkSMS's own API spec plus an
  independent third-party client, same two-source discipline as
  `ShipLogicService`), wired in as a best-effort addition alongside
  email — never a replacement for it, and only for `order.shipped` so
  far, not every notification type. See `docs/AGENTS.md`'s SMS section
  for why that one was chosen as the starting point and what extending
  it to other notification types would actually involve.

---

## 7. What this document is for

Same standard as both prior gap-analysis documents: a living backlog,
not a snapshot. Update it as items here get built — moved to "done" with
the same completion-note discipline `GAP-ANALYSIS-ROADMAP.md` used
throughout the original build — rather than letting it go stale the way
that document's own Section 1 did.
