# Gap Analysis V — Notifications, Discoverability & Growth Features

Four prior passes took this platform from an original 25-item roadmap
through code quality, feature expansion, and scale/discoverability
fixes, then a real catalog import, a full homepage rebuild, and two
genuinely missing pages (trade applications, admin customer listing).
At 34,599 LoC and 506 files, this platform is mature. This pass asks a
different question than the others: **now that nearly everything
proposed has been built, what real gaps remain in how the pieces talk
to each other — and what would a business at this stage genuinely want
next?**

Same standard as the prior four documents: every item below was found
by reading the actual code, not inferred from a generic checklist.

---

## 1. A real, consistent gap: customer-facing status changes with no notification hook — DONE

The notification system supports 10 real types (`order.confirmed`,
`order.shipped`, `cart.abandoned`, `order.cancelled`,
`warranty.issued`, `booking.scheduled`, `compliance.coc-issued`,
`quote.priced`, `recurring-order.placed`, `recurring-order.failed`) —
genuine infrastructure, not a stub. Checked directly against every
workflow with a real multi-stage lifecycle, and found two with none at
all:

### 1.1 Trade account applications — submitted, reviewed, then silence — DONE

`TradeAccountApplicationsService.approve()`/`reject()` update the
application and the account's type, but never queue a notification.
A customer who applies has no way to find out their status changed
except by manually revisiting `/trade/apply` — a page they have no
reason to remember once they've already submitted. This is the same
class of gap the recurring-orders and returns features were built to
avoid elsewhere; worth closing here for the same reason.

**Done** — added `trade-application.approved`/`.rejected`, full detail
in `docs/AGENTS.md`.

### 1.2 Returns/RMA — a real, multi-stage state machine with no customer notification at any stage — DONE

`ReturnsService` has a genuine state machine
(`REQUESTED → APPROVED → RECEIVED → REFUNDED/REPLACED`, with
`REJECTED` reachable from two different states) — real, deliberate
design work happened here. But none of those transitions queue a
notification. A customer who requests a return has to keep checking
`/account/returns` themselves to find out whether it was approved,
rejected, or refunded.

**Done** — added `return.status-changed`, covering all five
transitions with one type, full detail in `docs/AGENTS.md`.

---

## 2. Sitemap coverage gap — real, indexable pages invisible to search engines — DONE

`sitemap.ts` currently includes only the homepage, `/search`, product
pages, and category pages. Checked directly: it does **not** include
`/bundles`, individual `/bundle/[slug]` pages, `/clearance`,
`/trending`, or any of the seven legal/informational pages
(`/terms`, `/privacy-policy`, `/returns-policy`, `/shipping`, `/about`,
`/contact`, `/faq`). All of these are real, public, indexable pages —
they're reachable by a search engine crawling links, but absent from
the sitemap that's supposed to help discovery and signal priority.

**Done** — the seven fixed pages added as static routes, plus a
bundle-slugs fetch alongside the existing product/category fetches.
Full detail in `docs/AGENTS.md`.

---

## 3. Admin analytics doesn't reflect the newer revenue/funnel features — DONE

`AnalyticsService` covers three things: a summary, revenue over time,
and popular products — all real, working, but unchanged since before
Clearance, trade applications, or bundles existed. An admin currently
has no dashboard view of: how many products are on clearance and what
they're worth, the trade application funnel (submitted → approved/
rejected, and the resulting conversion rate), or bundle performance.
Each of these is individually visible in its own admin screen already
(the clearance review screen shows current candidates, the trade
applications screen shows pending/reviewed) — this isn't proposing new
data collection, just surfacing what already exists in one place an
admin reviewing overall business health would actually look.

**Done, with one honest exclusion** — Clearance and trade application
metrics were built as proposed. Bundle "performance" specifically was
NOT built as originally framed — checking first confirmed there's no
bundle-price checkout mechanism anywhere, so there's no real sales data
behind a bundle to report on. Built an honest bundle *catalog* count
instead (bundles defined, by sector) rather than fabricate a
performance metric the platform can't actually measure. Full detail in
`docs/AGENTS.md`.

---

## 4. Restated — deliberate scope boundaries from prior passes, not new findings

Carried forward honestly rather than re-discovered, since they were
already named directly and remain true:

