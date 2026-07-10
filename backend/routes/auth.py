"""
Auth routes — signup, login, current-user.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.session import get_db

router = APIRouter()


@router.post("/signup")
async def signup(db: AsyncSession = Depends(get_db)):
    """Register a new user."""
    # TODO: Implement user registration
    pass


@router.post("/login")
async def login(db: AsyncSession = Depends(get_db)):
    """Authenticate and return JWT token."""
    # TODO: Implement login with JWT generation
    pass


@router.get("/me")
async def get_current_user():
    """Return the currently authenticated user."""
    # TODO: Implement JWT-based current user lookup
    pass
