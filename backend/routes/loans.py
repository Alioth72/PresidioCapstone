"""
Loan routes — borrow/return (Member) and loan oversight (Admin).
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.session import get_db
from backend.db.models import User, UserRole
from backend.schemas import LoanCreate, LoanResponse, LoanDetailResponse
from backend.services.auth_service import require_member, require_admin, require_any_role, get_current_user
from backend.services import loan_service

router = APIRouter()


@router.post("/borrow", response_model=LoanResponse, status_code=status.HTTP_201_CREATED)
async def borrow_book(
    payload: LoanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_member)  # Member only
):
    """Borrow a book. (Member only)"""
    try:
        return await loan_service.borrow_book(
            db=db,
            user_id=current_user.id,
            book_id=payload.book_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{loan_id}/return", response_model=LoanResponse)
async def return_book(
    loan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_any_role)  # Admin or Member
):
    """Return a borrowed book."""
    try:
        is_admin = current_user.role == UserRole.ADMIN
        return await loan_service.return_book(
            db=db,
            user_id=current_user.id,
            loan_id=loan_id,
            is_admin=is_admin
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/my", response_model=list[LoanDetailResponse])
async def my_loans(
    active_only: bool = Query(False, description="Filter to active loans only"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_member)  # Member only
):
    """List current user's loans."""
    return await loan_service.get_user_loans(
        db=db,
        user_id=current_user.id,
        active_only=active_only
    )


@router.get("/all", response_model=list[LoanDetailResponse])
async def all_loans(
    active_only: bool = Query(False, description="Filter to active loans only"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin)  # Admin only
):
    """List all loans system-wide. (Admin only)"""
    return await loan_service.get_all_loans(
        db=db,
        active_only=active_only
    )


@router.get("/overdue", response_model=list[LoanDetailResponse])
async def overdue_loans(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_any_role)  # Admin or Member
):
    """List active overdue loans. Admin sees all; members only see their own."""
    if current_user.role == UserRole.ADMIN:
        return await loan_service.get_overdue_loans(db=db, user_id=None)
    else:
        return await loan_service.get_overdue_loans(db=db, user_id=current_user.id)


@router.post("/{loan_id}/close", response_model=LoanResponse)
async def close_loan(
    loan_id: int,
    notes: Optional[str] = Query(None, description="Admin notes for closing (e.g. lost/damaged)"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin)  # Admin only
):
    """Manually force-close an active loan. (Admin only)"""
    try:
        return await loan_service.close_loan(
            db=db,
            loan_id=loan_id,
            notes=notes
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
