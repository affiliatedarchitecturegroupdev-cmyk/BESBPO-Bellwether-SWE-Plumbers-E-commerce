# Gap Analysis & Roadmap

**Status check as of this document**: the API is functionally complete (14
modules) and hardened. The storefront has a foundation and two pages. The
AI service has three working v1 capabilities. What's missing is
substantial and is organized below by area, then turned into a phased,
executable roadmap.

---

## 1. Gap Analysis

### 1.1 The single biggest gap: there is no admin interface at all

Nine of fourteen API modules (`products`, `categories`, `bundles`,
`bookings`, `warranty`, `compliance`, `orders`, `trade-credit`, and `cart`'s
ownership model indirectly) have write operations gated behind a
`:manage`-style scope — meaning a human, not a customer, is meant to
perform them. **None of them have a UI.** Right now the only way to add a
product, approve a warranty, issue a CoC record, or change an order's
status is a raw API call. This was a deliberate scope boundary during the
API build-out (each module's own job was to be correct, not to also ship
its own admin screen) but it means the platform cannot actually be
operated by staff today.

This is more urgent than most storefront pages: without it, there is no
real catalog, because nothing can populate one.

### 1.2 Storefront (`apps/web`) — foundation only

Built: layout, design system primitives, auth wiring, home page, product
detail page, Add to Cart (functional).

Missing, in the order a real shopper would hit them:
- Category listing (`/category/[slug]`)
- Search results page (the API's Postgres FTS and the AI service's
  query-expansion endpoint both exist and are unused by the frontend)
- **Cart page** (`/cart`) — Add to Cart works, but there's nowhere to view
  or edit what's in it
- **Checkout page** (`/checkout`) — the API's checkout/PayFast flow is
  built and tested; nothing calls it from a browser
- Order confirmation and cancelled pages (`/checkout/success`,
  `/checkout/cancelled` — both are literally referenced as PayFast's
  `return_url`/`cancel_url` in `PaymentsService`, and neither exists)
- Account pages (`/account/orders`, `/account/addresses`)
- The entire `(trade)` route group: dashboard, bulk-order, quotes,
  credit-terms — the UI mockups exist; none of it is real Next.js code
