# Bellwether SWE — AI Service

Internal-only FastAPI service. Not reachable from the browser — only
`apps/api` calls it, over Render's private network in production.

## Endpoints

- `POST /recommend` — co-occurrence recommendations from existing bundle
  composition (not collaborative filtering yet — see the comment at the top
  of `app/services/recommendation_service.py` for why, and the upgrade path
  once order history exists).
- `POST /search-rank` — plumbing-domain query expansion, then delegates
  ranking to `apps/api`'s Postgres full-text search.
- `POST /estimate` — keyword classification into sector/serviceCode, then
  calls `apps/api`'s real pricing engine for the actual quote.

All three are deliberately zero-cost rule-based v1 implementations, not LLM
or embeddings calls — consistent with the cost constraints already set for
search indexing and the CMS decision. Each service file documents its
upgrade path in a comment at the top.

## Local setup

```bash
pip install -r requirements.txt --break-system-packages
cp .env.example .env   # fill in real values
uvicorn app.main:app --reload --port 8000
```

This has **not been installed or run** in the environment it was authored
in (no network access there) — `pip install` and `pytest` are the first
sanity checks to run in a real environment.

## Tests

```bash
pytest
```

Only the pure-logic services (`estimate_service.classify`,
`search_service.expand_query`) have tests so far — both were verified
standalone before being committed (no pytest available in the authoring
sandbox). `recommendation_service` needs a test DB fixture to test properly;
that's not set up yet.
