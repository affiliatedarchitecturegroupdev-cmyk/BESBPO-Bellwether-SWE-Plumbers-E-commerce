# Conventions for Agentic Development (OpenHands)

Read this before generating code. It exists so new modules extend the
foundation cleanly instead of drifting from it.

## File placement

Every new domain module goes in `apps/api/src/modules/<name>/` following the
exact shape of `products/` and `pricing/`:

```
modules/<name>/
├── <name>.module.ts
├── <name>.controller.ts
├── <name>.service.ts
├── dto/
│   └── *.dto.ts
└── interfaces/          (only if the module needs shared result types)
```

Never put business logic in `app.module.ts` — it's wiring only. Never put
business logic in a controller — controllers call a service method and
return its result; validation lives in DTOs, computation lives in services.

## Web test infrastructure — built, honestly unexecuted in this environment

`apps/web` had zero test infrastructure for most of this build — no
Jest config, no test files, not even a `test` script (see
`docs/GAP-ANALYSIS-III-FEATURE-EXPANSION.md` §2.1, the single starkest
gap in that whole document). Now has: `jest.config.js` using Next.js's
own official `next/jest` preset (not a hand-rolled ts-jest/babel setup —
this is what Next's own testing docs recommend, so JSX/TypeScript/CSS
Modules/image imports all get handled the same way the real build
already handles them), `jest.setup.js` for `@testing-library/jest-dom`
matchers, and `npm test` / `npm run test:watch` scripts.

**Genuinely important limitation, stated plainly**: this environment has
no network access for `npm install` (confirmed directly — a dry-run
install returns a 403 from the npm registry), so none of this has
actually been *run* here. The config was written carefully against
documented `next/jest` behavior and reviewed by hand since an empirical
test run wasn't possible — same category of limitation as the e2e suite
being unexecuted against a live database, or every external API
integration in this codebase (PayFast, ShipLogic, BulkSMS) being
untestable against real credentials in this sandbox. Running
`npm install && npm test` in a real environment is the necessary next
step to confirm this actually passes, not something to assume.

**Two real test files exist as the starting pattern**, not exhaustive
coverage — `QuoteRequestForm.test.tsx` (a form with real branching logic:
description validation, a catalog/custom toggle per row, add/remove-row
constraints, and both the success and failure paths of its server
action) and `VariantSelector.test.tsx` (simpler, but real logic: the
null-render threshold below 2 siblings, current-item highlighting,
out-of-stock styling). Both mock their server action / `next/navigation`
dependencies rather than hit anything real — standard practice for
component tests, not a shortcut specific to this codebase. Naming
follows `*.test.tsx`, the idiomatic convention for this ecosystem
(React/Next.js), deliberately different from the API side's `*.spec.ts`
(NestJS's own convention) — not an inconsistency, each side matches its
own ecosystem's idiom.

**Not done**: coverage of anything else — checkout forms, the bulk-order
table, admin forms, and everything else still have zero test coverage.
These two files establish the pattern and prove the infrastructure is
wired correctly; extending coverage broadly is real, separate follow-up
work.

## LoC discipline

- Target 280–800 LoC for logic-bearing files (services, controllers,
  components). If a service is approaching 800, that's usually a sign it's
  doing two things — split along that seam before it happens, not after.
- Hard cap: 1,500 LoC. A PR introducing a file past this must split it
  before merge — this is a CI-enforced blocker, not a suggestion.
- Types, DTOs, constants, and barrel files are naturally smaller than this
  range. Don't pad them to hit an average — that defeats the point.

## Path parameters and concurrency

Every `:id` route param is a UUID — always validate it with
`@Param('id', ParseUUIDPipe)`, never a bare `@Param('id') id: string`. A
malformed ID hitting Prisma directly used to surface as an unhandled 500
(now caught by the Prisma-aware `HttpExceptionFilter` regardless, but
`ParseUUIDPipe` gives a clearer error and fails before ever touching the
database).

For "find or create" logic keyed by a unique field (an account by
`keycloakSub`, a cart by `accountId`), use `prisma.<model>.upsert()`, not a
`findUnique` followed by a conditional `create`. The latter is a race: two
concurrent first-time requests can both see "doesn't exist yet" and both
attempt to create, and the second hits the unique constraint. `upsert` is
atomic at the database level. See `AccountsService.resolveOrCreate` and
`CartService`'s private `getOrCreateCart` for the pattern.

## Auth pattern

Every protected write endpoint uses `@UseGuards(KeycloakAuthGuard)` plus
`@Scopes('resource:action')` — see `products.controller.ts` for the pattern.
Don't invent a new auth mechanism per module. Public read endpoints (catalog
browsing, product detail) carry no guard at all.

## Database access

Only through `PrismaService`, injected via constructor. Don't instantiate
`PrismaClient` directly anywhere outside `modules/prisma/prisma.service.ts`.
Raw SQL (`$queryRaw`) is fine where Prisma's query builder genuinely can't
express something (see `products.service.ts`'s full-text search) — but it's
the exception, not the default.

## Errors

Throw Nest's built-in exceptions (`NotFoundException`, `BadRequestException`,
`ConflictException`, etc.) from services. Never construct a raw
`HttpException` with a hand-built status code — the global
`HttpExceptionFilter` already normalizes the response shape from whichever
built-in exception you throw. That filter also catches Prisma's known
error codes directly (unique constraint, FK constraint, record-not-found)
as a backstop — but that's defense-in-depth, not a substitute for an
explicit, contextual guard in the service itself where one makes sense
(see `ProductsService.remove()`'s reference check for what that looks like
done properly: a specific message about *why*, not just "conflict").

## Tests

Every new service method gets at least one unit test (happy path + the
exceptions it can throw). Every new controller endpoint gets an e2e test.
Follow `products.service.spec.ts` and `orders.service.spec.ts` for the
pattern — mock `PrismaService` via `test-utils/prisma-mock.ts`'s
`createPrismaMock()`, don't hand-write a fresh mock shape per test file.
Note what `products.service.spec.ts` deliberately does NOT cover (the raw
`$queryRaw` full-text search path) and why, in its file header — that's the
right call to make elsewhere too: unit-test the branching logic, leave raw
SQL to an integration test against a real Postgres instance.

## What NOT to change without a docs update in the same PR

- `prisma/schema.prisma` — schema changes ripple into the frontend's
  shared-types package and the AI service's assumptions about the data
  model. Update `docs/ARCHITECTURE.md` in the same PR as any schema change.
- `render.yaml` — new services or env vars need to be reflected here so
  deploys don't silently drift from what's documented.
- The auth/scopes pattern in `common/` — this is shared across every module;
  changing it is an architecture decision, not a routine PR.

## Media / image uploads

`modules/media/` handles product images via a deliberate two-step flow —
don't build a single "upload this file" endpoint that proxies bytes
through the API:

1. `POST /v1/media/product-images/upload-url` returns a presigned S3 PUT
   URL. The client uploads directly to S3, not through this API.
2. `POST /v1/media/product-images` is called *after* the upload succeeds,
   and is what actually creates the `ProductImage` row.

This keeps large binary uploads off the API server entirely. If a new
entity needs image support (categories, bundles), follow this same
two-step shape rather than reusing `products:write`'s exact endpoints —
see the scope comment on `MediaController` for why that scope choice
doesn't automatically extend to other entities.

## Low-stock alerts — the second of Gap Analysis V's recommended new features

`ProductsService.findLowStock` is deliberately the inverse of
Clearance's own real signal, not a flat `stockQty < N` threshold — the
exact design named in the original recommendation. A product with 20
units left and zero recent sales isn't urgent; a product with 20 units
left selling 5/day is genuinely about to run out. "Days of stock
remaining" (`stockQty ÷ real recent daily velocity`) is the number that
actually matters, and it's what the results sort by — most urgent
first.

**Two deliberate exclusions, both stated directly in the method's own
comment**: already-out-of-stock products (`stockQty === 0`) are
excluded — that's a different, already-handled problem
(`BackInStockService`), not a restock-timing one. Products with zero
measurable velocity in the window are also excluded — with no real
sales signal, "days remaining" is mathematically undefined (division by
zero), not a real 0-day emergency.

The admin screen (`/admin/low-stock`) includes a quick restock action
per row, reusing the exact same `restockProductAction` server action
the main products list already has — no second restock implementation.

**Also surfaced as a fourth card on the "Business Health" section**
(`/admin/analytics`) — added after Gap Analysis V's admin-analytics
work was already done, a natural small extension now that a real
low-stock signal exists to show. Deliberately reuses the same
admin-gated `/v1/products/low-stock` endpoint the dedicated screen
itself calls, rather than a second, duplicate detection method on
`AnalyticsService` — the section only needs the count, and there's no
reason to re-implement the real velocity logic a second time just to
get a number.

## Back-in-stock notifications — the first of Gap Analysis V's recommended new features

`BackInStockRequest` is deliberately **upsert-based, not append-only** —
resubmitting a request for the same email+product re-arms it (clears
`notifiedAt` back to null) rather than creating a second row. A
customer wanting to hear about a *later* restock, after already being
told about an earlier one and the product going out of stock again, is
the same real intent as a first-time request, not something to reject
as a duplicate.

**`requestNotification` rejects outright if the product is currently in
stock** — "notify me when back in stock" for something that's already
in stock isn't a real request, it's almost certainly stale page state
from the customer's browser.

