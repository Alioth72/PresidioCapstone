"""
Chat routes — AI assistant conversation endpoint.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.session import get_db

router = APIRouter()


@router.post("/")
async def chat(db: AsyncSession = Depends(get_db)):
    """Send a message to the AI assistant. (Member only)"""
    # TODO: Implement conversational AI with Gemini function calling
    pass


@router.delete("/history")
async def clear_history():
    """Clear the current user's chat history."""
    # TODO: Implement chat history clear
    pass
