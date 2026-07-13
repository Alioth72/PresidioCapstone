"""
Database utility functions — atomic availability management and loan counting.

These helpers ensure data integrity for concurrent borrow/return operations.
"""

from sqlalchemy import update, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import Book, Loan


async def check_book_availability(db: AsyncSession, book_id: int) -> bool:
    """Check if a book has copies available for borrowing."""
    result = await db.execute(
        select(Book.available_copies).where(Book.id == book_id)
    )
    copies = result.scalar_one_or_none()
    if copies is None:
        return False
    return copies > 0


async def decrement_availability(db: AsyncSession, book_id: int) -> bool:
    """
    Atomically decrement available_copies by 1.

    Uses UPDATE ... WHERE available_copies > 0 to prevent over-borrowing.
    Returns True if a row was updated (book was available), False if out of stock.
    Two concurrent borrows on the last copy cannot both succeed.
    """
    result = await db.execute(
        update(Book)
        .where(Book.id == book_id, Book.available_copies > 0)
        .values(available_copies=Book.available_copies - 1)
    )
    return result.rowcount > 0


async def increment_availability(db: AsyncSession, book_id: int) -> bool:
    """
    Atomically increment available_copies by 1, capped at total_copies.

    Returns True if a row was updated, False if book not found or already at max.
    """
    result = await db.execute(
        update(Book)
        .where(Book.id == book_id, Book.available_copies < Book.total_copies)
        .values(available_copies=Book.available_copies + 1)
    )
    return result.rowcount > 0


async def count_active_loans(db: AsyncSession, user_id: int) -> int:
    """Count the number of active (non-returned) loans for a user."""
    result = await db.execute(
        select(func.count(Loan.id)).where(
            Loan.user_id == user_id,
            Loan.is_active == True,  # noqa: E712 — SQLAlchemy requires == for column comparison
        )
    )
    return result.scalar_one()
