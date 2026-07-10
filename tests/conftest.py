"""
Shared test fixtures — async client, test database, etc.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from backend.main import app
from backend.db.session import init_db


@pytest_asyncio.fixture
async def client():
    """Async test client for the FastAPI app."""
    # TODO: Override DB dependency with test database
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
