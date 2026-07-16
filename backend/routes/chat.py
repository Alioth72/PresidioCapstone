"""
Chat routes — AI assistant conversation endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from backend.db.session import get_db
from backend.db.models import User, ChatMessage, UserRole
from backend.schemas import ChatRequest, ChatResponse, ChatMessageResponse
from backend.services.auth_service import get_current_user
from backend.services.chat_service import ChatService

router = APIRouter()


@router.post("/", response_model=ChatResponse)
async def send_message(
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message to the AI assistant. (Member only)"""
    if current_user.role != UserRole.MEMBER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only library members can use the AI assistant."
        )
    
    chat_svc = ChatService(db, current_user.id)
    return await chat_svc.process_message(payload.message)


@router.get("/history", response_model=list[ChatMessageResponse])
async def get_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve the member's chat conversation logs."""
    if current_user.role != UserRole.MEMBER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only library members can access chat history."
        )
    
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.asc())
    )
    return result.scalars().all()


@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
async def clear_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clear all chat messages for the logged-in member."""
    if current_user.role != UserRole.MEMBER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only library members can clear chat history."
        )
    
    await db.execute(
        delete(ChatMessage).where(ChatMessage.user_id == current_user.id)
    )
    await db.commit()
