"""
Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional, Generic, TypeVar

from pydantic import BaseModel, Field

from backend.db.models import UserRole


# ─── Generic Pagination ───

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated list response wrapper."""
    items: list[T]
    total: int
    page: int
    pages: int
    limit: int


# ─── Auth Schemas ───

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., max_length=120)
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = Field(None, max_length=100)
    role: UserRole = UserRole.MEMBER


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ─── Book Schemas ───

class BookCreate(BaseModel):
    title: str = Field(..., max_length=200)
    author: str = Field(..., max_length=150)
    isbn: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    publisher: Optional[str] = Field(None, max_length=150)
    publication_year: Optional[int] = Field(None, ge=1000, le=2100)
    total_copies: int = Field(1, ge=1)


class BookUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    author: Optional[str] = Field(None, max_length=150)
    isbn: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    publisher: Optional[str] = Field(None, max_length=150)
    publication_year: Optional[int] = Field(None, ge=1000, le=2100)
    total_copies: Optional[int] = Field(None, ge=1)


class BookResponse(BaseModel):
    id: int
    title: str
    author: str
    isbn: Optional[str]
    description: Optional[str]
    category: Optional[str]
    publisher: Optional[str]
    publication_year: Optional[int]
    total_copies: int
    available_copies: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Loan Schemas ───

class LoanCreate(BaseModel):
    book_id: int


class LoanResponse(BaseModel):
    id: int
    user_id: int
    book_id: int
    borrowed_at: datetime
    due_date: datetime
    returned_at: Optional[datetime]
    is_active: bool
    notes: Optional[str]

    class Config:
        from_attributes = True


class LoanDetailResponse(LoanResponse):
    """Loan with nested book and user info for admin views."""
    book_title: str
    book_author: str
    username: str

    class Config:
        from_attributes = True


# ─── Chat Schemas ───

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)


class ChatResponse(BaseModel):
    reply: str
    actions_taken: list[str] = []


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    actions_taken: list[str]
    created_at: datetime

    class Config:
        from_attributes = True
