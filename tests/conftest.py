"""
Shared test fixtures — async client, test database initialization, and session overrides.
"""

import os
# Force settings to load in testing mode
os.environ["TESTING"] = "True"

import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from backend.config import settings
from backend.main import app
from backend.db.session import Base, get_db
from backend.db.models import User, UserRole, Book, Loan, ChatMessage, Review
from backend.services.auth_service import hash_password

# Thread-safe/Loop-safe engine registry
_test_engine = None
_test_sessionmaker = None
_current_loop = None


def get_test_sessionmaker():
    """Retrieve or initialize the test sessionmaker, recreating it if the event loop changes."""
    global _test_engine, _test_sessionmaker, _current_loop
    loop = asyncio.get_running_loop()
    
    if _test_engine is None or _current_loop is not loop:
        # Recreate engine for the new event loop
        _test_engine = create_async_engine(settings.DATABASE_URL, echo=False)
        _test_sessionmaker = async_sessionmaker(
            _test_engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        _current_loop = loop
        
    return _test_sessionmaker


async def get_test_engine():
    """Retrieve the active test engine bound to the current event loop."""
    get_test_sessionmaker()
    return _test_engine


# Override get_db to yield test sessions
async def override_get_db():
    sessionmaker = get_test_sessionmaker()
    async with sessionmaker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@pytest_asyncio.fixture(scope="session", autouse=True)
async def initialize_test_db():
    """Wipe and recreate database tables once for the test session."""
    # Build a temporary engine to run DDL operations
    temp_engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with temp_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with temp_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await temp_engine.dispose()


@pytest_asyncio.fixture(autouse=True)
async def clean_database():
    """Clear database records before each test for isolation, and seed default test users/books."""
    sessionmaker = get_test_sessionmaker()
    async with sessionmaker() as db:
        # Delete all records
        await db.execute(Review.__table__.delete())
        await db.execute(Loan.__table__.delete())
        await db.execute(ChatMessage.__table__.delete())
        await db.execute(Book.__table__.delete())
        await db.execute(User.__table__.delete())
        await db.commit()
        
        # Seed test users
        admin = User(
            username="testadmin",
            email="admin@test.com",
            full_name="Test Admin",
            hashed_password=hash_password("adminpw"),
            role=UserRole.ADMIN,
            is_active=True
        )
        member = User(
            username="testmember",
            email="member@test.com",
            full_name="Test Member",
            hashed_password=hash_password("memberpw"),
            role=UserRole.MEMBER,
            is_active=True
        )
        
        # Seed test books
        book_active = Book(
            title="Active Book",
            author="Active Author",
            isbn="123-456",
            category="Fiction",
            total_copies=2,
            available_copies=2
        )
        book_out_of_stock = Book(
            title="Out Of Stock Book",
            author="OOS Author",
            isbn="789-012",
            category="Science",
            total_copies=1,
            available_copies=0
        )
        
        db.add_all([admin, member, book_active, book_out_of_stock])
        await db.commit()


@pytest_asyncio.fixture
async def client():
    """Async test client for the FastAPI app with database overrides."""
    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
    
    # Dispose of the engine associated with the completed loop
    global _test_engine
    if _test_engine is not None:
        await _test_engine.dispose()
