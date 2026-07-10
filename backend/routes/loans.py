"""
Loan routes — borrow/return (Member) and loan oversight (Admin).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.session import get_db

router = APIRouter()


@router.post("/borrow")
async def borrow_book(db: AsyncSession = Depends(get_db)):
    """Borrow a book. (Member only)"""
    # TODO: Implement borrowing with availability check
    pass


@router.post("/{loan_id}/return")
async def return_book(loan_id: int, db: AsyncSession = Depends(get_db)):
    """Return a borrowed book. (Member only)"""
    # TODO: Implement book return and availability update
    pass


@router.get("/my")
async def my_loans(db: AsyncSession = Depends(get_db)):
    """List current user's loans. (Member)"""
    # TODO: Implement member loan history
    pass


@router.get("/all")
async def all_loans(db: AsyncSession = Depends(get_db)):
    """List all active loans system-wide. (Admin only)"""
    # TODO: Implement admin loan overview
    pass


@router.get("/overdue")
async def overdue_loans(db: AsyncSession = Depends(get_db)):
    """List overdue loans. Admin sees all; members see their own."""
    # TODO: Implement overdue loan filtering
    pass


@router.post("/{loan_id}/close")
async def close_loan(loan_id: int, db: AsyncSession = Depends(get_db)):
    """Manually close a loan. (Admin only)"""
    # TODO: Implement admin loan closure
    pass