- Booking request flow, and a customer-facing view of warranty/CoC records
- SEO basics: sitemap, robots.txt, per-product structured data
- Cookie consent (the corporate site has one; the shop doesn't)

### 1.3 API — integration and feature gaps

Already documented as explicit follow-ups in `docs/AGENTS.md`:
- Trade credit not wired into checkout as a payment option
- `booking.scheduled` / `compliance.coc-issued` notification triggers
  defined but not called

Not yet documented anywhere — found during this pass:
- **No image upload path.** Product/category images are referenced by
  convention (`products/${sku}.jpg` on S3) but nothing in the API issues
  presigned upload URLs or handles the upload. Every product image
  reference in the frontend is currently pointing at nothing.
- **No order cancellation or refund flow.** `OrderStatus` has `CANCELLED`
  and `REFUNDED` as valid states; nothing transitions an order into either.
  PayFast supports refunds via their API — not integrated.
- **No Addresses module.** `Address` exists in the schema with a real
  relation to `Account`; there's no CRUD for it. Checkout takes an inline
  address per order (a deliberate simplification at the time), but there's
  no "manage my saved addresses" capability at all.
- **No bundle-item management endpoint.** Flagged in
  `dto/update-bundle.dto.ts` at the time: changing a bundle's product
  composition needs its own endpoint; it was never built.
- **No stock replenishment.** Checkout decrements stock correctly and
  race-safely; nothing increments it back — no restock endpoint, no
  low-stock alerting.
- **No reviews.** The UI mockups show a Reviews tab on the product page;
  there's no `Review` model or module.
- **No POPIA data-export or account-deletion endpoints**, despite POPIA
  compliance being called out explicitly on the corporate site.
- **No admin account-browsing UI.** Found while building the trade-credit
  and warranty/compliance admin forms in Phase 4: there's no screen to
  search or list customer accounts and pick one, so account IDs (for
  trade-credit setup) and booking IDs (for warranty/CoC issuance) are
  entered as raw text, copied from wherever they're visible elsewhere
  (the orders/bookings admin lists show emails and, for bookings, the ID
  itself). Functional, not polished — worth a proper account-search
  screen before this panel sees real staff use.
- **No audit trail** for admin actions — `updatedAt` exists, but nothing
  records *which* admin issued a warranty, changed an order's status, or
  approved a trade credit account.
- **No real health check.** `render.yaml`'s `healthCheckPath: /v1/products`
  works but doesn't verify Postgres or Redis connectivity — a DB outage
  wouldn't fail the health check.
- **No OpenAPI/Swagger spec**, despite `docs/AGENTS.md` describing one as
  part of the HITLAD contract ("the actual contract, not just
  documentation of it"). `@nestjs/swagger` was never added.
- **No e2e tests anywhere** — `docs/AGENTS.md` states every controller
  endpoint gets one; only unit tests (mocked Prisma) exist today.

### 1.4 AI service — v1 complete, but two of three capabilities still have no caller

`/search-rank` now has a real entry point (`GET /v1/search` on the API,
added this pass). Verified by grep, not assumption: **`/estimate` (the
quote assistant) and `/recommend` (product recommendations) have zero
callers anywhere in `apps/api`** — same "built, unit-tested, completely
unreachable" state `/search-rank` was in before this pass. Follow the
same shape to fix both: a thin API-side proxy module with a graceful
non-AI fallback (`/estimate` has an obvious one — the keyword classifier's
sector/serviceCode guess could default to `GENERAL_CALLOUT` if the AI
service is down, same as `/search-rank` falls back to plain FTS).

Also still true: recommendations are pure bundle co-occurrence with no
signal from actual customer behavior once real traffic exists. No caching
layer — every AI service call hits Postgres/the API fresh; the service
doesn't use Redis at all currently. Photo-based issue triage remains the
explicitly-flagged stretch goal from the original plan.

### 1.5 Infrastructure & observability

- No staging environment actually configured on Render — the production
  plan called for one; `render.yaml` only describes a single (production)
  shape.
- No error tracking (Sentry or equivalent) anywhere.
- No monitoring/alerting on the worker process specifically — if the
  notifications worker silently dies, nothing surfaces that.
- No documented Postgres backup/restore process.
- No CDN in front of S3 for catalog images.

---

## 2. Roadmap

Phased by what actually blocks the next thing, not by module. Each phase
assumes the previous one is done.

### Phase 1 — Make it clickable end-to-end (MVP usability)
The platform currently cannot be demoed by a human in a browser from
"browse" to "paid order." This phase closes that, nothing more.

1. ~~**Image upload**~~ — **done.** `modules/media/` (API): a two-step
   presigned-URL flow (`POST /v1/media/product-images/upload-url` →
   client PUTs directly to S3 → `POST /v1/media/product-images` confirms
   and creates the DB record). Replaced the previous SKU-naming-convention
   assumption with a real `ProductImage` model (multiple images per
   product, ordered) — `products.service.ts` now actually includes images
   in every product response, and `apps/web`'s `ProductCard`/product page
   use them for real, with an explicit placeholder state for products that
   don't have any yet (a real, expected state now, not a bug). Known gap
   carried forward: no server-side verification that an upload actually
   completed before `confirm` is called (would need a HeadObject check —
   see the comment on `MediaService.confirmProductImage`), and presigned
   PUT can't enforce a max file size the way an S3 POST-policy upload
   could. Fine for admin-only usage today.
2. ~~**Minimal admin panel**~~ — **done.** `apps/web`'s `/admin` route
   group: full CRUD for products (incl. the image uploader from step 1),
   categories (tree-flattened for parent selection), and bundles (with a
   client-side item picker for creation — item composition isn't editable
   after creation, matching `UpdateBundleDto`'s documented scope
   boundary). Gated by real scope checks (`middleware.ts` decodes
   `scope_keys` from the access token — see `lib/decode-jwt.ts` for why
   that's safe without signature verification client-side), not just
   session presence — the API enforces this regardless on every request,
   but the UI shouldn't render forms for actions a user can't perform.
   Two things worth knowing: admin edit routes are keyed by **slug**, not
   id (`/admin/products/[slug]`) — the API's GET endpoints only support
   slug lookup, and adding an id-lookup endpoint just for this felt like
   the wrong fix; mutations bind to the fetched record's real `id`
   instead. Also fixed a real bug found while wiring this up:
   `ApiError` was only ever surfacing a generic "status 409" message
   instead of the API's actual error text, which matters a lot for an
   admin trying to understand *why* a delete was blocked.
3. ~~**Cart page**~~ — **done.** `/cart` (protected by `middleware.ts` —
   `Cart` is 1:1 with `Account` in the schema, there's no guest-cart
   concept, so viewing one requires being signed in). Quantity stepper and
   remove both update optimistically, reverting if the server action
   fails. Along the way, enriched `CartService.price()` (API) to include
   each line's product slug and first image — it previously returned only
   name/price/quantity, which would have meant a cart with no pictures and
   no way to click through to a product. Also added a live item-count
   badge to the header's Cart link, and wrote `cart.service.spec.ts` —
   this module had no test coverage at all before this pass, despite being
   central to checkout.
4. ~~**Checkout page**~~ — **done.** `/checkout`: address form, then a
   server action creates the order (`POST /v1/orders/checkout`) and
   requests PayFast's signed redirect payload
   (`POST /v1/payments/payfast/checkout`) before the browser is
   auto-submitted to PayFast's hosted payment page via a real (hidden)
   HTML form POST — `redirect()` can't do this, it only handles same-app
   GET navigation, not a cross-origin POST with signed fields.
5. ~~**Order confirmation / cancelled pages**~~ — **done**, with one real
   gap found and documented rather than glossed over: `OrdersService.checkout`
   clears the cart at **order-creation** time, before PayFast payment
   happens at all — so a cancelled payment leaves the customer with an
   empty cart *and* an orphaned unpaid `PENDING` order, with no way to
   retry payment on it or easily recover the cart. The cancelled page says
   this plainly instead of claiming the cart is preserved. Fixing it
   properly means either deferring cart-clearing until payment actually
   confirms, or building a real "retry payment" flow for a pending order —
   neither is done; this is now Phase 2 material. The confirmation page
   has its own honesty point: PayFast's browser redirect and its
   server-to-server ITN confirmation are independent, unordered events, so
   the order may still show `PENDING` when the customer lands there — the
   page reflects whatever the order's real status is rather than assuming
   success.

**Phase 1 is now complete** — the platform can be demoed end-to-end in a
browser: browse → add to cart → check out → pay via PayFast → land on a
confirmation page that's honest about the order's actual status.

### Phase 2 — Core commerce completeness
6. ~~**Category listing + search results pages**~~ — **done**, with a
   real gap found and fixed along the way: apps/ai-service's `/search-rank`
   (domain-specific query expansion) had **no caller anywhere** — it was
   built, unit-tested, and completely unreachable from any real user flow,
   since the AI service is internal-only and nothing on the API proxied to
   it. Added `modules/search/` (API): a public `GET /v1/search` endpoint
   that calls the AI service and falls back to plain Postgres FTS
   (`ProductsService.findAll`) if the AI service is unreachable, times out
   (3s), or isn't configured — search works either way, the AI service is
   an enhancement layer, not a dependency. Category page shows only
   products whose `categoryId` exactly matches (not descendants too) —
   documented as the simpler "minimal" interpretation, not a fixed
   limitation.
7. Account pages: ~~order history~~ and ~~saved addresses~~ — **both done**
   (order list + detail; addresses list + add form with set-default/delete).
8. ~~**Addresses module**~~ — **done**, with the single-default-address
   logic actually enforced: the first address saved always becomes
   default regardless of what's requested (an account with saved
   addresses but none marked default would be a confusing state for
   anything reading "the default"), and deleting the current default
   promotes the most recent remaining one rather than leaving nothing
   marked default. Wired into checkout immediately rather than left as an
   isolated feature — `CheckoutForm` now offers a "use a saved address"
   picker that prefills the manual-entry fields, with the account's
   default address pre-selected on page load.
9. ~~Order cancellation flow + refund integration with PayFast~~ — **done**,
   plus the cart-clearing fix from last pass, folded in here as promised:
   `OrdersService.checkout` no longer clears the cart at order-creation
   time — that moved to `PaymentsService.handleItn`, firing only on a
   confirmed payment. A cancelled/failed payment now correctly leaves the
   cart untouched (`/checkout/cancelled`'s copy updated to match reality).
   Cancellation itself: customer-initiated, only while an order is
   `PENDING` or `CONFIRMED` (not once the field/warehouse team has acted on
   it). A `CONFIRMED` order triggers a real PayFast refund via their
   **separate Refunds API** — different base URL, different auth (signed
   custom headers), and confirmed via research: **alphabetical** field
   order for its signature, the opposite of checkout's declared order.
   Refund happens *before* stock is restored or status changes, so a
   failed refund never leaves an order half-cancelled. Lives in
   `PaymentsService`, not `OrdersService`, specifically to avoid a
   circular module dependency (Orders already gets called *by* Payments
   for status updates) — documented in `docs/AGENTS.md` so it doesn't read
   as an arbitrary placement later.
   **Flagged, not silently assumed**: the refund API's amount unit
   (cents vs. Rands) couldn't be confirmed with an explicit documentation
   statement — no live PayFast sandbox account exists in this environment
   to test against directly. Research since strengthened the case for
   cents, though: the official `Payfast/payfast-php-sdk` README shows a
   consistent structural pattern across three separate `api.payfast.co.za`
   endpoints (refunds, recurring billing, adhoc charges) — all use a bare
   integer amount, distinct from the checkout/onsite flow's string-decimal
   Rand format (`'100.00'`) shown in the same document. A "Test adhoc"
   example amount of `500` also reads far more plausibly as R5.00 than
   R500. Implemented as cents; comment updated to reflect the stronger,
   still-circumstantial evidence rather than either overclaiming
   confirmation or leaving the note stale. Search the codebase for
   "Amount unit for this API" to find the exact spot.
   Residual, accepted trade-off from the cart-clearing fix: checking out
   again after an abandoned/cancelled payment creates a new `PENDING`
   order rather than resuming the old one — unpaid orders can accumulate.
   Smaller problem than losing a cart; not fixed this pass.
10. ~~Reviews module (API + PDP display)~~ — **done.** Verified-purchase
    enforced server-side (`ReviewsService.assertVerifiedPurchase` — an
    account must have an `OrderLineItem` for the product on an order that
    reached `CONFIRMED` or later; `PENDING`/`CANCELLED`/`REFUNDED` orders
    don't qualify, so a refunded purchase can't be used to leave a
    review). One review per account per product, enforced by a composite
    unique constraint at the schema level, not just application logic.
    PDP shows the average rating + count alongside the list, and a write
    form gated to signed-in users (a UI courtesy — the API enforces the
    real enforcement regardless of what the frontend hides).

**Also flagged this pass, now half-resolved**: `/recommend` is wired up —
`ProductsService.getRecommendations` proxies to the AI service exactly
like `/search-rank` does (3s timeout, graceful fallback — same-category
products instead of AI-driven ones), exposed as
`GET /v1/products/:id/recommendations` and shown as "Frequently Bought
With" on the PDP. `/estimate` (the quote assistant) is still unwired —
natural fit is alongside the booking flow in Phase 3's item 13.

### Phase 3 — Trade/B2B depth
11. ~~Wire trade credit into checkout as a real payment option~~ — **done.**
    `CheckoutDto` gained a `paymentMethod` field (`payfast` default, or
    `trade_credit`). Trade credit confirms the order **immediately** — no
    PayFast redirect, no async ITN wait — because the credit
    check-and-drawdown happens atomically in the *same* Prisma transaction
    as stock decrement and order creation: if the account's available
    credit can't cover the order, the whole transaction rolls back
    (nothing decremented, no order created), not just the credit part.
    That atomic drawdown logic is deliberately **duplicated** from
    `TradeCreditService.recordDrawdown` rather than called — it needs to
    run inside `OrdersService.checkout`'s own transaction (`tx`), and
    `recordDrawdown` uses the shared, non-transactional `PrismaService`.
    Same reasoning as the stock-check duplication a few passes back; see
    the comment in `orders.service.ts` and cross-reference in
    `docs/AGENTS.md` so both copies stay in sync if the rule changes.
    Cart clears in the same transaction too, for the same reason PayFast
    orders don't: trade credit has no async confirmation step to wait
    for — the moment the transaction commits, the order is paid. Frontend:
    `/checkout` now checks `GET /v1/trade-credit/me` (gracefully handling
    the normal 404 for retail accounts) and only shows the trade-credit
    option when there's an *approved* account — mirroring the same
    `approvedAt` check the API enforces, so the option never appears only
    to fail server-side.
12. Trade portal UI: ~~dashboard, bulk-order, credit-terms, quotes~~ —
    **all four done.** Dashboard shows credit available/limit and recent
    orders; bulk-order lets a trade account enter quantities across the
    whole catalog and add them all in one request (`POST /v1/cart/items/bulk`,
    new — validates every product id upfront so a bad line rejects the
    whole batch, not a partial silent apply); credit-terms shows the full
    account detail and reads naturally alongside the "Pay via Trade
    Credit" option checkout now offers.

    **Quotes** — the item that was deliberately deferred pending a real
    `Quote` model — is now built. Real design decisions made explicitly,
    not glossed over: a quote item can be either a real catalog product
    *or* pure free text (so a request can be entirely custom work, e.g.
    "on-site labour, 2 days," with no product at all). Acceptance
    deliberately does **not** auto-flow into Cart/Order — neither model
    has any concept of a negotiated, non-catalog unit price today, and
    wiring that properly is real follow-up work, not something to fake
    here; for this pass, acceptance just records the decision and notifies
    the team to follow up manually (raise an invoice, or create the order
    by hand at the negotiated price). Admin can re-price a quote up until
    the customer responds, but not after — re-pricing a decision already
    made on different numbers would be misleading. No separate `EXPIRED`
    status: expiry is checked against `validUntil` directly at response
    time. Followed every established convention from the rest of this
    build: `findAllAdmin`/`findOneAdmin` (avoiding the ownership-check bug
    caught earlier with orders), `admin` routes declared before `:id`
    routes, a new `quote.priced` notification wired through the full
    interface → template → producer chain, and audit logging on both
    `quote.priced` (admin) and `quote.accepted_by_customer` /
    `quote.declined_by_customer` (self-service, correctly attributed to
    the customer's own email). `/trade/quotes` (list, request form,
    detail with accept/decline) and `/admin/quotes` (list, per-item
    pricing form) — "Quotes" is back in `TradeNav`, removing the
    placeholder comment that explicitly named this exact model as the
    reason it wasn't there yet.
13. ~~Booking request flow~~ + ~~the two undone notification triggers~~ +
    ~~wire up `/estimate`~~ — **all done.** `/account/bookings` (list,
    detail, new-request form) lets a customer describe an issue in free
    text, optionally get a live estimate first (now wired to
    `POST /v1/estimate`, following the same proxy pattern as
    `/search-rank` and `/recommend` — except there's no meaningful
    fallback classification here the way search/recommend have; when the
    AI service is unreachable this says so honestly rather than guessing),
    and submit — the estimate's matched sector/service prefill the actual
    booking, falling back to a generic "General / GENERAL_CALLOUT" starting
    point if no estimate was fetched or it came back unavailable. Both
    notification triggers now fire for real: `BookingsService.updateStatus`
    queues `booking.scheduled` on a genuine transition to `SCHEDULED` with
    a date (not on every status change), and `ComplianceService.issue`
    queues `compliance.coc-issued` right after creating the record.
    Real mistake caught and fixed mid-build: these new account pages were
    first scaffolded under a literal `app/account/` folder, while the
    existing orders/addresses pages live inside the `(showroom)` route
    group at `app/(showroom)/account/` — both resolve to the same `/account/*`
    URLs, which is a real routing conflict, not just an inconsistency.
    Caught before anything shipped by checking the existing structure,
    moved the new folders to match, and added an explicit duplicate-route
    check (strip route-group parens, diff against itself) to the
    validation pass.
14. ~~Customer-facing warranty/CoC record views~~ — **done.**
    `/account/warranty` and `/account/compliance`, both reusing the
    existing `findMine` endpoints (`GET /v1/warranty`, `GET /v1/compliance/coc`)
    that already existed — no new API surface needed, only frontend.
    An `AccountLayout` sub-nav was added so all five account sections
    (orders, addresses, bookings, warranties, certificates) are actually
    discoverable from each other, rather than being isolated URLs nobody
    would find without knowing them by heart.

**Phase 3 is now complete** except the explicitly-deferred Quote model/module.

### Phase 4 — Admin & ops depth
15. ~~Expand the admin panel to orders, bookings, warranty, compliance, and
    trade-credit management screens~~ — **done.** Orders and bookings
    both needed new admin-scoped API endpoints first
    (`GET /v1/orders/admin`, `GET /v1/orders/admin/:id`,
    `GET /v1/bookings/admin`) — neither existed; every prior "list mine"
    endpoint was account-scoped by design. **Real bug caught before
    shipping**: the first draft of the admin order detail page used the
    customer-facing `GET /v1/orders/:id`, which checks the order belongs
    to the *calling* account — an admin would get a 403 on every order
    that wasn't their own personal purchase. Caught by re-reading
    `findOneForAccount`'s logic before writing the page; added
    `findOneAdmin` (no ownership check) instead. Warranty, compliance, and
    trade-credit account creation all reference a booking ID or account ID
    entered as raw text (copied from the orders/bookings lists, which now
    show emails, or from the booking list's visible ID) — there's no
    admin account-browsing UI yet to pick these from a list, so this is
    functional but rough. Also fixed a real duplication gap found while
    wiring nav access: `ADMIN_SCOPES` was hardcoded separately in
    `middleware.ts` and `Header.tsx` and had already drifted out of sync
    once when Phase 4 added five new scopes — extracted to a shared
    `lib/admin-scopes.ts`.
16. ~~Basic analytics/reporting endpoints + a simple dashboard view~~ —
    **done.** `modules/analytics/`: revenue/order summary (only counting
    statuses that represent an actually-paid order — `PENDING`,
    `CANCELLED`, and `REFUNDED` are excluded, same reasoning as
    `ReviewsService`'s verified-purchase filter), revenue bucketed by
    calendar day (raw SQL — `GROUP BY DATE_TRUNC('day', ...)` isn't
    expressible via Prisma's query builder), and popular products (tested
    explicitly for two easy-to-get-wrong cases: `groupBy`'s popularity
    order must survive the follow-up `findMany`, which doesn't guarantee
    result order matches its `WHERE IN` list; and a product that's since
    been deleted but still has historical order line items is dropped
    silently rather than crashing the whole endpoint). Dashboard at
    `/admin/analytics`.
17. ~~Audit logging for admin actions~~ — **done, for the highest-stakes
    actions specifically, not everything.** A reusable `AuditLogService.record()`
    that other services inject — deliberately swallows its own write
    failures (an audit-log hiccup must never make an already-successful
    admin action report back as failed) and has no foreign-key relations
    to anything else, so it can never block a delete elsewhere. Wired into:
    order status changes (with an honest `system:payfast-itn` actor for
    the ITN webhook path vs. a real admin email for the controller path),
    customer-initiated cancellations/refunds (labeled `_by_customer`
    explicitly, so self-service never reads as an admin action later),
    trade-credit account creation/drawdown/repayment, warranty issuance,
    and CoC issuance. **Not** wired in: product/category/bundle CRUD,
    booking status changes — a real, explicit scope boundary, not an
    oversight; each of those services' controllers would need the same
    "thread the acting admin's email through" treatment this pass gave
    six others, and this pass drew the line at money- and
    compliance-critical actions. Viewable at `/admin/audit-log`.
18. ~~OpenAPI/Swagger generation~~ — **done, pragmatically.** `@nestjs/swagger`'s
    CLI plugin (`nest-cli.json`) infers request/response schema from the
    class-validator decorators every DTO already has, rather than
    hand-annotating 20+ modules with `@ApiProperty()` — a real trade-off,
    not a shortcut hidden from view: the generated docs at `/docs` have
    accurate paths, methods, DTO shapes, and auth requirements (generated
    from the real code, not hand-maintained and liable to drift from it),
    but no prose description per field. Closes the gap `docs/AGENTS.md`
    flagged: an OpenAPI spec is now the actual contract, not just
    documentation describing one that didn't exist.

**Phase 4 is now complete.**

### Phase 5 — Compliance, observability, scale-readiness
19. ~~POPIA data export / account deletion endpoints~~ — **done, with a
    real interpretive choice made explicit, not hidden.** Export
    (`GET /v1/accounts/me/export`) gathers everything personal — orders,
    bookings, warranties, CoC records, addresses, reviews, trade-credit —
    deliberately excluding the cart (ephemeral working state, not really
    what a "what data do you hold on me" request is asking about).
    Deletion (`DELETE /v1/accounts/me`) **anonymizes rather than
    hard-deletes**: orders, bookings, warranty, and CoC records are kept,
    since financial and compliance records typically carry their own
    retention requirements independent of an erasure request, while
    purely personal data (addresses, reviews, cart) is actually removed
    and the account's email/company/phone are anonymized. Stated plainly
    in the code, not glossed over: this is a reasonable interpretation,
    not legal advice, and a real known gap is left open — `keycloakSub`
    is untouched, so the same identity signing in again finds the
    anonymized account rather than starting fresh; there's no
    re-registration flow. Frontend: `/account/privacy` (download-as-file
    export, a two-step confirm for deletion). **Found and fixed a real
    bug while wiring the frontend up**: `apiClient`'s shared `request()`
    function unconditionally called `res.json()` on every successful
    response — fine for every existing endpoint (all return a real JSON
    body), but the erasure endpoint is the first one in this codebase to
    genuinely return `204 No Content`, which has no body to parse at all.
    Fixed the shared client, not just this one call site. Relatedly:
    `@HttpCode(204)` alone doesn't stop the global
    `TransformResponseInterceptor` from attaching a `{data, meta}` JSON
    body anyway (a real HTTP spec violation — 204 responses must not have
    a body) — the endpoint uses `@Res()` directly instead, the same
    pattern `HealthController` already needed.
20. ~~Real health check (verifies DB + Redis, not just an HTTP 200)~~ —
    **done.** `GET /v1/health` actually pings Postgres (`SELECT 1`) and
    Redis (a short-lived, isolated client — deliberately not reusing the
    shared BullMQ connection, so a health check can never interfere with
    the notifications queue's own connection state), returns a real
    `503` on a degraded check via `@Res()`. `render.yaml` now points at
    it instead of the original `/v1/products` stand-in, which only ever
    proved the HTTP server itself was responding.
21. ~~Error tracking (Sentry) across all three services~~ — **done, with
    no real Sentry project to verify against yet**, same honest caveat as
    every other not-yet-configured integration in this build. `apps/api`:
    `src/instrument.ts` (imported first in both `main.ts` and `worker.ts`),
    wired into the existing exception filter by reusing its
    `shouldLogStack` flag — the signal already distinguishing genuine bugs
    from expected 4xx/known-constraint responses, so Sentry only ever
    sees what's actually worth alerting on. `apps/web`: this is where
    version research actually mattered — the current Sentry/Next.js
    convention uses `instrumentation-client.ts`, not the older
    `sentry.client.config.ts` (fixed after finding this via search, not
    guessed), and Next.js 14.x specifically **requires**
    `experimental.instrumentationHook: true` for `instrumentation.ts` to
    run at all (stable-by-default only from Next.js 15) — missing that
    flag would have meant the entire server-side Sentry wiring silently
    never executed. `apps/ai-service`: `sentry-sdk[fastapi]`, and — found
    while touching that file for an unrelated reason — its `/health`
    endpoint was the same kind of stand-in apps/api's used to be (a static
    `{"status": "ok"}`, no real check), so that got fixed too, plus a
    `healthCheckPath` added to `render.yaml`'s ai-service block, which had
    never had one at all.
22. ~~E2E test suite~~ — **done, with an honest, load-bearing caveat**:
    `npm run test:e2e` has referenced `./test/jest-e2e.json` since the
    very first NestJS project scaffold — that file, and the entire
    `test/` directory, never actually existed until this pass. The
    command has been silently broken this whole time. Built properly now:
    `test/utils/create-test-app.ts` deliberately mirrors `main.ts`'s real
    global setup (versioning, validation pipe, exception filter,
    interceptors) so these tests exercise the actual deployed request
    pipeline, not a friendlier stand-in; `test/app.e2e-spec.ts` covers the
    health check, public product browsing, the global validation pipe's
    `forbidNonWhitelisted` behavior, `KeycloakAuthGuard` rejecting
    unauthenticated/malformed-token requests, and the exception filter's
    404 shape. **These tests were written and validated for internal
    consistency — every assertion checked against the real controller
    code, not assumed — but have not been executed against a live
    database**, since no Postgres instance was reachable in the
    environment this was built in. `test/.env.test.example` documents
    exactly what running them for real requires. Verifying they actually
    pass against a real test database is the first thing to do with this
    suite, not an afterthought.
23. ~~Staging environment on Render~~ — **done.** `render.staging.yaml`
    mirrors production with fully separate infrastructure (own database,
    own Redis — staging data must never mix with real customer data) and
    staging-appropriate config (`PAYFAST_MODE=sandbox`,
    `NOTIFICATION_CHANNEL=log` so it never emails real customers,
    `SENTRY_ENVIRONMENT=staging` tagging errors separately from
    production's). Render's Blueprint auto-detection only picks up a file
    literally named `render.yaml`, so this needs to be referenced
    explicitly when creating a second Blueprint instance from the same
    repo — documented in the file's own header, not left implicit.

**All 25 roadmap items across all 5 phases are now complete — including
the Quote model/module**, the one item deliberately deferred from the
very first gap analysis. It turned out to be exactly the kind of thing
that deferral was for: a genuinely new feature needing its own schema and
workflow decisions, not a wiring gap like everything else in this
roadmap turned out to be. There is nothing left outstanding in this
document as of this pass.

**Beyond the original scope**: the Quote model's own follow-up work —
"acceptance doesn't flow into an order" — has since been partially
closed. `QuotesService.convertToOrder` lets an admin turn an ACCEPTED
quote into a real `CONFIRMED` order at its negotiated, VAT-inclusive
prices, atomically checking stock the same way `OrdersService.checkout`
does. Deliberately still narrow, not silently over-promised: only
quotes where every item references a real catalog product can convert —
`OrderLineItem.productId` is a required FK, so a quote with any pure
free-text/custom line item (e.g. "on-site labour") is rejected outright,
naming the offending item, rather than dropped or faked. See
`docs/AGENTS.md`'s Quotes section for the VAT-backing-out math and the
reasoning for why the admin supplies a shipping address at conversion
time (a quote request never collects one).
24. ~~SEO: sitemap, robots.txt, structured data~~ — **done.** Next.js's
    `sitemap.ts`/`robots.ts` conventions (product/category slugs fetched
    live, falling back to just the static routes if the API's
    unreachable at request time rather than 500ing the whole sitemap).
    JSON-LD `Product` markup on the PDP — `aggregateRating` deliberately
    omitted rather than faked, since review data is fetched independently
    by `ReviewsSection` and isn't available at the point in the page tree
    where the structured data is built without restructuring how the
    page fetches data.
25. ~~Stock replenishment + low-stock alerting~~ — **done.** A `restock`
    endpoint that atomically **increments** stock rather than overwriting
    it (`UpdateProductDto`'s plain `stockQty` field is still available for
    an absolute correction) — two admins restocking the same product
    around the same time both land, rather than one read-then-write
    silently losing the other's delta. "Alerting" is a visual low-stock
    highlight on the existing admin products list (≤10 units), not a
    separate notification — no new infrastructure needed for something
    admins already check regularly on that page.

**Remaining, genuinely open**: error tracking, an e2e test suite, and a
staging environment — none started.

---

## 3. What this document is for

Check items off in order within a phase; phases are meant to be sequential
since each depends on the last being usable. If priorities shift (e.g.
trade credit becomes urgent before Phase 1 finishes), that's a real
decision to make explicitly, not a reason to silently reorder this list —
update this document when that happens so it stays a source of truth
rather than drifting from what's actually being built.