**`notifyIfBackInStock` is deliberately narrow**: it only fires on the
specific zero-to-positive stock transition, not on every stock change
(a restock from 50 to 60 units doesn't need to tell anyone anything).
Wired into `ProductsService` at **both** places stock can actually
increase — `restock()` (the dedicated admin action) and the general
`update()` method (which also allows editing `stockQty` directly).
Both were changed to fetch the product's stock *before* the write, so
the real previous/new values can be passed through rather than the
service having to infer a transition happened.

**A real, honest catch during this build**: my first attempt at adding
the new type to the shared constants file was a no-op — the old and new
text I passed to the edit were identical, so nothing actually changed.
Caught by checking the actual file content afterward rather than
trusting that the edit call succeeding meant it did what I intended,
and fixed properly before moving on.

Added to `ProductsModule`'s own dependency graph
(`ProductsModule → BackInStockModule → NotificationsModule`) — confirmed
this doesn't create a cycle, since `BackInStockModule` has no reason to
import `ProductsModule` back.

The product page shows a real "Notify me" form only when
`stockQty <= 0` — public, no account required, calling the new
endpoint directly client-side rather than through a server action,
same reasoning as `ProductCombobox`/`NewsletterBanner` already
established for public, session-less endpoints.

## Gap Analysis V, part 3: admin analytics catches up — with one honest exclusion

The last of Gap Analysis V's three checked findings: `AnalyticsService`
covered revenue, orders, and popular products, but nothing surfaced
Clearance, trade application, or bundle data anywhere — despite each
already existing in its own real admin screen.

**A real, deliberate decision made before building anything**: bundle
"performance" was one of the three things asked for, but there is no
bundle-price checkout mechanism anywhere in this codebase (a stated,
existing scope boundary — a `Bundle` is an admin-curated list of
products with no way to track whether it was ever actually purchased
*as* a bundle, since "Add to cart" adds its items individually).
Reporting a "performance" number here would imply real sales data that
doesn't exist. Built `getBundleCatalogSummary` instead — an honest
count of bundles defined, by sector — rather than fabricate a metric
the platform can't actually measure.

**`getClearanceSummary`** computes real discount value currently
live — `(retailPrice − salePrice) × stockQty` summed across every
active item — using the exact same "is this active" check
`ProductsService.findOnSale` already uses (`salePrice` set, `saleEndsAt`
null or still future), not a second, independently-drifting
reimplementation of the same logic.

**`getTradeApplicationFunnel`** returns `approvalRate: null` (not `0`)
when nothing has been reviewed yet — a genuinely different fact from
"0% approval rate," and conflating the two would mislead whoever's
reading this dashboard about whether the business is actually
rejecting applications or just hasn't reviewed any yet.

All three new admin-analytics endpoints reuse the existing
`orders:manage` scope gate rather than introducing a new one — the
same reasoning `AnalyticsController`'s own existing comment already
gives for why analytics as a whole doesn't have a dedicated scope.

The admin analytics page gained a "Business Health" section with all
three, each linking through to its own full admin screen
(`/admin/clearance`, `/admin/trade-applications`, `/admin/bundles`) —
a summary view, not a duplicate of any of them.

## Gap Analysis V, part 1: two real notification gaps closed

Found by checking `NOTIFICATION_TYPES` (10 real types, genuine
infrastructure) against every workflow with a real multi-stage
lifecycle — two had zero notification hook at all, despite both
updating their own database state on every transition.

**Trade account applications** — `approve()`/`reject()` updated the
application and the account's type but never told the applicant.
Fixed by adding `trade-application.approved`/`.rejected` following the
exact five-place pattern already proven nine times in this codebase
(job interface, queue method, rendering switch, context-builder,
shared constants). The notification is queued *after* the
account-type/application-status transaction commits, not inside it —
a queue failure shouldn't roll back an already-successful approval.

**Returns/RMA** — a real state machine
(`REQUESTED → APPROVED → RECEIVED → REFUNDED/REPLACED`, `REJECTED`
reachable from two different states) with zero notification at any
transition. Fixed with one new type, `return.status-changed`, covering
all five transition methods rather than five near-identical types —
the status itself is the only thing that varies per transition, and
`describeReturnStatus` in `notification.templates.ts` renders different
copy per status from that one field. `RETURN_INCLUDE` (the shared
Prisma include used throughout `ReturnsService`) was extended to also
fetch the order number and account email, since every transition needs
both now. The refund transition's notification is deliberately queued
only after the real refund call to `PaymentsService` succeeds — a
customer should never get a "your refund is done" email for a refund
that actually failed.

Both existing test suites (`TradeAccountApplicationsService`,
`ReturnsService`) were rewritten to match the new constructor
dependencies and carry real assertions that the right notification
fires with the right content — not just patched to compile.

## Gap Analysis V, part 2: sitemap coverage gap closed

A second real gap in the same document: `sitemap.ts`'s static routes
list was never updated as real, public pages were added in later
passes. Bundles, the bundle listing, Clearance, Trending, and all
seven legal/informational pages were live and indexable but completely
absent from the file meant to help search engines discover and
prioritize them. Fixed by adding the seven fixed pages as static
routes (no new fetching needed) and a bundle-slugs fetch alongside the
existing product/category fetches, reusing the same
`GET /v1/bundles` endpoint the bundle listing page already calls.
`/clearance` and `/trending` are dynamic listings, not identified by
slug — included as their own listing-page URLs, the same treatment
`/search` already gets, not per-item.

## Legal/info pages — refreshed against everything built since they were first written

User asked to revisit Terms/Privacy/Returns/Shipping/About/Contact/FAQ.
Checked each directly against current reality rather than assuming they
were still accurate, given how much has shipped since Gap Analysis IV
first built them (trade applications, Clearance, product comparison,
guest order tracking, bundles).

**A real, stale, misleading link found on Contact**: it pointed to
`/trade/dashboard` for trade account applications — but that page
requires already being signed in with an existing trade account; the
real application form lives at `/trade/apply`, built afterward. Fixed
to point at the actual application page, keeping the dashboard link
for existing trade customers asking about credit specifically.

**About** wasn't wrong, just missing the opportunity — added a direct
link to `/trade/apply` where it already discusses trade accounts.

**FAQ gained four new entries** for real, shipped features it had no
question for at all: guest order tracking, Clearance, product
comparison, and bundles. Terms, Privacy, Returns, and Shipping were all
checked and found to still be accurate as written — general enough not
to have gone stale, and their existing cross-links (`/account/privacy`,
`/account/orders`, `/contact`) all still resolve correctly.

## Clearance/Trending listing pages — a real pagination refactor, not two new one-off pages

The last two outstanding pages from the homepage plan. Rather than build
`/clearance` and `/trending` as separate, dedicated queries with a
hardcoded "top 20" cutoff, `findOnSale` and `findTrending` were converted
to genuine pagination (`page`/`pageSize`, the same shape as every other
listing endpoint in this codebase) — a "see all" page with a silent cap
defeats its own purpose, and this way the homepage's small preview and
the full listing page share one implementation rather than two to keep
in sync.

**`findTrending`'s pagination is deliberately in-memory** — Prisma's
`groupBy` has no "count of groups matching a having clause" shorthand,
so this fetches every matching group (bounded naturally by the 7-day
window and minimum-order threshold — genuinely not expected to be
large) and slices for the requested page, rather than a second,
separate raw-SQL count query for what's a small result set in practice.
Stated as a deliberate tradeoff, not an oversight.

**A real mistake caught mid-edit**: the string-replace on
`findTrending`'s own comment left a duplicated, orphaned copy of the old
comment sitting above the new one. Caught by checking the file
immediately after the edit rather than assuming it landed cleanly.

**A second real mistake caught before shipping, this time by checking
every other caller of the two changed endpoints**: `/admin/clearance`
still called `/v1/products/on-sale?limit=20` and expected a plain array
back — exactly the shape these endpoints returned before this refactor.
Left unfixed, the admin Clearance review screen's own "Currently On
Sale" section would have broken at runtime the moment this shipped
(`.map` on what would now be a `{items, page, pageSize, total}` object,
not an array). Fixed by updating that one remaining caller to the new
paginated shape and query params before considering this done — a
direct example of why checking every caller of a changed endpoint
matters, not just the ones the current task happens to be about.

## Admin-wide customer listing — the last genuinely missing admin page

Confirmed directly before building: every endpoint on `AccountsController`
was scoped to "me" (the current caller's own account) — there was no
admin-wide view of accounts at all, matching what had been flagged as an
outstanding gap in earlier passes.

**Read-only, gated by its own new `accounts:read` scope** — this pass
doesn't add any account-mutation capability from the admin side (no
editing a customer's details, no manually flipping their type), so
there's no `accounts:manage` scope to go with it yet. `trade
applications` already handles the one real mutation an admin needs
(switching an account to trade pricing); adding broader account editing
here would be new, separate scope.

**Search matches email OR company name together**, not just one field —
an admin looking for a specific customer rarely remembers which one
they'll actually be found under.

**The detail view includes real, useful aggregates** (order count,
trade credit status) alongside the account itself, specifically so
reviewing one customer doesn't require opening three other admin
screens to piece together the same picture — but deliberately doesn't
duplicate those other screens' own detail (order history itself, trade
application history, returns) — this page states that boundary
directly rather than half-reimplementing what Orders/Trade
Applications/Returns already do well.

**Same `@Max(100)` page-size cap as every other listing endpoint** in
this codebase, applied without needing to relearn the lesson from the
earlier pageSize live-bug — checked and matched deliberately, not
assumed.

## Trade account applications — the mechanism that never existed, not just a form

Started as "build the trade account application page," recommended as
the highest-priority outstanding page. Checking before building turned
up something bigger: no mechanism existed anywhere in this codebase —
not even administrative — to ever set `Account.type` to `TRADE`. The
only place `AccountType.TRADE` was referenced at all was
`CartService`'s own read of it for pricing. A real, honest correction to
an earlier claim in this same project (that trade account type
"appears to be set administratively") — it wasn't set anywhere, by
anyone.

**`TradeAccountApplication` is deliberately its own model, not a field
or flag on `Account`** — it needs its own real lifecycle (pending,
approved, rejected, with a rejection reason a customer can actually
see), which a boolean or enum field on `Account` couldn't represent
without losing the history of prior attempts.

**Trade account TYPE (pricing) and trade CREDIT (payment terms) are
kept genuinely separate**, on purpose, at every layer: separate models
(`TradeAccountApplication` vs. `TradeCreditAccount`), separate admin
scopes (`trade-applications:manage` vs. `trade-credit:manage`, so a
business could authorize different people for each), separate admin
screens (`/admin/trade-applications` vs. `/admin/trade-credit`),
separate customer-facing pages (`/trade/apply` vs. applying for credit,
which stays administrative and happens only after an account already
has trade type). A customer already on trade pricing who visits
`/trade/apply` sees that stated plainly, with a pointer to the trade
dashboard for credit instead of a form that would just error.

**Approving an application updates two things in one transaction** —
`Account.type` and the application's own status — specifically so
those two facts can never end up out of sync with each other (an
application marked approved with the account somehow still RETAIL, or
vice versa, would be a real, confusing bug to have to debug later).

**The customer-facing page handles all four real states**, not just
"show a form": already has trade pricing, a pending application awaiting
review, a previously-rejected application (shown honestly, with the
actual reason, inviting re-application rather than treating rejection as
a dead end), and the fresh-application form. Duplicate pending
applications are blocked server-side, not just discouraged in the UI.

Updated the homepage's own Trade Account CTA and the FAQ's "how do I get
trade pricing" answer to point at this real page — both had previously
pointed at `/contact` or spoken generically, for the honest reason that
no real destination existed until now.

## Clearance ("On Sale," done smart) and Trending This Week — the last two homepage sections

User's stated framing on "On Sale," worth preserving verbatim in spirit:
not a fan of sales as a tactic, but recognizes they're good for the
business — wanted "a smart mechanism," not arbitrary or manual
discounting. Built accordingly, as two genuinely separate pieces:

**The actual "smart" part is a backend query, not a UI label.**
`ProductsService.findClearanceCandidates` doesn't let an admin pick
products to discount on a whim — it queries for products with real
stock above a threshold (default 20 units) that have had *zero order
activity* in a recent window (default 60 days). That's a real,
inventory-driven signal (genuinely slow-moving stock tying up capital
and warehouse space), not discounting for its own sake. Deliberately
does NOT auto-apply anything — a brand-new product with zero sales
isn't "slow," it's just new, and an unreviewed automatic discount is a
real risk against existing trade pricing relationships. Candidates
surface on a real admin review screen (`/admin/clearance`) where a
human sets the actual price and confirms.

**Schema**: `Product.salePrice` (nullable) and `saleEndsAt` (nullable).
Both null is the normal case for almost every product. A null
`saleEndsAt` with `salePrice` set means "on sale until manually turned
off," not "forever" as a default assumption — every query/component
that reads `salePrice` for display also checks `saleEndsAt` against the
current time (`lib/is-on-sale.ts`, one shared check so `PriceTag`'s
price display and `ProductCard`'s badge can't independently drift on
what "active" means), so an expired sale reverts to normal pricing
without needing a cron job to clear the field.

**Two real, separate query methods, not one** —
`findClearanceCandidates` (admin-only, gated by `products:write`,
feeds the review screen) and `findOnSale` (public, feeds the
storefront) are deliberately different: the former does real detection
work against order history, the latter is a plain filter for whatever
an admin has already confirmed. Conflating them would mean either
exposing unreviewed candidates to customers, or making the public query
do unnecessary detection work on every page load.

**`PriceTag` change**: when a sale is active, shows the sale price with
the original struck through (retail or trade, whichever would otherwise
apply) rather than just a lower number with no context — the discount
should be visible, not just present. Real tests cover both accounts
types and the expired-sale fallback.

**Trending This Week**: `ProductsService.findTrending`, a genuinely
different signal from Best Sellers, not a near-duplicate section — a
7-day window (not all-time) with a minimum order-count threshold
(default 3, same reasoning as `findTopRated`'s `minReviews`: without
it, a single order for an obscure product would look "trending" off
pure noise). Same shape as `findPopular` otherwise (grouped, summed,
descending, order preserved against the database's own unordered
`WHERE IN` return).

Both sections now live on the homepage, in the order proposed in the
delivered UI/UX plan: New Arrivals → Trending This Week → Clearance →
Shop Bundles.

## Homepage structure build-out — 9 new sections, following the delivered UI/UX plan

A separate advanced UI/UX planning pass (wireframes + mockups, delivered
as a PDF) recommended 14 homepage sections, graded honestly by real
build status. Two (Shop by Category, Best Sellers) were already live
from the Gap Analysis IV work above. This section covers building the
remaining 9 graded "ready now" — plus two real, honest corrections
found while actually building them, not assumed from the plan alone.

**A real counting error caught in the plan itself before building
anything**: the plan's own roadmap said "9 sections ready now" but its
table actually listed 11. Checked directly with the plan's own source
data before starting, rather than silently building an arbitrary 9.
Since 2 of those 11 were already live, there genuinely were 9 left to
build — a coincidence worth stating plainly rather than letting stand
unexamined.

**A second, more consequential finding, also caught by checking rather
than assuming**: "Shop Bundles" was graded ready because
`GET /v1/bundles` and `GET /v1/bundles/:slug` already existed — but no
customer-facing bundle page existed anywhere on the frontend, only the
admin create/edit UI. A homepage section linking to bundles would have
linked to nothing. Built `/bundle/[slug]` and `/bundles` (a listing
page) as part of this pass rather than ship a section pointing at a
404.

**An even more consequential finding while building the bundle
page**: no bundle-aware checkout mechanism exists anywhere — a
`Bundle` is an admin-curated list of products at a stated combined
price, with zero code connecting that price to what a customer
actually pays at checkout. Rather than silently imply otherwise, the
bundle page states this directly to the customer ("there is no
automatic bundle-price checkout yet") and its "Add to cart" button
adds each item at its own individual retail price via the same
`bulkAddToCartAction` the bulk-order page already uses — genuinely NOT
the bundle's discounted price. A real bundle-price checkout mechanism
(e.g. detecting a complete matching set of bundle items in the cart
and applying the bundle's own discount, similar in shape to the
existing coupon system) is real, separate, unbuilt work.

**A third finding, smaller but still worth naming**: no self-service
"apply for trade account" page exists anywhere — trade account type
appears to be set administratively. The Trade Account CTA links to
`/contact` rather than a page that doesn't exist, since implying a
real application flow would be misleading.

**"Top Rated" needed one small new backend method**, not purely
frontend work as the plan's summary framing implied —
`ProductsService.findTopRated`, using Prisma's `groupBy` with a
`having` clause on review count. A minimum review threshold (defaults
to 3) matters for a real reason: without it, a single 5-star review
would outrank a product with 50 reviews averaging 4.8, genuinely
misleading as "top rated." Doesn't need a second `attachRatings` query
like `findPopular` does — the same `groupBy` that determines the
ranking already computes the exact average/count values that method
would have looked up separately.

**Recently Viewed** follows the exact same localStorage pattern as the
existing Compare feature (`lib/recently-viewed.ts` mirrors
`lib/compare-list.ts`'s shape deliberately) — product slugs, not IDs,
for the same reason (no by-ID product lookup endpoint exists). A tiny,
invisible client component (`RecentlyViewedTracker`) is mounted on the
product page specifically because the page itself is a server
component and can't touch `localStorage` directly; its only job is the
`useEffect` side effect of recording the view.

**Newsletter Banner is a genuinely separate component from the
footer's `NewsletterSignup`**, not a shared one with style props — the
footer version is compact and dark-background-styled; this one is a
full-width, light-background homepage section. Both call the same real
`POST /v1/newsletter/subscribe` endpoint.

**Deliberately NOT built in this pass**: "On Sale" (needs a real
product decision on how sale pricing should work — a new `Product`
field vs. an auto-applied coupon — not defaulted to whichever was
technically easiest) and "Trending This Week" (needs a date-windowed
variant of `findPopular`, currently all-time only). Both were graded
"needs extension/new backend" in the original plan, not "ready now,"
and stayed out of this pass on purpose.

## Gap Analysis IV, remaining items — real homepage data, a second live bug, and five new pieces

**Homepage "Popular Products" now uses real order-history popularity.**
`ProductsService.findPopular` reuses the same query shape
`AnalyticsService.getPopularProducts` already established (order line
items grouped by product, summed quantity, descending), but returns
full product records rather than that method's lighter admin-analytics
shape. Falls back to newest-first when there's no order history at all
yet — "popular" has no real meaning with zero signal to base it on.
Tested directly against a deliberately-reversed mock to prove it
doesn't just trust the database's own return order, matching the same
reasoning `AnalyticsService`'s own code already documents. The homepage
also gained a real "Shop by Category" grid — 19 substantial categories
existed with nowhere near enough visibility before this.

**A second live bug, found and fixed while working on the first
one's neighboring code**: `/category/all`, linked from the homepage's
own "Browse all" button, is a genuine 404 — no category anywhere has
the slug `"all"`. Confirmed `/search` with an empty query correctly
falls through to an unfiltered listing (`ProductsService.findAll`
only takes its search branch when `search` is non-empty), and
repointed the link there rather than inventing special-case handling
for a slug that was never real.

**A real correction to this document's own earlier claim**: an earlier
gap-analysis pass here said the product page already had
`generateMetadata`. Re-checking before building on top of it found
that was wrong — the only `metadata` export anywhere was the root
layout's static, site-wide one. Every product page showed the same
generic title regardless of which of 8,491 products was open. Product,
category, and search pages all have real metadata now, each reusing
the exact data-fetching helper (`fetchProduct`, `fetchCategory`) its
own page component already calls.

**Guest order tracking** — `OrdersService.findByOrderNumberAndEmail`,
public, no auth. The one real security property worth naming: it
throws the identical generic error whether the order number is wrong
or the email doesn't match it, so nobody probing real order numbers
can distinguish the two cases. `POST /v1/orders/track`, not `GET`,
keeps the email out of any URL or server log. Linked from the guest
checkout success page — the exact place a guest previously had no way
to check status beyond "check your email."

**Product comparison** — a real bug caught and fixed before it shipped:
the first draft of `lib/compare-list.ts` stored product IDs and
referenced a `GET /v1/products/by-id/:id` endpoint that was simply
invented, not real — only slug-based lookup exists. Caught by checking
the controller directly before finalizing the feature, and the whole
thing was switched to store slugs instead, reusing the exact
`GET /v1/products/:slug` the product page itself already relies on,
rather than adding a new backend endpoint for one feature. Backed by
localStorage (real browser storage is fine in this actual deployed
app — the "no localStorage" restriction is specific to React artifacts
rendered in Claude.ai's own sandbox, not this codebase), capped at 4
products, with a custom same-tab event
(`compare-list-changed`) since the native `storage` event only fires
across different tabs/windows, not within the one a change actually
happened in.

**Newsletter signup** — `NewsletterSubscriber`, its own standalone
model rather than a field on `Account`, since most subscribers will
never have an account at all. Both `subscribe` and `unsubscribe` are
deliberately idempotent: submitting an already-subscribed email twice,
or unsubscribing an email that was never subscribed, are quiet
successes, never errors a visitor filling in a footer form should see.
A previously-unsubscribed email resubscribing clears `unsubscribedAt`
rather than creating a second row.

**Also added**: a root-level custom 404 (`app/not-found.tsx`, mirroring
the existing product-specific one's design), and seven informational/
legal pages (Terms, Privacy Policy, Returns Policy, Shipping, About,
Contact, FAQ) — each describing what the platform actually does rather
than inventing plausible-sounding policy details it doesn't enforce
(the Returns Policy deliberately states no specific return window,
since the system genuinely doesn't check one; stating a false number
would be a real, misleading gap between policy and behavior). Terms and
Privacy are explicitly commented as reasonable starting templates, not
legally-reviewed documents.

## Fixing a live bug: pageSize>100 breaking five pages, and an empty sitemap

**Found during Gap Analysis IV, fixed immediately given the severity.**
Five pages — guest checkout, trade bulk-order, trade quote requests,
recurring orders, and admin bundle creation — each pre-fetched up to
`pageSize=200` products server-side to populate a static `<select>`
dropdown. The public products endpoint's own `QueryProductsDto` caps
`pageSize` at 100 (`@Max(100)`), and `apiClient.get` throws on any
non-2xx response — confirmed directly, not assumed. None of these five
pages wrapped their fetch in a try/catch, so visiting any of them most
likely threw an uncaught exception, caught by the nearest `error.tsx`
boundary. `sitemap.ts` hit the same cap requesting `pageSize=500`, but
its own try/catch silently fell back to just 2 static routes — meaning
the sitemap had zero product or category URLs at all, not a partial
list.

**The real fix wasn't "raise the cap"** — even a successfully-loaded
100-item unsorted dropdown is unusable at an 8,491-product catalog.
Built one reusable component, `ProductCombobox`
(`components/commerce/ProductCombobox.tsx`), a debounced (250ms),
type-ahead search against the same `GET /v1/products?search=` the
search page already uses (confirmed this already does real full-text
search via tsvector/pg_trgm before building anything new on top of it).
Real tests cover debouncing (no request fires below the minimum query
length, and typing multiple characters quickly only fires one request,
not one per keystroke), selection, already-selected-item exclusion, and
the empty-results state.

**All five forms rebuilt around it**, each moving from "N static rows,
each with its own product dropdown" or "every product rendered as a
table row" to "search and add to a working list," with the server-side
`pageSize=200` fetch removed entirely from each page:
- `CreateRecurringOrderForm`, `GuestCheckoutForm` — straightforward
  swaps to the search-and-add pattern.
- `BulkOrderTable` — kept its table layout (SKU/name/trade
  price/quantity), only changed how rows get populated. Caught a real
  bug of my own here before it shipped: an early version tried
  fetching a product by SKU against an endpoint that expects a slug,
  which would have 404'd — fixed by extending `ProductCombobox`'s own
  `ProductOption` to carry `tradePrice` through directly from the
  search result it already has, avoiding a second fetch entirely.
- `QuoteRequestForm` — the trickiest rebuild, since it has a genuine
  per-row catalog-vs-free-text toggle that needed to survive the
  change. Its entire existing test suite (which relied on a static
  `products` prop with fixed test values) was rewritten to mock the
  search call instead, preserving every original test's intent rather
  than dropping coverage during the rebuild.
- `BundleItemsPicker` — kept its native `<form action={serverAction}>`
  + hidden-JSON-input serialization pattern exactly as it was; only the
  product-selection mechanism inside it changed.

**The sitemap fix is a dedicated, unpaginated endpoint, not a higher
page size** — `GET /v1/products/all-slugs`
(`ProductsService.findAllSlugs`), returning only `{slug}[]`, nothing
else. Deliberately NOT the same fix as raising `findAll`'s own cap: a
client asking for arbitrarily many *full* product records (pricing,
stock, description) at once is a real abuse vector worth capping;
asking for every slug, with no other data attached, isn't — the payload
stays small regardless of catalog size specifically because it carries
so little per product. `sitemap.ts` now calls this instead of the
capped, previously-failing request.

## General admin bulk product import/export — distinct from the one-time catalog script

**A genuinely separate capability from `prisma/import-catalog.ts`**, which
was built to load one specific real catalog feed and documents its own
judgment calls in `docs/CATALOG-IMPORT.md`. This is the general,
reusable "any admin can upload a CSV through the UI, anytime" feature
the original gap description (§5.1) actually asked for — no advance
knowledge of what's in a given file beyond the fixed column schema.

**Followed the existing "validate everything, reject the whole batch"
precedent, found by searching rather than assuming one existed.**
`CartService.bulkAddItems` already validates every product ID exists
before any cart mutation happens — the same discipline applies here to
an entire uploaded file: every row is checked first, and if even one
row anywhere in the file is invalid, nothing is created or updated at
all. Proven directly in a test with a 2-row file where only the second
row is invalid, asserting neither `create` nor `update` was ever
called.

**A deliberate, low-risk technical choice on how the file gets to the
server**: rather than add multipart file-upload handling — a new
dependency and a pattern that doesn't exist anywhere else in this
codebase — the browser reads the file client-side via `FileReader` and
posts its text content as a plain JSON field. Consistent with the rest
of this JSON-API-style backend rather than introducing a second upload
mechanism just for this one feature.

**Export and import deliberately share one column schema** — an
unmodified export is itself a valid re-import, which is exactly the
"export, edit offline, re-import" workflow the original gap asked for,
not just a one-way backup dump. A test asserts the export's own header
row matches import's expected columns exactly, so the two can never
silently drift apart.

**Upsert by SKU, not reject-on-existing** — an already-existing SKU
updates in place rather than erroring, since "bulk-editing offline" was
explicitly named in the original gap; a genuinely new SKU creates as
usual. Both counts are reported back to the admin (`created`, `updated`)
so a re-upload after an offline edit is easy to distinguish from a
first-time load.

**A separate service file, not an addition to the already-402-line
`ProductsService`** — `ProductsBulkService`, following the same
separation-of-concerns pattern as `PricingAdminService` sitting
alongside `PricingService`: CSV parsing/validation/generation is a
genuinely distinct concern from core product CRUD, recommendations, and
variant management.

## Recurring/scheduled orders — the last Gap Analysis III item, real synergy with split checkout

**Trade-credit only, for the same fundamental reason as split checkout,
stated explicitly rather than treated as a coincidence** — an automated
background job has no interactive browser session to redirect to
PayFast. `RecurringOrderTemplate`'s own schema comment says this
directly: the same constraint shows up wherever "no human is present to
click through a payment page" applies, not by accident.

**A real correctness issue identified before writing the service, not
discovered afterward**: generating an order from a template means
adding its items to the account's cart first, via the same
`CartService.bulkAddItems` every other cart-mutating flow already uses.
Checking out the *whole* cart at that point would risk sweeping in
whatever unrelated items the customer already had sitting there. The
fix reuses the exact `cartItemIds` mechanism split checkout introduced —
add the template's items, then check out only those specific resulting
cart item IDs. A genuine synergy between two features built in
consecutive passes, not a coincidence; the same test file proves it
directly, with a mock cart that deliberately includes an unrelated item
alongside the template's own.

**A real design decision on failure handling, not left implicit**: if an
automatic run fails (insufficient trade credit, a discontinued product),
the template is rescheduled to the *next* cycle regardless of the
failure — never retried at the next daily cron tick. Without this, a
persistently-failing template would retry every single day and spam the
customer with daily failure emails instead of one per actual cycle. The
failure reason is stored on the template (`lastRunError`) and surfaced
directly to the customer, both via a real notification and on the
account page itself — never silently swallowed.

**One failing template never blocks the rest** — `processRecurringOrders`
wraps each template's own processing in its own try/catch, the same
principle `CartAbandonmentService`'s per-cart loop already established
for exactly this reason.

**`computeNextRunAt` is a standalone pure function**, not a service
method — same reasoning as `resolveBestTier`: no dependencies, so no
reason for an injectable wrapper. A frequency change on `update()`
reschedules from *now*, not from the template's original creation or
last-run date — a customer switching from monthly to weekly clearly
wants the next run to reflect that change immediately, not to keep
counting from an old anchor point.

**Two new notification types threaded through every place a
notification type has to exist** — the job interface, the queue methods
on `NotificationsService`, the actual rendering logic, the pure
context-builder the admin-editable-template feature already relies on,
and the shared type/placeholder constants that feature's own admin UI
reads from. Missing any one of these five would have meant either a
runtime type error or an admin unable to see/customize the new
notification's copy — checked each one explicitly rather than assuming
the pattern from the four prior notification types would just transfer.

**Customer-only, no admin surface in this pass** — an admin needing to
view or intervene on a customer's recurring orders is a real, separate
capability, not attempted here, and stated as such directly in the
controller's own comment.

## Multi-address / split checkout — one part already solved, real correctness work on the other

**Checked the existing `CheckoutForm` before designing anything, and
found half the original gap was already solved.** "Ship to a different
address than usual, as a distinct concept" already exists — the
checkout form's saved-address picker lets a customer select from their
own addresses or type something different for this one order. The
genuinely remaining piece was splitting *one checkout* across multiple
destination addresses.

**A real, subtle correctness issue found while designing this, not
discovered later**: `Order`/`OrderLineItem` are a snapshot with no
direct link back to specific `CartItem` IDs. Tracing
`PaymentsService.handleItn`'s cart-clearing showed it unconditionally
cleared the *entire* cart on any payment confirmation — fine for a
normal order (nothing else would be left anyway), but actively wrong
for a split order: confirming one destination's payment would wipe out
a sibling split order's items still awaiting its own payment. Fixed by
having `handleItn` clear only by the confirmed order's own line-item
product IDs, which is a genuine correctness improvement for the
existing single-order case too, not just an accommodation for
splitting — the two are now provably equivalent for a normal order
rather than just happening to coincide.

**A deliberate, stated boundary on coupons**: a coupon's minimum-subtotal
and usage rules were validated against the whole cart's subtotal. Once
split, which destination should honestly keep the discount is genuinely
ambiguous — not just an inconvenient edge case — so
`OrdersService.checkout` blocks the combination outright with a clear,
actionable error, and the split-checkout page itself checks for an
active coupon before rendering the form at all, so a customer doesn't
fill in two whole address forms only to hit that error at the very end.

**A deliberate, stated boundary on payment method**: split checkout is
trade-credit only. A PayFast checkout redirects the browser away
entirely, so multiple PayFast destinations genuinely can't be submitted
sequentially within one page session the way trade credit (which
confirms immediately server-side) can. PayFast-based splitting would
need a different, multi-step flow — creating every order upfront, then
guiding the customer through separate sequential payments — real,
separate follow-up work. This also happens to fit the original gap's
own example well: a trade customer ordering for several job sites is
exactly who'd have trade credit available.

**A deliberate, stated boundary on the number of destinations**: exactly
two fixed groups, not an arbitrary N-way split. Covers the core "a
couple of job sites" case without the added complexity of a fully
dynamic assignment UI.

**Sequential, not parallel, checkout calls** — `submitSplitCheckoutAction`
checks out each destination group one at a time. If a later group fails
(e.g. insufficient remaining trade credit after an earlier group's own
order already drew against it), the earlier groups' orders still exist
and are real; the result reports how many succeeded before the failure,
rather than leaving the customer unsure what actually happened.

## Broader web test coverage — a real bug caught mid-test, not just more files

**Deliberately picked for diversity of what's being protected, not just
volume.** Four new test files, chosen to cover genuinely different kinds
of logic rather than repeating the same shape four times: a pure
utility function (`lib/courier.test.ts` — the tracking-URL fallback
logic, including that an unverified courier correctly returns `null`
rather than guessing a deep-link pattern), a component built around one
specific, stated architectural decision
(`WishlistButton.test.tsx` — proving the no-optimistic-update behavior
directly: the heart does NOT flip until the server actually confirms
success), a dynamic multi-row form
(`RequestReturnForm.test.tsx` — correct `items[i].fieldName` FormData
encoding across multiple rows, mirroring the pattern
`QuoteRequestForm.test.tsx` already established), and one that surfaced
a genuine bug while being written.

**A real bug caught and fixed while writing `CouponForm.test.tsx`, not
invented for the sake of a good story**: the applied-coupon view (shown
once a coupon is active, with the Remove button) had no rendering of the
component's own local `error` state at all — only the `couponError`
*prop* (a validation issue) was shown there. A failed removal correctly
set the error in state, but nothing on screen ever displayed it; the
customer would click Remove, watch nothing happen, and have no idea
why. Fixed by adding the missing `{error && ...}` render in that branch,
and the test that caught it says so directly in its own description
rather than presenting the fix as if it had been the plan all along.

**A real test-infrastructure improvement, not just another spec file**:
`crypto.randomUUID()` is used by several dynamic-row components
(`RequestReturnForm`, `GuestCheckoutForm`) for row keys, but the
previously-tested `QuoteRequestForm` never exercised it, so its
availability in this specific jsdom/Jest version combination was
genuinely unverified. Rather than risk a flaky failure in whatever real
CI environment eventually runs these, added a small, defensive
polyfill to `jest.setup.js` — guarded to only activate if
`crypto.randomUUID` is genuinely absent, so it changes nothing in an
environment where it's already provided natively.

**Stated honestly, not left implicit**: this is a meaningful expansion
(2 → 6 test files) covering a deliberately diverse sample of logic, not
exhaustive coverage of this frontend's dozens of components. Still
genuinely unexecuted in this sandbox — same confirmed (not assumed) `npm
install`/`pip install` network limitation as everywhere else in this
build; reviewed carefully by hand instead.

## Finer-grained admin roles — one real gap, one already solved, one genuinely open

**Checked what was actually true before building anything, and found the
stated gap was really three different things, not one.** The original
ask named two examples: a "read-only support" role, and a "finance-only"
role that sees trade-credit but not the catalog.

- **The finance-only example was already true before this pass** —
  `TradeCreditController`'s admin endpoints have only ever required
  `trade-credit:manage`, never also `products:write`. A Keycloak role
  granted `trade-credit:manage` alone already can't touch the product
  catalog today; this needed no code change at all, and it would have
  been dishonest to claim credit for building something that was already
  correct.
- **The read-only support role was the real, missing piece** — every
  admin capability was gated by a single write scope that governed both
  viewing and changing, with no way to grant just the viewing half.
- **"View customers" (the ask's other named example) doesn't exist as an
  admin capability at all yet** — there is no admin-wide "list all
  accounts" endpoint anywhere in this codebase to retrofit finer scoping
  onto. Building that endpoint would be real, separate work, not
  something this pass could narrow scope on top of.

**The mechanism**: `@Scopes(...)` already existed with AND semantics
(`requiredScopes.every(...)`) — right for "this write action needs
`orders:manage`," but unable to express "either a dedicated read scope
or the existing write scope should pass," which read-only access
genuinely needs (a write-capable admin should never be locked out of
viewing). Added a new, purely additive `@AnyScope(...)` decorator (OR
semantics) checked independently in `KeycloakAuthGuard` — every existing
`@Scopes(...)` usage is completely unaffected; this is a second,
separate check, not a variant of the same one. `KeycloakAuthGuard` had
no test file at all before this, despite being genuinely
security-critical — added one covering both the existing AND semantics
and the new OR semantics directly.

**Applied to a stated, deliberately partial set of admin areas** —
`orders:read` (Orders' and Returns' admin list/detail endpoints — the
two areas the original gap explicitly named or closely relates to) and
`bookings:read`. Not retrofitted onto warranty/compliance, since neither
has an admin-wide view endpoint to apply it to in the first place (both
only have an issue action and a customer-self-service view, already
unscoped). Not retrofitted onto every remaining admin area exhaustively
— a real, stated scope boundary establishing the pattern, not a claim of
universal coverage.

**Two honest, real limitations stated plainly, not glossed over**:
- Actually **granting** a "read-only support" role to a real person
  requires a real Keycloak configuration change on Besbpo's own identity
  provider (a new role, mapped to the `orders:read`/`bookings:read` scope
  claims) — outside this codebase's control, the same situation as any
  other external credential/config this build can't fabricate on someone
  else's behalf.
- The **frontend** doesn't yet hide or disable write controls (buttons,
  forms) for a read-only caller — they'd see the same admin UI as a
  write-capable admin and get a real 403 from the API if they tried to
  submit a write action. The actual security boundary is correctly
  enforced at the API layer regardless of what the frontend shows; this
  is a UI-polish gap, not a security one, and is named here rather than
  quietly left for someone to discover later.

## Notification template editing — a real architectural discovery, found by checking not assuming

**The notification pipeline runs in a genuinely separate OS process,
not just a separate module** — `worker.ts` bootstraps its own minimal
`WorkerModule` (`NestFactory.createApplicationContext`, just
`ConfigModule` + `NotificationsWorkerModule`), completely distinct from
the API's `AppModule`. This mattered directly: `PrismaModule` is marked
`@Global()`, but that only makes its exports available *within whichever
application tree actually imports it* — since the worker is a separate
DI container from the API, `PrismaService` wasn't automatically
available there just because it's global somewhere else.
`NotificationTemplatesModule` explicitly imports `PrismaModule` itself,
so importing that module into `NotificationsWorkerModule` is what
actually threads database access into the worker's process — not an
assumption that a global module's reach crosses process boundaries,
because it doesn't.

**Deliberately minimal-disruption to the existing, working rendering
logic.** `notification.templates.ts`'s hardcoded `renderNotification`
switch is completely unchanged. Its conditional logic (e.g. whether a
tracking number was supplied) was extracted into a new pure
`buildTemplateContext` function — used only when a custom template
exists, so that logic lives in exactly one place rather than risking two
independently-drifting copies of the same conditions.
`NotificationTemplatesService.render()` checks the database for a custom
override first; absent one (the default, expected state for any type
nobody's touched), it falls straight through to the original
`renderNotification`, unchanged. Only one caller of that function existed
anywhere in the codebase before this — checked directly, not assumed —
which kept the blast radius of this change genuinely small.

**A deliberate, stated failure-mode choice**: `substitutePlaceholders`
leaves an unrecognized `{{placeholder}}` visible in the rendered output
rather than silently stripping it to nothing. An admin seeing their own
typo in a saved template is far more useful than a customer receiving an
email with a word mysteriously missing and no way for anyone to notice
why.

**Upsert by type, not separate create/update actions** — customizing a
type for the first time and editing an already-customized one are the
exact same action from an admin's own perspective ("save these
subject/body values"), so there's no reason to expose them as two
different API calls. Both `subjectTemplate` and `bodyTemplate` are
required together on every save — there's no partial customization of
just one field, which the admin UI's own copy states directly rather
than implying a fallback that doesn't actually exist in the data model.

## Returns/RMA — genuinely distinct from cancellation, its own state machine

**Checked `PaymentsService.cancelOrder` first, and confirmed a real,
different workflow was needed, not a variant of it.** Cancellation
assumes an order hasn't shipped yet; a return is explicitly for a
`DELIVERED` order, where inspection and partial resolution (refund some
items, replace others) are real possibilities cancellation never has to
handle. `ReturnRequest.status` is deliberately its own independent state
machine (`REQUESTED → APPROVED → RECEIVED → REFUNDED/REPLACED`, with
`REJECTED` reachable from either `REQUESTED` or `RECEIVED`) — not folded
into `Order.status`, which stays `DELIVERED` throughout a return's
entire lifecycle. A return is about what happens to specific *line
items* after delivery, not a change to what happened with the original
purchase.

**Two genuinely different rejection points, both real, not the same
thing**: `REQUESTED → REJECTED` (e.g. outside the return window,
rejected before the customer ships anything back) and
`RECEIVED → REJECTED` (the item arrived and inspection didn't support
the claimed defect). Both paths are built and tested separately.

**Refund processing reuses the existing PayFast integration rather than
reimplementing it.** `PaymentsService.refundPayment` was private,
called only internally by `cancelOrder`. Added a new public
`refundForReturn(orderId, amountRands, reason)` that calls straight into
the same underlying call — there is only one place in this codebase
that actually talks to PayFast's Refunds API, regardless of which
workflow triggered the refund. This meant exporting `PaymentsService`
from `PaymentsModule` for the first time (it wasn't exported before).
The resulting dependency chain — `ReturnsModule → PaymentsModule →
OrdersModule` — is genuinely one-directional; `PaymentsModule` has no
knowledge of `ReturnsModule` at all, so there's no circularity risk,
confirmed by checking rather than assumed.

**Return-eligible quantity is checked against prior requests on the same
line, not just the line's original quantity** — a customer can't
request 3 units back, have it approved, then request the same 3 units
again on a second request. The check sums quantities across every
*non-rejected* return request against that line item, not just any
prior request (a rejected one shouldn't count against what's still
available).

**A deliberate, stated scope boundary**: resolving a return as a
replacement marks the request resolved but does not automatically
generate a new replacement order — that's a manual step outside this
system for now, not an oversight.

## Admin tooling for pricing/multiplier data — respecting the schema's own intent

**Traced `PricingService.quote()`'s exact existing query before designing
anything, and found a real, load-bearing detail**: `PriceBookEntry` is
looked up by "whichever row has the most recent `effectiveFrom`" for a
given sector/serviceCode — meaning this was always designed as an
**append-only rate history**, not a single row an admin edits in place.
`PricingAdminService` respects that: there's deliberately no `update()`
for price book entries — "changing" a rate means creating a new entry
(this pass's `createPriceBookEntry`, with `effectiveFrom` always the
schema default, never admin-supplied), preserving what the rate used to
be rather than silently overwriting history the quote engine's own
query logic was clearly built to read from. `remove()` exists only for
correcting a genuine data-entry mistake, not as a way to "end" an old
rate — the engine already ignores older entries the moment a newer one
exists.

**`ComplexityMultiplier`, by contrast, genuinely is a single mutable row
per code** (`@unique` on `code`, no history concept at all) — so it gets
real `update()`, with `code` itself deliberately never editable through
that path, since other requests reference a multiplier by that value.

**Extended the existing `pricing` module rather than fragmenting into
new tiny ones** — quote calculation and pricing-data administration are
different concerns, but closely related and both feed the same engine,
so `PricingAdminService` sits alongside `PricingService` in one module
rather than creating a second near-empty one for a handful of admin
routes.

## Tiered/volume pricing — a percentage on top, not a second price list

**Deliberately percentage-based, not absolute prices per tier.** A
`PriceTier` is `{productId, minQuantity, discountPercent}` — a discount
applied on top of whichever base price (retail or trade) the customer
already qualifies for, not a full separate price defined at every
quantity threshold for both customer types. Doubling admin data entry at
every tier for retail AND trade separately didn't seem worth it against
the simplicity of "X% off, on top of whatever you'd already pay."

**The resolution logic is a standalone pure function**
(`common/utils/price-tier.util.ts`'s `resolveBestTier`), not a service
method — it has no dependencies at all, so making it a static method on
`PriceTiersService` (an early draft) would have been a confusing,
unnecessary pattern. Same shape as `round2`/`VAT_RATE` in
`money.util.ts`. It resolves the **highest**-qualifying tier, not the
first match in whatever order tiers happen to be supplied — a real thing
worth testing directly (see its own spec file), not just trusting the
`reduce` was written correctly.

**Wired into `CartService.price()` — the same "one place cart totals
compute" principle coupons already relied on** — nothing needed to
change in `OrdersService.checkout()` at all. Checkout has never computed
unit prices itself; it always uses whatever `CartService.getCart()`
already returned, so tiered pricing (like the coupon discount before it)
flows into order snapshots automatically, for free, purely because that
architectural boundary was kept consistent.

**A real bug caught and fixed before it could break anything**: the
existing `productFixture` used throughout `cart.service.spec.ts` had no
`priceTiers` field at all, and the new code called `.map()` directly on
it — which would have thrown on every single existing cart test. Fixed
two ways: the production code is now defensive (`?? []`, since a
mock/query mismatch shouldn't be able to crash pricing), and the fixture
was updated to accurately reflect what a real Prisma query with this
`include` actually returns, rather than leaving a stale fixture that
happened to still pass by accident.

**`PricedCartLine` gained `baseUnitPrice` and `appliedTierDiscount`**
(shared type, both sides), so the frontend can show a real "was RX, now
RY" comparison on a cart line without doing its own reverse-percentage
math — `unitPrice` remains the actually-charged, already-discounted
price; `baseUnitPrice` is what it would be without any tier.

## Product Q&A — deliberately not review-shaped

**Checked `ReviewsService`'s existing verified-purchase requirement
before designing anything, and deliberately did NOT copy it.** A
question is typically asked *before* buying, precisely because the
customer is unsure — requiring a completed order to ask would be
backwards. `QuestionsService.ask` has no such check; `ProductQuestion`'s
own schema comment states this explicitly, since it would otherwise look
like an oversight rather than a considered difference from reviews.

**Answerable by any authenticated account, not staff-only** — closer to
a community Q&A model (anyone who already owns the product often knows
the real-world answer as well as anyone) than a support-ticket one.
`isFromStaff` is derived from the answering caller's own JWT `scopes` at
creation time in `QuestionsService.answer`, never a client-supplied
field a customer could set to falsely claim authority. Checks for *any*
non-empty scopes array, not one specific scope like `products:write` —
a plain customer JWT carries no scopes at all in this system, so this is
a broader, more robust "is this a staff/admin login" signal than testing
for one particular scope that not every staff role is guaranteed to
carry.

**Routing follows `ReviewsController`'s own established convention** — a
separate, top-level `QuestionsController` at `/v1/questions` with
`productId` as a query param for listing, not nested under
`/products/:id/questions`, for consistency with how reviews are already
organized rather than introducing a second pattern for the same shape of
problem.

## PDF tax invoices — honest about what actually qualifies as one

**A real legal-honesty decision, not just a data-formatting one**: a
document without a real VAT registration number isn't a "Tax Invoice"
under South African VAT law — that's a legal term with real
requirements, not just a label. `InvoiceService.generate` checks whether
`INVOICE_VAT_NUMBER` is actually configured and titles the document "TAX
INVOICE" only when it is; otherwise it's honestly labeled "INVOICE," with
the VAT registration line explicitly showing "not configured" rather
than being silently blank or, worse, fabricated. `INVOICE_COMPANY_NAME`
defaults to Bellwether's real, stated legal entity name — not a
placeholder; `INVOICE_COMPANY_ADDRESS`/`INVOICE_VAT_NUMBER` are left
genuinely unconfigured, the same "real credentials or graceful
degradation, never fabrication" pattern already used for PayFast,
ShipLogic, and BulkSMS elsewhere in this codebase.

**`pdfkit`, not Puppeteer or a hosted PDF service** — pure-JS, no
external binary/browser dependency to install or keep patched on the
server, the right fit for a document this simple (one or two pages,
straightforward layout) rather than something that needs full HTML/CSS
rendering fidelity.

**Two endpoints, one shared generator, deliberately asymmetric
authorization**: `GET /v1/orders/:id/invoice` (customer, the exact same
ownership check as `findOneForAccount`) and
`GET /v1/orders/admin/:id/invoice` (admin, `orders:manage` scope, **no**
ownership check at all — an admin can pull any customer's invoice by
design). Both call the same `OrdersService.fetchOrderForInvoice` +
`InvoiceService.generate`, so there's no risk of the two documents ever
looking different for the same order.

**Binary response via `@Res()`**, same reasoning as the 204/health-check
cases already documented elsewhere — the global
`TransformResponseInterceptor` wraps every return value in a JSON
`{data, meta}` envelope, which would corrupt a PDF byte stream the same
way it violates a 204's own no-body requirement.

**The frontend needed its own real design decision**: a plain `<a href>`
straight to `apps/api`'s endpoint can't work — the endpoint requires a
Bearer token, and browsers don't attach custom `Authorization` headers to
a simple navigation. Both order detail pages instead link to a Next.js
Route Handler (`app/api/orders/[id]/invoice/route.ts` and
`app/api/admin/orders/[id]/invoice/route.ts`) that proxies the request
server-side with the session's own token, then streams the PDF back —
the browser's native download/PDF-viewer handling takes over from there,
no client-side JS needed. **Neither route is covered by
`middleware.ts`'s matcher** (`/api/orders/...` and `/api/admin/...` are
different URL prefixes from `/account/...`/`/admin/...` that matcher
actually covers) — both do their own session check accordingly. The
admin route specifically checks for `orders:manage`, not just "any admin
scope," matching exactly what the underlying API endpoint requires —
real defense-in-depth given `getInvoicePdfAdmin` has no ownership check
of its own to fall back on, though the API's own guard is still the real
security boundary either way, same principle as `middleware.ts`'s own
comment on `/admin` page access.

**Tested without parsing rendered PDF text** — `invoice.service.spec.ts`
verifies a real, well-formed PDF buffer comes out (checks for the
standard `%PDF-` magic bytes) across every real configuration state
(VAT number set/unset, coupon/delivery-fee/PO-number present/absent),
rather than asserting on the exact "TAX INVOICE" vs "INVOICE" wording
inside the rendered document — extracting that back out would need an
extra dependency just for this one assertion. The logic deciding which
title to use is a single, simple `Boolean(vatNumber)` ternary passed
directly to `pdfkit`'s own well-established `.text()` API, reviewed
carefully by hand instead.

## Wishlist — deliberately its own small model, not a repurposed cart

`WishlistItem` is genuinely separate from `Cart`/`CartItem`, not folded
into the cart with some "saved for later" flag — a wishlist ("I might
want this later") and a cart ("I'm buying this now") are different
concepts, and conflating them was explicitly the problem with not having
a real wishlist at all (adding something to the cart just to remember
it, then it sitting there indefinitely, distorting cart-abandonment
signals and everything else that reads `Cart.updatedAt`). No quantity
field on `WishlistItem` either — wanting something twice as much isn't a
concept a wishlist needs.

**Both `add` and `remove` are deliberately idempotent** — adding an
already-wishlisted product upserts rather than throwing a conflict
error, and removing something not on the wishlist is a no-op success,
not a 404. A wishlist button is a toggle in the UI; the API underneath
it behaves like one too, rather than making the frontend track state
carefully to avoid hitting an error path for a perfectly normal
double-click or already-synced state.

**`WishlistButton`'s own real design choice**: no optimistic UI update.
It waits for the actual server response before flipping its displayed
state, rather than flipping immediately and hoping the request succeeds
— an optimistic flip that then fails (not signed in, network error)
would show the wrong state until the next full page load. `ProductCard`
is reused directly on `/account/wishlist` rather than a second,
parallel rendering — the wishlist item's nested `product` field matches
the shared `Product` type's shape exactly (same `category`/`images`
include shape used elsewhere), so no adaptation was needed.

**Deliberately not built this pass**: wishlist buttons on product cards
in listing pages (category/search/home) — only on the PDP and the
wishlist page itself. Showing wishlist status across an entire grid of
products would mean fetching the full wishlist on every listing page
load (or a more involved per-card client-side check), which wasn't
judged worth the added complexity for this pass. A real, contained
follow-up if wanted, not an oversight.

## Coupons & discounts

**Checked before designing anything**: `CartService.price()`'s existing
VAT computation, since getting the order of operations wrong would
produce genuinely incorrect totals. `subtotal` is VAT-exclusive with VAT
calculated on top of it — so a discount has to reduce the *taxable*
value before VAT is calculated, not after. `price()` now computes
`discountedSubtotal = subtotal - discountAmount`, then VAT on THAT, not
on the original subtotal.

**`CouponsService.validateAndCompute` is the single place every rule
about coupon validity lives** — called from `CartService.price()` (every
time a cart is priced, not just once), `CartService.applyCoupon`, and
`OrdersService.checkout` (indirectly, since checkout prices the cart via
`CartService.getCart` before creating the order). One function, one set
of rules, no second drifting copy anywhere.

**Re-validated fresh on every `price()` call, not just at apply-time** —
a cart can change after a coupon is applied (an item removed drops the
subtotal below the minimum, or enough time passes that it expires). If
the coupon no longer validates, `discountAmount` becomes 0 and
`couponError` carries the specific reason (`CouponsService`'s own
exception message) — the code stays visible on the cart, the customer
sees *why* it stopped working rather than the discount just silently
disappearing.

**`CouponRedemption` is the actual source of truth for usage limits**,
not a counter field on `Coupon` — one row per real redemption, so it can
never drift from what actually happened the way an incrementable counter
could if something failed partway through. `Order.discountAmount` and
`CouponRedemption.discountAmount` are both snapshots in Rand, same
reasoning as `Order.subtotal`/`vatAmount` already had — a coupon's own
`discountValue` changing later, or the coupon being deactivated, must
never retroactively change what a past order was actually discounted by.

**The redemption row is created atomically with the order**, inside the
same `$transaction` in `OrdersService.checkout` — a `CouponRedemption`
can never exist without the order it belongs to, or vice versa. Only
created when `discountAmount > 0`, which correctly covers both "no
coupon was applied" and "a coupon code was present but had stopped
validating by checkout time" without needing to check `couponCode`
separately.

**A deliberate, stated scope decision**: `Cart.couponCode` is NOT
explicitly cleared after a successful checkout, for either payment
method. A limited-use coupon self-corrects on its own — the next
`price()` call re-validates via `CouponsService`, finds the fresh
`CouponRedemption` row just created, and surfaces `couponError` once
`maxUsesPerAccount` is hit. An unlimited coupon staying applied to a
brand-new cart is treated as acceptable standing-promo behavior, not a
bug worth the extra complexity of also clearing it in
`PaymentsService.handleItn` for the PayFast path (where cart-clearing
already happens separately, on payment confirmation — see that section).

**A genuine, real test of `packages/shared-types`**: the coupon fields
(`couponCode`, `discountAmount`, `couponError`) were added to the shared
`PricedCart` type in one place, and both `apps/api` (via its
`cart.interface.ts` re-export) and `apps/web` (via `lib/types.ts`)
picked up the change automatically — exactly the cross-cutting-type-
change scenario that package exists for.

## Guest checkout — a real purchase path, not a full anonymous cart

**The scope decision, made explicitly before writing any code**: this
codebase's entire cart system is built around `Cart.accountId` — every
"add to cart" action requires a real Keycloak session. Rebuilding that
for fully anonymous browsing (a parallel, client-side cart architecture)
would be a much bigger undertaking than this pass attempted. What got
built instead is the genuinely valuable core: **completing a purchase
without ever going through Keycloak signup** — a dedicated
`/checkout/guest` page where a visitor picks products directly (dynamic
rows, not a persistent cart) and pays.

**`Account.isGuest`** is an explicit flag, not an implicit
`keycloakSub` string-pattern convention to remember elsewhere.
**`AccountsService.resolveOrCreateGuest`** resolves purely by email — a
guest has no `keycloakSub` to look up by — and deliberately reuses
whatever account already owns that email, whether a previous guest
checkout or a real logged-in-before account. New guest accounts get a
synthetic `guest:<uuid>` value for `keycloakSub`, satisfying its
existing NOT NULL + UNIQUE constraint without a nullable-column schema
change that would have touched everywhere else in this codebase that
assumes every account has a real one.

**A real module-dependency correction made mid-build, not planned from
the start**: guest checkout was originally a standalone public endpoint
on `OrdersController` (`OrdersService.guestCheckout` creating the order
only). That turned out to be a genuine correctness trap — calling it in
isolation leaves a guest with an order and no way to ever pay for it (no
PayFast fields returned, and no way to retroactively call the guarded
`payfast/checkout` endpoint without a real JWT). The fix: order+payment
orchestration now lives in `PaymentsService.guestCheckoutWithPayment`
instead — calling `OrdersService.guestCheckout` as one internal step,
then `initiateCheckout` for the same guest identity, returning both in
one response. This lives in `PaymentsService`, not `OrdersService`, for
the exact same circular-module-dependency reason `cancelOrder` already
does (`PaymentsModule` imports `OrdersModule`, not the reverse) — see
that method's own comment. `OrdersService.guestCheckout` itself is no
longer exposed as its own HTTP endpoint; it's purely an internal
building block now.

**A real, cascading middleware bug caught before delivery, not after**:
`middleware.ts` used `path.startsWith('/checkout')` to require a
session — which would have swept `/checkout/guest` into that bucket too,
making the entire feature unreachable. Worse, PayFast's own
return_url/cancel_url land a guest back on `/checkout/success` and
`/checkout/cancelled`, both *also* caught by that same blanket rule — so
even a guest who successfully paid would have been bounced to sign-in
right after being charged. Fixed by allowlisting those three exact paths
as public while keeping the real authenticated `/checkout` page
protected. Both success/cancelled pages were then updated to detect the
guest case and show honest, appropriate messaging — `/checkout/success`
points a guest to their email confirmation instead of trying (and
failing) to fetch order details via an authenticated call;
`/checkout/cancelled` sends a guest back to `/checkout/guest` instead of
`/cart`, which they could never reach anyway.

**Deliberately not solved this pass, stated plainly**: a guest whose
PayFast payment is cancelled has to re-enter their items from scratch —
their temporary guest-account cart technically still has them, but
there's no page for a guest to view a cart on. A real, accepted rough
edge on a secondary path (payment cancellation), not the main flow.
Also not attempted: any "claim your past guest orders" flow if a guest
later creates a real account with the same email — `resolveOrCreateGuest`
means their orders would already be sitting on the same `Account` row a
real signup with that email resolves to, so this may need less new work
than it sounds like, but it wasn't verified or built here.

## packages/shared-types — real, but deliberately partial

`packages/shared-types` now exists (root `package.json` already had
`"packages/*"` in its workspaces array from the very start, anticipating
this — it just sat empty until now). A types-only workspace package, no
build step: `package.json`'s `main`/`types` point straight at
`src/index.ts`, and both `apps/web` (Next's own SWC-based build) and
`apps/api` (tsc) consume the TypeScript source directly through the
npm-workspaces symlink — no separate compile step for this package
itself.

**What's genuinely shared now**: `Product`, `ProductImage`, `Category`,
and the generic `Paginated<T>` wrapper — `apps/web/lib/types.ts` used to
hand-duplicate these with a comment literally saying "these mirror
apps/api/prisma/schema.prisma by hand for now... this file is a stopgap,
not the target state." It no longer duplicates them; it re-exports from
the shared package instead (existing `from '@/lib/types'` imports
elsewhere in the app keep working unchanged — this was a types-only
refactor, not a rename sweep across every consuming file).
`PricedCart`/`PricedCartLine` are the one case with genuine **bidirectional**
sharing: `apps/api`'s `cart.interface.ts` now re-exports these from the
shared package too, rather than defining its own copy, since
`CartService` already hand-constructs this shape from plain primitives
rather than returning a raw Prisma result — meaning what it actually
returns really is identical to the shared wire type, not just similar to
it.

**Deliberately NOT shared, for a real reason, not an oversight**: most of
`apps/api`'s own response types (e.g. `ProductsService`'s
`PaginatedProducts['items']`) are Prisma-derived — before JSON
serialization, `Decimal` fields like `retailPrice`/`weightKg` are real
`Decimal` objects, not the strings `Product` (the shared type) declares
them as. NestJS's serialization converts `Decimal` → string automatically
on the way out over HTTP, but the API's own internal type, before that
conversion happens, is genuinely a different shape from the wire type —
forcing `PaginatedProducts` to literally use the shared `Product` type
would be inaccurate, not a real fix. The shared `Product` type represents
what a consumer *receives*, which is exactly what `apps/web` needs it
for; it was never meant to describe the API's own pre-serialization
internals.

**The convention going forward**, for whoever adds the next shared
type: only move a type here once it's clear the SAME definition can be
used honestly on both sides — either because (like `PricedCart`) a
service already hand-constructs the exact wire shape from primitives, or
because (like `Product`) one side is happy to describe the shape it
*receives* rather than needing it to double as internal, pre-serialization
typing on the other. Don't force a shared type onto a Prisma-derived
response shape just for the sake of sharing more.

## Estimate classification — real LLM depth, one of three AI capabilities

`estimate_service.classify` now tries a real Anthropic Messages API call
first (`app/services/llm_client.py`) before falling back to the original
rule-based keyword matching — this was an explicit, pre-existing "upgrade
path" comment in the code before it was ever built, not a new idea
introduced here.

**Structured, not free-text-then-parsed**: the request uses tool-forced
output (`tool_choice: {type: "tool", name: "classify_plumbing_request"}`)
with enum-constrained `sector`/`service_code`/`multiplier_codes` fields —
the model literally cannot return a sector or service code that doesn't
exist in this deployment's price book, because the enum lists are derived
directly from `_CLASSIFICATION_RULES`, the same single source of truth
the rule-based fallback uses. No separate, driftable list of "valid
values" exists anywhere.

**Same graceful-degradation shape as every other optional integration in
this codebase**: `llm_client.classify_with_tool` returns `None` — never
raises — on missing config, a network failure, a non-2xx response, or a
response shape that doesn't match what was asked for. `classify()` always
falls through to the rule-based logic in every one of those cases; a
customer's estimate request never fails outright because the LLM call
didn't work. Model choice is deliberate too: Haiku, not a larger model —
this is a single-shot structured classification task with a small,
enum-constrained output space, not something needing deep reasoning, so
the cheapest model that can reliably do structured tool-calling is the
right call, not a cost-cutting compromise.

**A second capability given real depth in a later pass**:
`recommendation_service.recommend` now tries real order-purchase
co-occurrence FIRST — the strongest signal, since it reflects actual
customer behavior rather than a curator's judgment — before falling back
to bundle co-occurrence, then same-category, exactly the priority order
its own prior comment already anticipated ("Once real order volume
exists, add a second query here scoring by order-level co-occurrence and
blend it in — the service's public interface doesn't need to change for
that." It didn't; the router calling it needed zero changes).

Two real decisions worth knowing about the order-co-occurrence query
specifically: it excludes `CANCELLED`/`REFUNDED` orders (a purchase that
didn't actually stick isn't genuine "bought together" behavior, just
noise), and it requires a minimum of 2 co-purchases
(`HAVING COUNT(*) >= 2`) before a product counts as a real signal at
all — a single coincidental co-purchase in one order shouldn't outrank
curated bundle composition. 2 is deliberately a low bar for a platform
that may still have thin order volume, not a claim that 2 is
"enough" evidence in general.

**Still left as it was, one capability deliberately not touched**:
`search_service.py`'s query expansion — still a hardcoded synonym
dictionary, deliberately not LLM-routed, since `SearchService`'s own
3-second timeout reflects "search should feel instant," which an LLM
round-trip would work against.

See `docs/GAP-ANALYSIS-III-FEATURE-EXPANSION.md`'s AI-service section for
what real depth in search specifically would actually involve.

**Tested using only the standard library's `unittest.mock`** — no new
test dependency was added just to mock an async httpx client (see
`test_llm_client.py`'s `_mock_client` helper for the async-context-manager
shape, which is the one genuinely fiddly part). Confirmed directly, not
assumed: this sandbox has no network access to actually run `pytest` here
either (`pip install pytest` fails the same way `npm install` fails
elsewhere in this build) — reviewed carefully by hand instead, same
honesty this whole codebase already applies to its e2e suite and web
tests.

## Search — the AI service's missing entry point

`modules/search/` (`GET /v1/search`) is what actually calls
apps/ai-service's `/search-rank` — before this existed, that AI service
endpoint had no real caller anywhere despite being built and tested.
Falls back to `ProductsService.findAll`'s plain Postgres FTS if the AI
service is unreachable, slow (3s timeout), or `AI_SERVICE_URL` isn't
configured. If you're adding a new AI-service-backed feature (the
estimate/quote assistant is the obvious next one — `apps/ai-service/app/routers/estimate.py`
exists but is in the same unreachable state `/search-rank` was), follow
this same shape: a thin API-side proxy with a graceful non-AI fallback,
not a hard dependency on the AI service being up.

**Filters (price range, in-stock, sort, brand)** are threaded through
*every* layer of this, not just the fallback — worth knowing since it's
easy to miss one: `QuerySearchDto` (apps/api) → `SearchService.search`
forwards them to both `ProductsService.findAll` (the fallback path) and
the AI-service request body (snake_case, matching apps/ai-service's
Pydantic schema — kept in sync manually, there's no shared-types package
across the language boundary) → `search_rank.py`'s router → `search_service.search_products`,
which itself does no filtering at all; it just forwards everything to
apps/api's own `GET /v1/products` (the same `ProductsService.findAll`),
which is where the actual filtering happens either way. One genuinely
subtle cross-language bug caught while wiring this: Python's `str(True)`
serializes as `'True'` (capital T), which would silently fail apps/api's
`value === 'true'` boolean check — fixed with an explicit `.lower()` on
the Python side, and tested directly via a pure, extracted
`_build_search_params` function specifically so it didn't need a new
HTTP-mocking test dependency just to verify.

- **`PaymentsService.cancelOrder` lives in Payments, not Orders** — a
  deliberate choice to avoid a circular module dependency. Payments
  already depends on Orders (for status updates in `handleItn`); if
  cancellation lived in `OrdersService` instead, it would need to call
  Payments for the refund, and `OrdersModule` importing `PaymentsModule`
  while `PaymentsModule` imports `OrdersModule` is a cycle NestJS supports
  awkwardly (`forwardRef()`) rather than cleanly. Payments already has
  everything cancellation needs (Prisma directly, `OrdersService`,
  `AccountsService`), so the orchestration sits there. If you're adding
  another feature that seems to belong to one module but needs another
  module that already depends back on it, check for this same shape
  before reaching for `forwardRef()`.
- **Refunds use a genuinely different PayFast API** from checkout/ITN —
  `api.payfast.co.za`, signed custom headers instead of form fields, and
  **alphabetical** field order for its signature (`generateApiSignature`
  in `payfast-signature.util.ts`), not the declared order checkout uses.
  Don't reuse `CHECKOUT_SIGNATURE_FIELD_ORDER` for anything refund-related.
- **The refund amount's unit (cents vs. Rands) is unverified** — flagged
  explicitly in a comment on `refundPayment`, not silently assumed. Test
  against a real PayFast sandbox before relying on it.

## Account section (apps/web/app/(showroom)/account)

All account sub-pages (orders, addresses, bookings, warranty, compliance)
live inside the `(showroom)` route group at `app/(showroom)/account/*`,
**not** a top-level `app/account/*` folder — route groups are transparent
to the URL (the parens don't appear in the path), so both would resolve
to the same `/account/*` URLs if they coexisted. This actually happened
once during this build and was caught before shipping; if you're adding a
new account sub-page, put it under `(showroom)/account/`, not a new
top-level folder, and if you're ever unsure whether two directories
resolve to the same route, strip the route-group parens from every
`page.tsx` path and diff for duplicates — that's the check that caught it.

Two conventions from Phase 4 worth carrying forward if you're adding more
admin-scoped listing/lookup endpoints:

- **Admin routes need a customer-ownership bypass, not just a different
  scope.** `findOneForAccount`-style methods check the order/booking
  belongs to the *calling* account — reusing one for an admin endpoint
  will 403 on everything that isn't the admin's own personal data. Add a
  separate `findXAdmin` method with no ownership check, the way
  `OrdersService.findOneAdmin` and `BookingsService.findAllAdmin` do.
- **Declare `admin` (or `admin/:id`) routes before the plain `:id` route**
  in the controller — Nest/Express tries routes in declaration order, and
  a literal segment like `admin` would otherwise be swallowed as an
  (invalid) `:id` value if the parameterized route came first.

`apps/web/lib/admin-scopes.ts` is the single source of truth for which
scopes count as "any admin access" — used by both `middleware.ts` and
`Header.tsx`. It used to be duplicated in both files and drifted out of
sync once; add new admin scopes there, not in either file directly.

## Audit logging — which actions, and how to add more

`modules/audit-log/`'s `AuditLogService.record()` is wired into six
actions: order status changes, customer-initiated cancellations/refunds,
trade-credit account creation/drawdown/repayment, warranty issuance, and
CoC issuance — the money- and compliance-critical ones. Product/category/
bundle CRUD and booking status changes are **not** audited yet; that's an
explicit scope boundary from Phase 4, not an oversight (see
`docs/GAP-ANALYSIS-ROADMAP.md`).

If you're adding logging to another action, the shape is consistent
across all six existing call sites: thread the acting admin's email
through from the controller (`@CurrentAccount() current` → pass
`current.email` into the service method as an extra parameter — this
touches the controller, the service signature, and that service's
`.module.ts` to import `AuditLogModule`), then call `auditLogService.record()`
after the action succeeds, not before. For a webhook-triggered path with
no human actor (like PayFast's ITN calling `OrdersService.updateStatus`),
default the actor parameter to a `system:*`-prefixed string rather than
leaving it blank or attributing it to whichever admin happens to be
logged in — see `updateStatus`'s `'system:payfast-itn'` default.

## Returning a genuinely empty response (204)

Almost every endpoint in this codebase returns a real JSON body via the
global `TransformResponseInterceptor`, even for deletes — `@HttpCode(204)`
alone does **not** stop that interceptor from attaching a `{data, meta}`
body anyway, which is a real HTTP spec violation (RFC 7231: a 204 response
must not have a body), not just an inconsistency. If an endpoint genuinely
has nothing to return (`AccountsController.eraseData` is the first one),
use `@Res() res: Response` directly and call `res.status(204).send()`
yourself, bypassing the interceptor — the same pattern `HealthController`
already uses for a different reason (needing the raw, un-enveloped body
infra tooling expects).

The frontend's `lib/api-client.ts` handles this on the other end: its
shared `request()` checks for `res.status === 204` before calling
`res.json()`, rather than assuming every successful response has a
parseable body. This was a real bug, not a preemptive guard — found while
wiring up the account-erasure page, since every endpoint before it
happened to return real JSON.

## E2E tests (apps/api/test)

`npm run test:e2e` boots the **real** `AppModule` via
`test/utils/create-test-app.ts` — not mocked Prisma the way every unit
test in `src/**/*.spec.ts` is. That means it needs an actual reachable
Postgres database at `DATABASE_URL` (see `test/.env.test.example`), ideally
a disposable one — never point this at staging or production. If you're
adding a new e2e test, mirror `test/app.e2e-spec.ts`'s pattern: use
`createTestApp()`, not a bare `Test.createTestingModule()`, so the global
pipes/filters/interceptors main.ts actually applies are in effect —
otherwise the test is exercising a friendlier app than what's deployed.

## Error tracking (Sentry)

All three services check for a DSN before calling `Sentry.init()` — no
real Sentry project exists yet, so this is currently a no-op everywhere,
same pattern as PayFast/AWS SES before real credentials existed. Two
version-specific details worth knowing if you touch this:

- `apps/web` is on Next.js 14.x, which needs
  `experimental.instrumentationHook: true` in `next.config.js` for
  `instrumentation.ts` to run at all — this became stable/default-on only
  in Next.js 15. If this project ever upgrades past 15, that flag becomes
  a no-op you can remove, not something that needs re-adding.
- The client-side config file is `instrumentation-client.ts`, not
  `sentry.client.config.ts` — the latter is the older convention still
  floating around in a lot of tutorials.

## Quotes — the deferred item, now built

`modules/quotes/` was deliberately deferred from the very first gap
analysis pending a real `Quote` model — it's built now. Two decisions
worth knowing if you touch it:

- **A quote item can be a real catalog product or pure free text**, not
  both required — `productId` is optional on `QuoteItemInputDto`
  specifically so a request can be entirely custom work (e.g. "on-site
  labour, 2 days") with nothing in the catalog at all.
- **Acceptance does NOT auto-flow into Cart/Order.** Neither model has any
  concept of a negotiated, non-catalog unit price — both always derive
  price live from `Product.retailPrice`/`tradePrice`. Wiring "an accepted
  quote becomes an order at its negotiated price" is real, valuable
  follow-up work, not done here — it would need extending `CartItem`
  or `OrderLineItem` to support a price override, not just a new
  endpoint. For now, `respondToQuote` just records the decision; the team
  follows up manually (raise an invoice, or create the order by hand).
- Admin can re-price a quote while `REQUESTED` or `QUOTED`, not once
  `ACCEPTED`/`DECLINED` — re-pricing a decision the customer already made
  on different numbers would be misleading, not helpful.
- No `EXPIRED` status exists — `respondToQuote` checks `validUntil`
  directly against `now()` at response time instead.

**Update**: the "acceptance doesn't flow into an order" limitation above
has a real, narrow escape hatch now — `QuotesService.convertToOrder`
(admin-triggered, `POST /v1/quotes/:id/convert-to-order`). It turns out
`OrderLineItem.unitPrice` was already just a plain snapshot value with no
constraint tying it to `Product.retailPrice`/`tradePrice` — the actual
schema blocker is narrower than first thought: `OrderLineItem.productId`
is a **required** FK, so only a quote where every item references a real
catalog product can convert; one with any pure free-text/custom line
(e.g. "on-site labour") is rejected outright, naming the offending
item(s), not silently dropped. Each `QuoteItem.unitPrice` is treated as
VAT-**inclusive** (the actual price quoted to and accepted by the
customer) and VAT is backed out of that total via `VAT_RATE`, rather than
added on top — so the resulting order's total always matches what was
actually agreed, never a recalculated figure that could drift from it. A
quote can only convert once (`Quote.orderId` is unique); a quote never
collects a shipping address, so the admin supplies one at conversion
time, since they're coordinating with the customer directly anyway.

## Order tracking & courier links

`Order` has `courierName`, `trackingNumber`, and `trackingUrl` — set by
an admin via the fulfillment form on the order detail page, usually
alongside a transition to `DISPATCHED` (`OrdersService.updateStatus`
queues an `order.shipped` notification on a *genuine* transition only,
same discipline as `booking.scheduled`).

`trackingUrl` is deliberately **not auto-generated** from courier name +
tracking number. No confirmed, working deep-link query-parameter pattern
exists for South African couriers' public tracking pages — checked
before assuming one, not skipped. `common/utils/courier.util.ts`'s
`resolveTrackingUrl` instead: uses an admin-supplied direct URL if given
(a courier's own shipment confirmation sometimes includes one already),
falls back to that courier's general tracking *homepage* if it's one of
the small number actually verified (currently: The Courier Guy, RAM),
or returns `null` — callers show the tracking number as plain text in
that case, not a guessed or broken link. `apps/web/lib/courier.ts` is a
small, deliberate duplicate of the same function for the frontend's own
display logic — keep both in sync if the known-courier list changes;
don't let API response shape carry presentation-only resolution instead.

No real courier API integration exists beyond this — no rate quotes, no
label generation, no tracking webhooks. `deliveryFee` is still a
hardcoded flat `150` at checkout, unrelated to weight/distance/zone; see
`docs/GAP-ANALYSIS-III-FEATURE-EXPANSION.md` §6.1 for what a real
integration would need.

### Real rate quotes via ShipLogic

`modules/shipping/` calls ShipLogic's actual rates API for a real,
weight-and-destination-based delivery fee, replacing the flat `150` at
checkout when configured. Before writing any of this, the endpoint URL,
auth mechanism, and request/response field names were verified against a
real, working example (a published third-party integration article
successfully calling this exact endpoint), not guessed at or
pattern-matched from a generic REST shipping API shape — same research
discipline as `courier.util.ts`. ShipLogic is the platform The Courier
Guy's own official plugin integrations (WooCommerce, Shopify) run on,
confirmed via that plugin's changelog referencing "ShipLogic API
changes" directly — a real courier's real API, not a third-party
aggregator picked at random.

- `ShipLogicService` is the pure API client (`getRates`); `ShippingService`
  is the orchestrator — fetches the caller's cart, aggregates it into a
  parcel, calls `ShipLogicService`, and always falls back to the flat
  `150` figure (unconfigured, no rates returned, or the call errors —
  never throws out to the caller). `POST /v1/shipping/quote` exposes
  this; checkout calls it instead of hardcoding a fee.
- Needs `SHIPLOGIC_API_KEY` **and** a complete `WAREHOUSE_*` origin
  address (`ShipLogicService.isConfigured()` checks both) — a rate quote
  is meaningless without a real "from" address, so this deliberately
  won't half-configure itself with a key but no origin.
- Parcel aggregation is a real, stated simplification, not accidental:
  every cart becomes **one** parcel — total weight summed across every
  line, dimensions taken from whichever single item is physically
  largest by volume. This is not real bin-packing and can both overstate
  and understate a multi-item order's true box size; see
  `ShippingService.aggregateParcel`'s comment for specifics.
- `Product.weightKg`/`lengthCm`/`widthCm`/`heightCm` back this — added
  specifically for real rate quotes, since none of this is meaningful
  without genuine parcel data. Existing/new catalog rows default to a
  generic small-parcel placeholder (1kg, 20×15×10cm) until real values
  are entered via the admin product form; the default is explicitly a
  placeholder, not a real measurement of anything.
- Still open: no label generation, no tracking webhooks, no multi-parcel
  splitting. See `docs/GAP-ANALYSIS-III-FEATURE-EXPANSION.md` §6.1 for
  what's left.

## Admin panel (apps/web/app/admin)

Scope-gated at the middleware level (`middleware.ts` checks `session.scopes`,
populated in `auth.ts`'s `jwt` callback by decoding the access token's
`scope_keys` claim — see `lib/decode-jwt.ts` for why decoding without
verifying the signature is fine here specifically: it's a UI-level
courtesy, the API re-verifies independently on every request regardless).

Two conventions to keep consistent as this expands (orders, bookings,
warranty, compliance, trade-credit are all Phase 4):

- **Edit routes are keyed by slug, not id**, because that's what the
  API's GET endpoints support (`GET /:slug`, not `GET /:id`) — don't add
  an id-lookup endpoint just to make an edit route's URL prettier. Fetch
  by slug, then bind mutations (`updateXAction.bind(null, record.id)`) to
  the real id from the fetched record.
- **Mutations are server actions**, not client-side fetch calls, so the
  access token never reaches the browser. Forms use
  `<form action={serverAction}>` directly rather than `useFormState` —
  errors propagate to `app/admin/error.tsx` as a whole-page boundary
  rather than inline per-field messages. That's a deliberate "minimal
  panel" simplification, not the intended end state; revisit if admin UX
  quality becomes a priority.

## Multi-warehouse stock

`Warehouse`/`WarehouseStock` are an **additive visibility and management
layer**, not a rewrite of how stock is actually decremented at checkout.
This was a deliberate scope decision, made explicitly before writing any
code: three separate places do an atomic check-and-decrement directly
against `Product.stockQty` inside their own transaction —
`OrdersService.checkout`, `QuotesService.convertToOrder`, and
`TradeCreditService`'s drawdown-adjacent path. Retrofitting
warehouse-awareness into all three would mean touching
correctness-critical, already-well-tested code for real money-moving
operations. Instead: `Product.stockQty` stays the untouched aggregate
every one of those paths already depends on, and `WarehousesService.setStock`
recomputes it as the sum across every warehouse — in the same transaction
as the per-warehouse write — whenever an admin sets a warehouse's stock.
Checkout, search's `inStockOnly` filter, and admin's low-stock
highlighting all keep working exactly as before, completely unaware this
model even exists.

**What this genuinely gives you**: real per-location visibility (`GET
/v1/warehouses/stock/:productId` — every warehouse, including ones with
no stock row yet, shown as an implicit zero) and a way to set it
(`/admin/warehouses` for the warehouses themselves, a stock panel on each
product's own edit page for quantities).

**What this does NOT give you, stated plainly rather than left to
discover**: checkout has zero location awareness. A sale decrements the
aggregate only — there's no concept of "which warehouse did this order's
stock come from," so per-warehouse quantities can drift out of sync with
reality after a sale unless an admin reconciles them manually. Real
location-aware fulfillment (automatically decrementing the nearest
warehouse to a delivery address, at minimum) is real follow-up work, not
attempted here — see `docs/GAP-ANALYSIS-III-FEATURE-EXPANSION.md` §6.3.

## Product variants

`ProductVariantGroup` is deliberately a thin grouping layer, not a
rewrite of `Cart`/`Order`/`Review` around a new "variant vs product"
distinction — every variant stays a full, independent `Product` row.
Everything that already points at `Product` (`CartItem`, `OrderLineItem`,
`Review`, `QuoteItem`) is completely untouched; `variantGroupId` +
`variantValue` just let the PDP offer a size selector between real
sibling product pages (`VariantSelector` — plain navigation, not an
in-place AJAX swap, since each sibling has its own independent
price/stock/images).

Both fields are optional, but travel together: set both or clear both,
never just one. Two enforcement layers, for two different reasons:

- `CreateProductDto`'s `@ValidateIf` pairing only sees the current
  request body. It has a real subtlety, found while wiring the admin
  form: `@ValidateIf` alone isn't enough, because `@IsUUID()`/`@IsString()`
  still reject an explicit `null` even when the ValidateIf condition
  means "skip this check" — the conditions check for "meaningfully
  present" (`!== undefined && !== null`), not just `!== undefined`, so
  `{variantGroupId: null, variantValue: null}` (what the admin form sends
  to clear an existing assignment) actually passes. See
  `create-product.dto.spec.ts` for tests proving this directly against
  real `class-validator` behavior, not just the mocked service layer.
- `ProductsService.update`'s merged-state check handles what the DTO
  can't: a **partial** update sending only one of the two fields still
  needs validating against whatever the *other* field already is in the
  database — the DTO alone has no way to see that.

Admin UI: `/admin/variant-groups` (list + create — no edit/delete yet),
and a group-assignment dropdown + value field on the product create/edit
forms. Both forms needed their own `auth()`/session handling added
specifically for the `GET /v1/products/variant-groups` call, since it's
admin-scoped (`products:write`) — unlike categories, which those same
pages already fetched without a token because that endpoint is public.

Still open (see `docs/GAP-ANALYSIS-III-FEATURE-EXPANSION.md` §6.2): only
one option type per group (no combined size+color), no group
rename/delete UI, and no per-variant image override (a variant currently
uses its own `ProductImage` rows independently, same as any other
product — there's no "share these photos across every size" shortcut).

## Multi-user trade accounts

`AccountMember` is a deliberately additive layer, not a restructure —
`Account.keycloakSub`/`email` remain exactly what they always were (the
original account holder), and every existing relation (orders,
addresses, trade credit, cart) stays owned by `Account`, completely
unchanged. The actual unlock is entirely inside
`AccountsService.resolveOrCreate`: once it recognizes a login as
belonging to an existing account (either the original owner, or a
colleague who's been invited), it returns that same `Account` — so
`TradeCreditService`, `OrdersService`, and everything else needed **zero
changes** to "just work" for a shared team, since they were always
scoped to `accountId`, never to a specific person.

**The resolution chain, in order** (see `resolveOrCreate`'s own
comment for the full reasoning): is this `keycloakSub` the account's own
original owner? Is it already a linked `AccountMember`? Does its email
match a *pending* invite (an `AccountMember` row with `keycloakSub` still
`null`, since Keycloak only assigns a `sub` claim at actual login, not at
invite time) — if so, link it now, on this first login. Otherwise,
create a brand-new account exactly as before `AccountMember` existed.

**A real correctness issue this surfaced, not one that pre-existed**:
POPIA erasure (`AccountsService.eraseData`) used to unconditionally
anonymize the account's own `email`/`companyName`/`phone`. Once an
account can have multiple people on it, that's wrong for anyone other
than the original owner — an invited buyer's own "personal data" in this
context really is just their own membership record, and anonymizing
shared company fields because one buyer requested erasure would
incorrectly affect every other member. Fixed by branching on
`account.keycloakSub === keycloakSub`: the original owner's request still
does the full anonymization (and now also removes every member, since
their access existed only because this owner's account granted it); an
invited member's request only removes their own `AccountMember` row.

**Two follow-ups closed in a later pass, done properly rather than left
open**:
- **Promotion to `OWNER` is now reachable through the product** —
  `PATCH /v1/accounts/me/members/:id/role`, owner-only (same
  `requireOwnerAccount` enforcement as invite/remove), with a
  promote/demote toggle on `/account/team`. `AccountMemberRole.OWNER`
  is no longer schema-only.
- **`Order.placedByEmail`** records which specific person placed a given
  order — set from the checkout *caller's* own JWT email (`email` in
  `OrdersService.checkout`'s signature), not the resolved account's own
  top-level email, so it stays meaningful once those two differ. Shown
  on the customer's order detail unconditionally (useful when browsing a
  shared account's order history); shown on the admin's order detail
  only when it actually differs from the account's own email, to avoid
  redundant noise for the common single-person case.

**Still deliberately narrow, stated explicitly**:
- Cart stays account-level (shared across every member), not
  per-member — a real, considered simplification, not an oversight.
  Many B2B ordering systems genuinely work this way; per-member carts
  sharing one checkout is real, separate follow-up work.
- The frontend's own "am I the owner" check
  (`apps/web/app/(showroom)/account/team/page.tsx`) still compares the
  session's own email against `Account.email` directly — correct for the
  original owner, but doesn't reflect a promoted co-owner's own ability
  to manage the team in *this specific page's UI* (the API-side
  enforcement is fully correct either way — a promoted co-owner really
  can invite/remove/promote via the API; this is only that this page
  wouldn't show them the owner-only controls to do so through the UI
  yet). A small, known, real gap, not fixed in this pass either.

## Order amendment — address only, deliberately

`OrdersService.amendAddress` (`PATCH /v1/orders/:id/address`) is
customer self-service, and stops well short of full order editing on
purpose. Only the delivery address — never line items or quantities.
Those would touch payment already captured via PayFast for the original
total and stock already decremented at checkout, both real, separate
undertakings (a partial refund/re-charge reconciliation, and releasing/
re-reserving stock) genuinely not attempted here — see
`docs/GAP-ANALYSIS-III-FEATURE-EXPANSION.md` §6.7. An address correction
touches neither, so it's safe to allow directly, up through `PROCESSING`
(wider than `PaymentsService.cancelOrder`'s own `PENDING`/`CONFIRMED`
boundary — deliberately: cancelling an order already being prepared
undoes real work in progress, correcting where it's going does not).

## SMS — a real, verified integration, deliberately narrow in scope

`SmsService` (`modules/notifications/channels/sms.service.ts`) is a real
BulkSMS.com API client — endpoint, auth mechanism, and request body
shape verified against BulkSMS's own published API specification before
writing any of it, cross-checked against an independent,
actively-maintained third-party Node client for the same API confirming
the same auth mechanism. Same two-source research discipline as
`ShipLogicService`, not a guess. BulkSMS.com is South African in origin —
chosen for consistency with every other real integration in this
codebase being SA-first (PayFast, ShipLogic), not because it's the only
option.

**SMS is a best-effort ADDITION alongside email, never a replacement for
it** — `NotificationsProcessor.sendSmsIfApplicable` runs after the email
channel send, not instead of it, and a failed or skipped SMS never
affects the job's own success (`SmsService.send` returns `false` rather
than throwing).

**Deliberately narrow for this pass**: only `order.shipped` triggers an
SMS attempt, and only when the account has a phone number on file. This
wasn't wired into every notification type — tracking updates are
specifically the kind of thing worth an SMS ping; a "your quote was
priced" SMS is much less clearly worth the reach. Extending this to
other notification types means adding `recipientPhone` to that job's own
interface (see `OrderShippedJob`'s own comment on why it's the only job
type with this field so far) and a branch in
`sendSmsIfApplicable` — mechanical, but a real per-type decision each
time, not a blanket toggle.

## Abandoned-cart recovery — the first real scheduled job

`CartAbandonmentService.checkAbandonedCarts` runs hourly via
`@nestjs/schedule`'s `@Cron()` — the first genuine scheduled/cron job
anywhere in this codebase (see
`docs/GAP-ANALYSIS-III-FEATURE-EXPANSION.md` §2.3, which named the
absence of one as a gap; the SPECIFIC jobs that section originally
described — nightly price-book sync, PIRB batching — remain unbuilt,
only this one exists now).

**Runs in the API process, not the worker** — a deliberate choice, not
an oversight. Every other notification producer in this codebase
(`OrdersService`, `QuotesService`, etc.) already lives in the API
process and calls `NotificationsService` directly; this follows the same
shape rather than expanding the worker beyond "consume the queue and
send," which is all it needs to remain.

**A real, pre-existing signal gap this surfaced and fixed properly**:
`CartItem` had no timestamps at all, and `Cart.updatedAt` was never
actually touched on item add/update/remove — only at cart creation,
since `getOrCreateCart`'s upsert uses `update: {}`. There was no
reliable way to know "when was this cart last touched" anywhere.
`CartService.touchCart` (wired into `addItem`, `bulkAddItems`,
`updateItem`, `removeItem` — not `clear`, since a just-emptied cart
isn't a reminder candidate anyway) fixes this: it refreshes
`Cart.updatedAt` via Prisma's `@updatedAt` (which fires on any write to
the record, not just ones that explicitly set it) and clears
`Cart.reminderSentAt`, so a customer who returns and abandons again
later becomes eligible for a fresh reminder rather than permanently
excluded by one sent long ago.

**The two time windows are deliberate, not arbitrary**: 24 hours before
a cart counts as abandoned at all, and a 7-day cutoff after which this
stops trying — reminding about a cart abandoned weeks ago reads as spam,
not a helpful nudge. Each candidate is marked `reminderSentAt` immediately
after its reminder is queued, not batched at the end of the scan — an
interrupted run doesn't produce duplicate reminders for carts already
reached on the next hourly pass.

## Notifications — the module list is now complete

All modules from the original build-out plan exist. `modules/notifications/`
is the last one, and it's structured differently from the rest because it's
the one genuinely async, cross-cutting concern in the codebase:

- **Producer/consumer are deliberately separate.** `NotificationsModule`
  (producer — `NotificationsService.queue*` methods, adds jobs to a BullMQ
  queue) is what `AppModule` imports. `NotificationsWorkerModule`
  (consumer — `NotificationsProcessor`) is imported only by `worker.ts`,
  a second, minimal application entry point that runs as its own Render
  service (`bellwetherswe-worker` in `render.yaml`). Never import
  `NotificationsWorkerModule` into `AppModule` — that would make the API
  process also start consuming jobs, defeating the reason they're split:
  a slow or failing notification should never block or crash request
  handling.
- **Job payloads are self-contained** (recipient email, formatted amounts,
  etc.) rather than just IDs the worker would need to look up — that's
  what lets `worker.ts` skip `PrismaModule` entirely. If a new job type
  needs data from the database, fetch it before enqueueing, not inside the
  processor.
- **Channel selection is one config value** (`NOTIFICATION_CHANNEL=log|ses`),
  resolved once in `NotificationsWorkerModule` behind the
  `NotificationChannel` interface. `log` (the default) writes structured
  log output and needs no external account — a legitimate choice for any
  environment without email credentials configured yet, not a stub. `ses`
  sends real email via AWS SES, chosen over a dedicated email SaaS because
  the group already runs S3 in the same af-south-1 region — same account,
  no new vendor relationship, and priced per-email rather than a monthly
  tier.
- **Only two real triggers are wired up**: `PaymentsService.handleItn`
  (order confirmed) and `WarrantyService.issue` (warranty issued) — one
  customer-facing flow, one admin-triggered flow, proving the pattern works
  both ways. `booking.scheduled` and `compliance.coc-issued` job types
  already exist (see `interfaces/notification-job.interface.ts` and
  `templates/notification.templates.ts`) but nothing calls
  `queueBookingScheduled`/`queueCoCIssued` yet — wiring those in is a
  one-line addition to `BookingsService.updateStatus` and
  `ComplianceService.issue` respectively, following the exact shape
  `WarrantyService.issue` already demonstrates.
- **Templates are plain text**, not branded HTML — a real follow-up (the
  brand kit's design tokens already exist to build from), just separate
  work from "does the queue → worker → send pipeline function end to end."

## Trade credit — wired into checkout

`modules/trade-credit/` is a complete account-management module (setup,
balance queries, race-safe drawdown/repayment), and `OrdersService.checkout`
now offers it as a real payment option (`CheckoutDto.paymentMethod`).

One thing worth knowing if you're touching either module: the checkout
path does **not** call `TradeCreditService.recordDrawdown()` — it
duplicates that method's atomic check-and-increment SQL directly inside
`OrdersService.checkout`'s own transaction. This wasn't the original plan
(an earlier version of this doc predicted calling `recordDrawdown`
directly), but `recordDrawdown` runs against the shared, non-transactional
`PrismaService`, and the credit check needs to be part of the *same*
transaction as the stock decrement and order creation — otherwise a
credit reservation could commit independently before knowing whether the
order itself would succeed. If the drawdown rule ever changes (the
`creditUsed + amount <= creditLimit` check), update both copies: the one
in `TradeCreditService.recordDrawdown` (admin-triggered drawdowns) and the
one inlined in `OrdersService.checkout` (checkout-triggered ones).

## Payment integration specifics (PayFast)

`modules/payments/` has a few conventions worth knowing before touching it:

- **Field order matters and is not alphabetical.** The checkout signature
  uses `CHECKOUT_SIGNATURE_FIELD_ORDER` (PayFast's declared order); their
  separate REST API uses alphabetical order instead. Don't assume one
  applies to the other.
- **Encoding must match PHP's `urlencode()`**, not `encodeURIComponent()` —
  they disagree on spaces (`+` vs `%20`) and six characters
  (`! ' ( ) * ~`). `payfast-signature.util.ts`'s `payfastEncode()` handles
  this; don't reach for `encodeURIComponent` directly anywhere in this
  module.
- **The ITN webhook (`POST /payments/payfast/notify`) is intentionally
  public** — no `@UseGuards(KeycloakAuthGuard)`. PayFast authenticates
  itself via signature + source IP, verified inside `PaymentsService.handleItn`,
  not via a Besbpo ID token. Don't add a guard to this one endpoint.
- **The ITN handler always returns HTTP 200**, even when validation fails —
  the failure is logged, not propagated as a non-200 (which would make
  PayFast retry a request that will fail identically every time). See the
  comment on `PaymentsController.handleNotify`.
- **Source-IP validation resolves PayFast's hostnames via DNS at request
  time** rather than checking against a hardcoded IP list — PayFast's IP
  ranges have changed before without much notice. See `payfast-ip.util.ts`.
