"""
Book service — catalog CRUD and search logic.
"""

from typing import Optional
from sqlalchemy import select, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import Book
from backend.schemas import BookCreate, BookUpdate


async def list_books(
    db: AsyncSession,
    search: Optional[str] = None,
    category: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    sort_by: str = "title",
    order: str = "asc"
) -> dict:
    """
    List books with pagination, filtering, and sorting.
    Returns a dict compatible with PaginatedResponse schema.
    """
    offset = (page - 1) * limit
    
    # Base query
    query = select(Book)
    
    # Filtering
    if category:
        query = query.where(Book.category == category)
        
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            or_(
                Book.title.ilike(search_filter),
                Book.author.ilike(search_filter),
                Book.isbn.ilike(search_filter),
                Book.description.ilike(search_filter),
                Book.publisher.ilike(search_filter)
            )
        )
        
    # Count total items matching criteria
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Sorting
    if hasattr(Book, sort_by):
        col = getattr(Book, sort_by)
        if order.lower() == "desc":
            query = query.order_by(desc(col))
        else:
            query = query.order_by(col)
    else:
        query = query.order_by(Book.title)
        
    # Pagination
    query = query.offset(offset).limit(limit)
    
    # Execute
    result = await db.execute(query)
    items = result.scalars().all()
    
    pages = (total + limit - 1) // limit if total > 0 else 0
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": pages,
        "limit": limit
    }


async def get_book(db: AsyncSession, book_id: int) -> Optional[Book]:
    """Retrieve a single book by ID."""
    result = await db.execute(select(Book).where(Book.id == book_id))
    return result.scalar_one_or_none()


async def create_book(db: AsyncSession, data: BookCreate) -> Book:
    """Create a new book."""
    # Ensure isbn unique check if provided
    if data.isbn:
        existing = await db.execute(select(Book).where(Book.isbn == data.isbn))
        if existing.scalar_one_or_none():
            raise ValueError(f"Book with ISBN '{data.isbn}' already exists.")
            
    new_book = Book(
        title=data.title,
        author=data.author,
        isbn=data.isbn,
        description=data.description,
        category=data.category,
        publisher=data.publisher,
        publication_year=data.publication_year,
        total_copies=data.total_copies,
        available_copies=data.total_copies,  # Initially same
    )
    db.add(new_book)
    await db.commit()
    await db.refresh(new_book)
    return new_book


async def update_book(db: AsyncSession, book_id: int, data: BookUpdate) -> Optional[Book]:
    """Update a book's attributes. Re-calculates available_copies if total_copies changes."""
    book = await get_book(db, book_id)
    if not book:
        return None
        
    update_data = data.model_dump(exclude_unset=True)
    
    # If total_copies is changing, adjust available_copies accordingly
    if "total_copies" in update_data:
        diff = update_data["total_copies"] - book.total_copies
        new_available = book.available_copies + diff
        if new_available < 0:
            raise ValueError(
                "Cannot reduce total copies below the number of currently borrowed copies."
            )
        book.available_copies = new_available
        
    for key, value in update_data.items():
        setattr(book, key, value)
        
    await db.commit()
    await db.refresh(book)
    return book


async def delete_book(db: AsyncSession, book_id: int) -> bool:
    """Delete a book from the catalog."""
    book = await get_book(db, book_id)
    if not book:
        return False
        
    # Check if there are active loans
    from backend.db.models import Loan
    loans_stmt = select(func.count()).select_from(Loan).where(
        Loan.book_id == book_id,
        Loan.is_active == True  # noqa: E712
    )
    active_loans_res = await db.execute(loans_stmt)
    active_loans = active_loans_res.scalar() or 0
    
    if active_loans > 0:
        raise ValueError("Cannot delete a book that currently has active loans.")
        
    await db.delete(book)
    await db.commit()
    return True


async def search_books(db: AsyncSession, query: str) -> list[Book]:
    """
    Search books based on plain-text matching (fuzzy/semantic lookup support for AI).
    Performs standard ILIKE across title, author, category, description.
    """
    search_filter = f"%{query}%"
    stmt = select(Book).where(
        or_(
            Book.title.ilike(search_filter),
            Book.author.ilike(search_filter),
            Book.category.ilike(search_filter),
            Book.description.ilike(search_filter)
        )
    ).limit(10)  # Cap search results for assistant
    
    result = await db.execute(stmt)
    return list(result.scalars().all())
