import sentry_sdk
from fastapi import FastAPI
from sqlalchemy import text
from app.routers import recommend, search_rank, estimate
from app.config import settings
from app.db import engine

# No Sentry project exists for this service yet — sentry_sdk.init() is
# simply skipped when SENTRY_DSN isn't configured, same graceful-degradation
# pattern as apps/api's src/instrument.ts and apps/web's Sentry config files.
if settings.sentry_dsn:
    sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.sentry_environment, traces_sample_rate=0.1)

# No CORS middleware here deliberately — this service is not reachable from
# the browser. render.yaml wires it as an internal-only Render service; only
# apps/api calls it, over the private network. If that ever changes (this
# service becomes directly browser-facing), CORS needs to be added
# explicitly then, not preemptively now.
app = FastAPI(
    title="Bellwether SWE — AI Service",
    description="Internal-only service: recommendations, search query expansion, quote estimation.",
    version="0.1.0",
)

app.include_router(recommend.router)
app.include_router(search_rank.router)
app.include_router(estimate.router)


# Was a static {"status": "ok"} with no actual check — same gap
# apps/api's health check had before this endpoint was rebuilt. This
# service does nothing useful without its own database connection (every
# router queries it directly, see app/db.py), so verifying that
# connection is the one check that actually matters here.
@app.get("/health")
async def health() -> dict:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ok", "checks": {"database": "ok"}}
    except Exception:
        return {"status": "degraded", "checks": {"database": "error"}}
