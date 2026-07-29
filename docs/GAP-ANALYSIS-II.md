# Gap Analysis II — Post-Roadmap Review

**Context**: `docs/GAP-ANALYSIS-ROADMAP.md` describes the original 25-item
roadmap as fully complete, including the deliberately-deferred Quote
model and its later `convertToOrder` follow-up. This document is a
second, independent pass over the *current* codebase — not a re-read of
that roadmap, but a fresh look for what a completed roadmap doesn't
automatically catch: real bugs, coverage gaps, and consistency issues
that only show up by actually reading the code again with a critical eye.

That original document's own **Section 1** ("Gap Analysis") is now
**historical** — it describes the pre-build state (e.g. "no CRUD for
addresses," "no stock replenishment") that Section 2's roadmap has since
resolved. Section 1 was never updated as items completed, only Section 2
was. Worth knowing if you read that document: trust its Section 2
per-item completion notes over its Section 1 narrative for current state.

One methodology note, in the interest of not repeating it: an earlier
pass in this same review initially flagged `prisma/seed.ts` as another
broken script reference (same pattern as the real `test:e2e` bug fixed
earlier this build). That was wrong — a `ls` command's output was
misread while scanning several files at once, and the file turned out to
already exist as a complete, working 192-line seed script. Caught and
retracted before it became a false claim in this document, not silently
dropped. Worth naming so a false negative doesn't get assumed true later.

---

## Fixed during this review, not just documented

### 1. Category tree cycle vulnerability (real bug, meaningful severity)

`CategoriesService.update()` let an admin set any category's `parentId`
to any other category's id — including one of its own descendants —
with zero cycle detection anywhere in the schema or code.
`CategoriesService.findTree()`'s recursive `build()` function has no
cycle detection either. The combination meant a single bad admin edit
(re-parenting a category under its own child or grandchild) would make
**every subsequent call to `GET /v1/categories`** — a public, unauthenticated
endpoint hit on nearly every storefront page load — recurse forever,
hanging or crashing the process. Fixed: `update()` now rejects
self-parenting outright and walks the proposed new parent's ancestry
chain, rejecting if it ever reaches the category being moved. Tested
specifically for the cycle case, the self-parent case, and a legitimate
re-parent to confirm the fix doesn't over-reject.

### 2. ESLint was never actually wired up in either service

`npm run lint` has existed in both `apps/api/package.json` and
`apps/web/package.json` since scaffolding, but:
- `apps/api` didn't even list `eslint` as a dependency, and had no config
  file at all.
- `apps/web` had `eslint`/`eslint-config-next` as dependencies, but no
  config file — `next lint` would have prompted to create one
  interactively on first run, which hangs indefinitely in a non-interactive
  context like CI.

Fixed: added the missing dependencies to `apps/api`, and a real
`.eslintrc.js` there; added `apps/web/.eslintrc.json` extending
`next/core-web-vitals`. Neither has been run yet in this environment (no
`node_modules` installed here) — that's the first thing to do with this
fix, not assume it's flawless on the first real run.

---

## Still open — prioritized

### High priority

**No test coverage: `PricingService`.** This is real financial logic —
compound complexity multipliers, VAT calculation, trade-vs-retail price
branching — backing a fully public, unauthenticated endpoint
(`POST /v1/pricing/quote`) that both the storefront's estimator and the
Python AI service's quote assistant depend on. Zero tests exist. Given
the multiplier math (`reduce` with multiplicative compounding) and the
trade/retail branching are exactly the kind of logic that's easy to get
subtly wrong and hard to notice wrong, this is the single highest-value
gap in this document.

**No test coverage: `BundlesService`, remaining `CategoriesService`
methods.** `create`, `findAll`, `findOneBySlug`, `remove`, and the
product-existence assertion in `BundlesService` are all untested;
`CategoriesService`'s non-cycle-related paths (`create`, `findTree`,
`remove`'s child/product conflict check) are untested too, beyond what
this pass added.

**No endpoint-specific rate limiting anywhere.** Every endpoint in the
API — including `POST /v1/payments/payfast/notify`, the fully public,
unauthenticated PayFast ITN webhook that triggers real order-status
changes and refund logic — shares the same global 120 req/min default
(`ThrottlerModule.forRoot()`). No endpoint uses `@Throttle()` for a
tighter, purpose-specific limit. Worth a deliberate pass deciding which
endpoints need one (the ITN webhook and account-erasure are the two most
obvious candidates) rather than leaving every endpoint at one
one-size-fits-all number.

### Medium priority

**Frontend error/loading boundary coverage is inconsistent.**
- The entire `/trade` portal (dashboard, bulk-order, quotes,
  credit-terms) has **no `error.tsx` and no `loading.tsx` at all** — any
  server-side data-fetch failure there falls through to Next.js's
  generic, unbranded error page instead of anything matching the rest of
  the app.
- `/admin` has an `error.tsx` but no `loading.tsx` — admin list/detail
  pages that fetch data server-side (orders, bookings, quotes, analytics)
  show a blank page with no loading indicator while that happens, unlike
  the storefront's `(showroom)` route group, which has both.
- Eleven separate pages call Next's `notFound()`, but only **one**
  `not-found.tsx` boundary exists anywhere (`product/[slug]`) — the other
  ten (order detail, booking detail, quote detail, bundle detail, etc.)
  all fall through to Next's default 404 styling instead of the brand.

**Bundle item composition still can't be edited after creation** — this
was already flagged honestly in `dto/update-bundle.dto.ts`'s own comment
and the admin UI's copy at the time it was built, and remains true. Not
a new finding, just confirmed still accurate and worth prioritizing now
that most other admin gaps are closed.

### Lower priority / worth knowing about

- `PricingService.quote()`'s material resolution
  (`resolveMaterials`) throws a generic `BadRequestException` naming a
  single unknown product id at a time inside a `.map()` — if multiple
  unknown ids are submitted, only the first one encountered is named in
  the error, unlike the equivalent bulk-validation pattern used elsewhere
  in this codebase (e.g. `BundlesService.assertProductsExist`, which
  names every missing id at once). Minor UX inconsistency for an admin or
  integrator debugging a bad request, not a correctness issue.
- No admin UI exists for editing `ComplexityMultiplier` or
  `PriceBookEntry` rows at all — both are only ever set via
  `prisma/seed.ts` or direct database access. If the pricing/quote
  feature sees real use, whoever owns pricing decisions has no way to
  change a labor rate or add a multiplier without a deploy or manual SQL.

---

## What this document is for

Same standard as the original: this is a living record, not a one-time
snapshot. When an item above gets addressed, update this document to say
so — with the same discipline `GAP-ANALYSIS-ROADMAP.md`'s Section 2
maintained throughout the original build — rather than letting this one
drift the way that document's Section 1 did.