- **Bundle-price checkout mechanism** — a `Bundle` is still just an
  admin-curated list with a stated price; nothing charges that price
  at checkout. "Add to cart" adds items individually, clearly labeled
  as such on the page itself.
- **Click-and-collect** — needs multi-warehouse location-aware
  fulfillment, which checkout doesn't have.
- **PayFast-based (not just trade-credit) split/recurring checkout** —
  needs a genuinely different multi-step flow; the interactive-session
  constraint behind trade-credit-only is fundamental, not a shortcut.
- **`accounts:manage`** — the admin customer listing is deliberately
  read-only; no admin UI edits a customer's own details yet.
- **Broader web test coverage** beyond the diverse-but-partial sample
  built during Gap Analysis III.
- **Real product photography** for the 8,491 imported products — a
  business/operational task, not code.

---

## 5. Recommended new features, grounded in what this specific platform now has

Not a generic e-commerce feature list — each of these was considered
against what's actually built, and several were checked against
existing code before being recommended (noted where relevant).

### 5.1 Back-in-stock notifications — DONE

For an out-of-stock product, let a customer ask to be notified when it
restocks. Real, contained scope: a new small model (email + productId,
similar shape to `NewsletterSubscriber`), a check in whatever process
already updates `stockQty` (the restock endpoint already exists —
`ProductsController`'s `restock` action), and a new notification type
following the same five-place pattern as section 1's recommendation.

**Done** — wired into both places stock can actually increase
(`restock()` and the general `update()` method), upsert-based so a
repeat request re-arms rather than duplicates. Full detail in
`docs/AGENTS.md`.

### 5.2 Low-stock alerts for admin — the inverse of Clearance — DONE

Clearance already finds products with too much stock and no movement.
Checked directly: nothing finds the opposite — products running low
relative to their own sales velocity, which is exactly the kind of
signal this platform's architecture already computes for other
features (`findPopular`, `findTrending`). A `findLowStock` admin query
in the same spirit — real stock relative to real recent order
velocity, not just a flat "stock < 10" threshold — would be a natural,
consistent addition rather than a bolted-on new concept.

**Done** — sorts by real days-of-stock-remaining, excludes already-
out-of-stock products (a different, already-handled problem) and
products with no measurable recent velocity (no real signal to alert
on). Also added as a fourth card on the admin analytics "Business
Health" section. Full detail in `docs/AGENTS.md`.

### 5.3 WhatsApp notifications, alongside the existing SMS channel

SMS notifications already exist (via BulkSMS, from Gap Analysis III).
WhatsApp is extremely widely used in South Africa specifically, and
several providers (including Twilio and BulkSMS itself) support
WhatsApp Business messaging through a similar API shape to SMS —
plausibly a real extension of the existing `NotificationsService`
channel logic rather than a new integration built from scratch,
though this would need a real look at BulkSMS's own WhatsApp support
(or an alternative) before committing to a specific provider.

### 5.4 Admin bulk order status updates

Checked: order status updates
(`OrdersController`/`UpdateOrderStatusDto`) happen one order at a time.
For a business processing a batch of orders being dispatched together,
a bulk "mark these N orders as dispatched (with tracking numbers)"
action would save real, repetitive admin work — the same reasoning
that motivated `CartService.bulkAddItems`, applied to order fulfillment
instead of cart building.

### 5.5 Referral program

Nothing like this exists yet. A customer refers another, both get a
real, concrete incentive (a coupon-shaped discount, reusing the
existing `Coupon`/`CouponRedemption` infrastructure rather than
inventing a second discount mechanism) once the referred customer's
first order completes. Real, contained scope given the coupon system
already does the hard part (redemption tracking, discount
application).

### 5.6 CSV export of analytics/reporting

`AnalyticsService`'s existing summary/revenue/popular-products data has
no export path — an admin wanting to build a report or share numbers
outside the dashboard has no way to get the underlying data out. Given
`ProductsBulkService.exportToCsv` already established the CSV-
generation pattern for this codebase, extending the same approach to
analytics data would be consistent, not a new pattern.

---

## What this document is for

Same standard as the four prior gap-analysis documents: a living
backlog, not a snapshot. Section 1 and 2 are real, checked gaps in
already-built features, not proposals — worth prioritizing over the
recommendations in section 5, which are genuinely new scope.
