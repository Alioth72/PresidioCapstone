"""
Book catalog routes — CRUD for books (Admin) and search/list (all logged-in users).
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.session import get_db
from backend.db.models import User, Review
from backend.schemas import BookCreate, BookUpdate, BookResponse, PaginatedResponse, ReviewCreate, ReviewResponse
from backend.services.auth_service import require_admin, get_current_user
from backend.services import book_service

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[BookResponse])
async def list_books(
    search: Optional[str] = Query(None, description="Search by title, author, isbn, description, publisher"),
    category: Optional[str] = Query(None, description="Filter by category"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("title", description="Sort by field"),
    order: str = Query("asc", description="Sort order: asc or desc"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Enforce logged in
):
    """List all books with optional search, filtering, and sorting."""
    return await book_service.list_books(
        db=db,
        search=search,
        category=category,
        page=page,
        limit=limit,
        sort_by=sort_by,
        order=order
    )


@router.get("/{book_id}", response_model=BookResponse)
async def get_book(
    book_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Enforce logged in
):
    """Get a single book by ID."""
    book = await book_service.get_book(db, book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found."
        )
    return book


@router.post("/", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
async def create_book(
    book_data: BookCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin)  # Admin only
):
    """Add a new book to the catalog. (Admin only)"""
    try:
        return await book_service.create_book(db, book_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{book_id}", response_model=BookResponse)
async def update_book(
    book_id: int,
    book_data: BookUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin)  # Admin only
):
    """Update an existing book. (Admin only)"""
    try:
        book = await book_service.update_book(db, book_id, book_data)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found."
            )
        return book
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(
    book_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin)  # Admin only
):
    """Remove a book from the catalog. (Admin only)"""
    try:
        success = await book_service.delete_book(db, book_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found."
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    return None


@router.get("/{book_id}/reviews", response_model=list[ReviewResponse])
async def get_book_reviews(
    book_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all reviews for a specific book."""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    
    # Check if book exists
    book = await book_service.get_book(db, book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found."
        )
        
    stmt = (
        select(Review)
        .options(selectinload(Review.user))
        .where(Review.book_id == book_id)
        .order_by(Review.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("/{book_id}/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_book_review(
    book_id: int,
    payload: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a review and rating for a book. Each user is limited to one review per book."""
    from sqlalchemy import select
    
    # Check if book exists
    book = await book_service.get_book(db, book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found."
        )
        
    # Check if user already reviewed this book
    dup_stmt = select(Review).where(Review.book_id == book_id, Review.user_id == current_user.id)
    dup_res = await db.execute(dup_stmt)
    if dup_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this book."
        )
        
    new_review = Review(
        user_id=current_user.id,
        book_id=book_id,
        rating=payload.rating,
        comment=payload.comment
    )
    
    db.add(new_review)
    await db.commit()
    await db.refresh(new_review)
    return new_review

