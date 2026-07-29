# Bellwether SWE — E-Commerce Production Plan
**bellwetherswe.shop — supersedes BSWE-ECOM-ARCH-01 deployment section**

---

## 1. HITLAD Workflow & Governance

**HITLAD** (Human-in-the-Loop Agentic Development): Claude authors the **foundational codebase** — the architecture, data models, and business-critical logic that everything else builds on. OpenHands then does **agentic feature development** on top of that foundation, with Fortune reviewing and approving at defined checkpoints. Nothing merges to `main` without passing automated checks and a human approval.

### 1.1 Two phases

| Phase | Owner | Scope |
|---|---|---|
| **Foundational** | Claude | Repo scaffolding, DB schema & migrations, auth/SSO wiring, pricing engine, base API contracts, design system components, Render config |
| **Agentic build-out** | OpenHands | Remaining CRUD screens, admin tooling, edge-case handling, test coverage expansion, ongoing feature tickets, bug fixes |

The foundational phase is deliberately the *hardest-to-get-wrong* logic — pricing, data model, auth — so OpenHands is extending a correct skeleton rather than inventing the load-bearing parts itself.

### 1.2 Human-in-the-loop checkpoints

- OpenHands works one GitHub Issue at a time, opens a PR — never commits directly to `main`.
- Branch protection on `main`: requires passing CI (lint, type-check, tests, LoC-cap check) **and** Fortune's (or a designated reviewer's) approval before merge.
- Each PR must state which module(s) it touched and confirm no file crossed the LoC hard cap.
- Architecture-level changes (new module, new external service, schema changes) require a doc update in the same PR — the docs are the source of truth OpenHands reads before generating code, so drift here compounds fast if left unmerged.

### 1.3 Guardrails for the agent

- Strict file/module structure (§4) — an unambiguous place for every new file, so the agent isn't guessing where things belong.
- LoC discipline (§2) — prevents the monolithic-file problem agentic tools tend toward when unconstrained.
- `docs/AGENTS.md` in the repo — written conventions (naming, folder placement, commit style, required test-per-endpoint) OpenHands is instructed to follow.
- OpenAPI spec generated from the NestJS API — the actual contract, not just documentation of it — so the frontend and AI service can't silently drift from what the API returns.

---

## 2. Code Standards

- **Target file size:** 280–800 LoC for logic-bearing files (services, controllers, components, hooks).
- **Hard cap:** 1,500 LoC — a PR introducing a file past this must split it before merge.
- **Note on the average:** this range applies to substantive files. Types, DTOs, constants, and barrel (`index.ts`) files are naturally smaller (20–100 LoC) and should **not** be padded to hit the average — that would be gaming the metric, not following it.
- Lint + type-check + test run on every PR (CI gate, not optional).
- One module = one clear responsibility. If a service file is approaching the cap, that's usually a signal it's doing two things and should split along that seam.

---

## 3. Estimated Lines of Code

Planning estimate, not a guarantee — actual LoC will move as features are scoped in detail.

| Service | Source | Tests | Subtotal |
|---|---|---|---|
| **API (NestJS)** — auth, accounts, products, bundles, categories, pricing engine, orders, cart, bookings, warranty, compliance (CoC/PIRB), payments, trade credit, notifications, shared/common | ~9,850 | ~4,000 | **~13,850** |
| **Web (Next.js)** — design system, showroom routes, trade routes, shared layout, API client, state, middleware | ~13,800 | ~2,500 | **~16,300** |
| **AI service (Python/FastAPI)** — recommendations, search ranking, quote assistant, API layer | ~2,700 | ~1,000 | **~3,700** |
| **Infra & tooling** — Render config, CI workflows, Docker, env schemas, scripts | ~800 | — | **~800** |
| **Total** | | | **~34,650 LoC** |

At the 280–800 LoC/file range for substantive files, that's roughly **150–220 files** across the whole monorepo once smaller support files (types, DTOs, individual test files) are counted.

---

## 4. File Structure (monorepo)

One repo, one source of truth — easier for OpenHands to see cross-service contracts than three separate repos, and Render deploys each `apps/*` folder as its own service from the same repo.

