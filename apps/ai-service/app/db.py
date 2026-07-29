from collections.abc import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.config import settings

# This service does not own the schema — apps/api's Prisma schema is the
# source of truth (see apps/api/prisma/schema.prisma). Queries here are
# read-only raw SQL against that schema, not a second ORM model set to keep
# in sync. If a query here breaks after a schema migration, that's expected
# to be caught by an integration test, not silently drift.
engine = create_async_engine(settings.database_url, pool_size=5, max_overflow=5)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


async def fetch_all(session: AsyncSession, query: str, params: dict) -> list[dict]:
    result = await session.execute(text(query), params)
    return [dict(row._mapping) for row in result]
