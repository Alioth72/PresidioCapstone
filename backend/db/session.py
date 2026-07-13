"""
Async SQLAlchemy session factory and database initialization.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from backend.config import settings

# PostgreSQL connection pooling
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=(settings.APP_ENV == "development"),
    pool_size=5,
    max_overflow=10,
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


async def get_db():
    """FastAPI dependency — yields an async DB session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    """Create all tables on startup."""
    from backend.db import models  # noqa: F401 — ensure models are registered
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_all():
    """Drop all tables — used in tests for clean slate."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