```
bellwether-swe-ecommerce/
├── apps/
│   ├── web/                        # Next.js 14 — Render: bellwetherswe-web
│   │   ├── app/
│   │   │   ├── (showroom)/         # retail route group
│   │   │   │   ├── page.tsx
│   │   │   │   ├── category/[slug]/page.tsx
│   │   │   │   ├── product/[slug]/page.tsx
│   │   │   │   ├── cart/page.tsx
│   │   │   │   ├── checkout/page.tsx
│   │   │   │   └── account/{orders,addresses}/page.tsx
│   │   │   ├── (trade)/            # B2B route group
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── bulk-order/page.tsx
│   │   │   │   ├── quotes/[id]/page.tsx
│   │   │   │   └── credit-terms/page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── middleware.ts       # auth-gates /account and /trade/*
│   │   ├── components/{ui,layout,commerce}/
│   │   ├── lib/{api-client,auth,utils}/
│   │   └── hooks/
│   ├── api/                        # NestJS — Render: bellwetherswe-api
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/ accounts/ products/ bundles/ categories/
│   │   │   │   ├── pricing/ orders/ cart/ bookings/
│   │   │   │   ├── warranty/ compliance/ payments/
│   │   │   │   └── trade-credit/ notifications/
│   │   │   ├── common/             # guards, interceptors, filters, decorators
│   │   │   └── database/           # migrations, seeders
│   │   └── test/
│   └── ai-service/                 # FastAPI — Render: bellwetherswe-ai (internal only)
│       ├── app/
│       │   ├── routers/            # recommend.py, search_rank.py, estimate.py
│       │   ├── models/ services/
│       │   └── main.py
│       └── tests/
├── packages/
│   └── shared-types/                # TS interfaces shared between web ↔ api
├── docs/
│   ├── ARCHITECTURE.md
│   ├── AGENTS.md                    # HITLAD conventions for OpenHands
│   └── API-CONTRACT.md (OpenAPI spec)
├── render.yaml                       # all 3 services + Postgres + Redis, as code
└── README.md
```

---

## 5. URL Structure

**Frontend (`bellwetherswe.shop`)** — single Next.js app, two route groups on one domain:

| Path | Purpose |
|---|---|
| `/` | Showroom home |
| `/category/[slug]` | Category listing |
| `/product/[slug]` | Product detail |
| `/cart`, `/checkout` | Cart & checkout flow |
| `/account`, `/account/orders`, `/account/addresses` | Retail customer account |
| `/trade/dashboard` | B2B landing |
| `/trade/bulk-order` | Bulk/CSV ordering |
| `/trade/quotes`, `/trade/quotes/[id]` | Quote requests |
| `/trade/credit-terms` | Trade credit account management |

**API (`api.bellwetherswe.shop`)** — versioned, separate Render service:

`/v1/auth`, `/v1/products`, `/v1/categories`, `/v1/bundles`, `/v1/cart`, `/v1/orders`, `/v1/bookings`, `/v1/pricing/quote`, `/v1/trade/credit-terms`

**AI service** — **not publicly exposed.** Reached only over Render's private network, called server-to-server from the API (`bellwetherswe-api → bellwetherswe-ai`). No public subdomain, no direct frontend access.

---

## 6. Python for AI & Smart Capabilities

A separate FastAPI service, called internally by the NestJS API — keeps Python's ML/NLP ecosystem isolated from the Node/TS codebase rather than bolted awkwardly onto it.

**Planned v1 capabilities:**
1. **Product recommendation engine** — "goes with this job" bundle suggestions, not just generic "customers also bought"
2. **Semantic search ranking** — natural-language queries ("leaking pipe under sink") mapped to relevant products/services, since keyword search alone is weak across a 10,500+ SKU catalog
3. **Quote/estimate assistant** — guided chat or form flow that gives a customer a preliminary price band before they request a formal quote, feeding into the pricing engine's existing complexity-multiplier logic

**Stretch (not v1):** photo-based issue triage — a customer uploads a photo, gets routed to the right service category. Flagging this as a later addition rather than committing to it now, since it needs its own accuracy validation before going live.

---

## 7. Deployment Topology (Render)

| Service | Type | Notes |
|---|---|---|
| `bellwetherswe-web` | Web Service (Node) | SSR, public |
| `bellwetherswe-api` | Web Service (Node) | Public, versioned REST |
| `bellwetherswe-ai` | Web Service (Python) | **Private network only** |
| Postgres | Render managed | Replaces Supabase |
| Redis | Render managed | Replaces Upstash; also backs BullMQ job queue (replaces Kafka/MSK for this project) |
| Background Worker | Render Background Worker | BullMQ consumer — order processing, notifications, catalog sync |
| Cron Jobs | Render Cron | Nightly price-book sync, PIRB batch processing |

CI/CD: Git-based auto-deploy — `main` → production, `staging` branch → mirrored staging environment. Trades Terraform/ArgoCD-style infra control for near-zero DevOps overhead, which fits a Render-hosted setup.

**Still open (unaffected by this plan):** payment gateway, search-index technology choice, CMS, trade credit workflow detail, PIRB integration mode (manual vs. API).
