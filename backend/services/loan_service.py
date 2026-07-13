"""
Loan service — borrowing, returning, and admin loan management.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.config import settings
from backend.db.models import Loan, Book, User
from backend.db.utils import decrement_availability, increment_availability, count_active_loans


async def borrow_book(db: AsyncSession, user_id: int, book_id: int) -> Loan:
    """
    Borrow a book.
    Ensures:
      1. Member doesn't exceed MAX_ACTIVE_LOANS.
      2. Book is available (atomic decrement succeeds).
      3. New Loan is created in the same transaction.
    """
    # 1. Enforce max active loans
    active_count = await count_active_loans(db, user_id)
    if active_count >= settings.MAX_ACTIVE_LOANS:
        raise ValueError(
            f"Borrow limit reached. You cannot have more than {settings.MAX_ACTIVE_LOANS} active loans."
        )

    # 2. Verify book exists
    result = await db.execute(select(Book).where(Book.id == book_id))
    book = result.scalar_one_or_none()
    if not book:
        raise ValueError("Book not found.")

    # 3. Atomically decrement availability
    success = await decrement_availability(db, book_id)
    if not success:
        raise ValueError("This book is currently out of stock.")

    # 4. Create Loan record
    borrowed_at = datetime.now(timezone.utc)
    due_date = borrowed_at + timedelta(days=settings.DEFAULT_LOAN_DAYS)
    
    new_loan = Loan(
        user_id=user_id,
        book_id=book_id,
        borrowed_at=borrowed_at,
        due_date=due_date,
        is_active=True
    )
    db.add(new_loan)
    await db.commit()
    await db.refresh(new_loan)
    return new_loan


async def return_book(db: AsyncSession, user_id: int, loan_id: int, is_admin: bool = False) -> Loan:
    """
    Return a borrowed book.
    Ensures:
      1. Loan exists and is active.
      2. Loan belongs to the user (unless returned by an Admin).
      3. Loan is marked inactive, returned_at set.
      4. Book availability is incremented.
    """
    # Get loan
    result = await db.execute(select(Loan).where(Loan.id == loan_id))
    loan = result.scalar_one_or_none()
    
    if not loan:
        raise ValueError("Loan record not found.")
    if not loan.is_active:
        raise ValueError("This loan is already closed.")
        
    # Check permissions
    if not is_admin and loan.user_id != user_id:
        raise ValueError("Access denied. You cannot return someone else's book.")
        
    # Close loan
    loan.is_active = False
    loan.returned_at = datetime.now(timezone.utc)
    
    # Increment book availability
    await increment_availability(db, loan.book_id)
    
    await db.commit()
    await db.refresh(loan)
    return loan


async def get_user_loans(db: AsyncSession, user_id: int, active_only: bool = False) -> list[Loan]:
    """Retrieve loans for a specific user, with optional active filter."""
    stmt = select(Loan).where(Loan.user_id == user_id)
    if active_only:
        stmt = stmt.where(Loan.is_active == True)  # noqa: E712
    stmt = stmt.order_by(Loan.borrowed_at.desc()).options(selectinload(Loan.book))
    
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_all_loans(db: AsyncSession, active_only: bool = False) -> list[Loan]:
    """Admin only: retrieve all loans system-wide with nested book/user info."""
    stmt = select(Loan)
    if active_only:
        stmt = stmt.where(Loan.is_active == True)  # noqa: E712
    stmt = stmt.order_by(Loan.borrowed_at.desc()).options(
        selectinload(Loan.book),
        selectinload(Loan.user)
    )
    
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_overdue_loans(db: AsyncSession, user_id: Optional[int] = None) -> list[Loan]:
    """
    Retrieve active overdue loans.
    If user_id is provided, returns user's own overdue loans.
    Otherwise, returns system-wide overdue loans (Admin view).
    """
    now = datetime.now(timezone.utc)
    stmt = select(Loan).where(
        and_(
            Loan.is_active == True,  # noqa: E712
            Loan.due_date < now
        )
    )
    if user_id is not None:
        stmt = stmt.where(Loan.user_id == user_id)
        
    stmt = stmt.order_by(Loan.due_date.asc()).options(
        selectinload(Loan.book),
        selectinload(Loan.user)
    )
    
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def close_loan(db: AsyncSession, loan_id: int, notes: Optional[str] = None) -> Loan:
    """
    Admin only: force-close an active loan (e.g. if a book is lost or damaged).
    Decrements book total_copies if lost (optional depending on notes).
    """
    result = await db.execute(select(Loan).where(Loan.id == loan_id))
    loan = result.scalar_one_or_none()
    
    if not loan:
        raise ValueError("Loan record not found.")
    if not loan.is_active:
        raise ValueError("This loan is already closed.")
        
    # Close loan
    loan.is_active = False
    loan.returned_at = datetime.now(timezone.utc)
    loan.notes = notes
    
    # Check if book is lost/damaged, otherwise increment availability
    if notes and ("lost" in notes.lower() or "damaged" in notes.lower()):
        # Reduce total count because the book is permanently gone
        result_book = await db.execute(select(Book).where(Book.id == loan.book_id))
        book = result_book.scalar_one_or_none()
        if book:
            book.total_copies = max(0, book.total_copies - 1)
    else:
        # Standard return
        await increment_availability(db, loan.book_id)
        
    await db.commit()
    await db.refresh(loan)
    return loan
