# Gap Analysis IV — Scale & Discoverability

Three prior passes (`GAP-ANALYSIS-ROADMAP.md`, `GAP-ANALYSIS-II.md`,
`GAP-ANALYSIS-III-FEATURE-EXPANSION.md`) got this platform from nothing to
a feature-complete e-commerce system, validated against a small,
hand-curated demo catalog. That catalog is no longer small — 8,491 real
products now exist. This pass asks a different question than the first
three: **what breaks, or turns out to matter, now that the assumption of
"a handful of seed products" is gone?**

Same standard as the prior three documents: a living backlog, not a
snapshot. Every item below was found by reading the actual code, not
inferred from a generic e-commerce checklist.

---

## 0. Urgent — live bugs, not feature gaps

### 0.1 Five real pages likely threw an error; the sitemap was silently empty

**Done.** All five pages — guest checkout, trade bulk-order, trade quote
requests, recurring orders, admin bundle creation — rebuilt around a new
reusable `ProductCombobox` component (debounced, real search against the
existing `GET /v1/products?search=`), with the failing server-side
`pageSize=200` fetch removed from each. The sitemap now calls a new,
dedicated `GET /v1/products/all-slugs` endpoint instead of the capped,
previously-failing request — deliberately not a raised page-size limit
on the general products endpoint, since a lightweight, unpaginated
slugs-only endpoint is a different, safer shape than letting any caller
request arbitrarily many full product records at once. See
`docs/AGENTS.md`'s own section on this fix for the full detail,
including a real bug caught and fixed mid-rebuild (a broken sku-as-slug
fetch in the bulk-order table) and how `QuoteRequestForm`'s entire
existing test suite was rewritten rather than left behind during its
rebuild.

---

## 1. SEO & discoverability

### 1.1 Homepage "Popular Products" ignores real popularity data that already exists

**Done.** `GET /v1/products/popular` (`ProductsService.findPopular`)
reuses the same order-history query shape
`AnalyticsService.getPopularProducts` already established, returning
full product records rather than that method's lighter admin-analytics
shape. Falls back to newest-first when there's no order history yet.
See `docs/AGENTS.md`'s own section on this for the full detail,
including how it's tested against a deliberately-reversed mock to prove
it doesn't just trust the database's own row order.

### 1.2 No visual "shop by category" hub

**Done.** The homepage now has a real category grid using all 19
existing categories.

### 1.3 Only one page type has SEO metadata or structured data

**Done, with a real correction to this document's own earlier claim.**
Re-checking before building on this turned up that the product page
did NOT already have `generateMetadata` — the only `metadata` export
anywhere was the root layout's static, site-wide one. Product,
category, and search pages all have real metadata now. See
`docs/AGENTS.md` for the full detail, including a second, separate live
bug (`/category/all` is a genuine 404) found and fixed while working on
this.

---

## 2. Missing customer-facing pages

**All done.** Terms of Service, Privacy Policy, Returns Policy, Shipping
& Delivery, About Us, Contact, and FAQ — each describing what the
platform actually does rather than inventing policy details it doesn't
enforce (see `docs/AGENTS.md` for why the Returns Policy deliberately
states no specific return window). Guest order tracking
(`/track-order`, `POST /v1/orders/track`) — public, no account needed,
linked from the guest checkout success page. A root-level custom
`app/not-found.tsx`, mirroring the existing product-specific one's
design.

---

## 3. Real catalog content gaps (not code gaps)

Still genuinely open — this is a real operational/business task, not
something to fix in code. All 8,491 imported products still have no
images and placeholder weight/dimensions. `ProductImageOrPlaceholder`
already degrades gracefully; the gap is the missing photography itself
(or licensed manufacturer stock photos for named brands like
Cobra/Grohe/Geberit), worth surfacing as a business priority rather
than a technical one.

---

## 4. Product discovery & merchandising

### 4.1 No product comparison

**Done.** A localStorage-backed compare list (capped at 4 products), a
compare button on every product card, a site-wide indicator bar
(visible only when non-empty), and a real `/compare` page. See
`docs/AGENTS.md` for a real bug caught and fixed mid-build — the first
draft referenced a by-ID product lookup endpoint that doesn't actually
exist; fixed by switching to slugs, which the product page's own
existing endpoint already supports.

### 4.2 No newsletter/marketing opt-in

**Done.** `NewsletterSubscriber`, its own standalone model (most
subscribers will never have an account), with idempotent subscribe/
unsubscribe — submitting an already-subscribed email twice, or
unsubscribing an email that was never subscribed, are quiet successes,
never errors. Footer signup form wired to the real endpoint.

### 4.3 No homepage merchandising beyond one static hero

**Partially addressed** — 1.1 and 1.2 above (real popularity, category
grid) are real merchandising improvements. Still genuinely open:
"deals," "new arrivals," or other per-category homepage highlights
beyond what's now there. A real, separate follow-up, not attempted in
this pass.

---

## What this document is for

Same standard as the three prior gap-analysis documents: a living
backlog, not a snapshot. Item 0.1 is materially different in kind from
everything else here — it's a live defect affecting real users today, not
a "would be nice" feature gap, and is called out first for that reason.
