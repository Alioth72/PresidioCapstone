"""
Book catalog routes — CRUD for books (Admin) and search/list (all users).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.session import get_db

router = APIRouter()


@router.get("/")
async def list_books(db: AsyncSession = Depends(get_db)):
    """List all books with optional search/filter."""
    # TODO: Implement book listing with pagination and search
    pass


@router.get("/{book_id}")
async def get_book(book_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single book by ID."""
    # TODO: Implement single book retrieval
    pass


@router.post("/")
async def create_book(db: AsyncSession = Depends(get_db)):
    """Add a new book to the catalog. (Admin only)"""
    # TODO: Implement book creation with admin auth check
    pass


@router.put("/{book_id}")
async def update_book(book_id: int, db: AsyncSession = Depends(get_db)):
    """Update an existing book. (Admin only)"""
    # TODO: Implement book update with admin auth check
    pass


@router.delete("/{book_id}")
async def delete_book(book_id: int, db: AsyncSession = Depends(get_db)):
    """Remove a book from the catalog. (Admin only)"""
    # TODO: Implement book deletion with admin auth check
    pass
