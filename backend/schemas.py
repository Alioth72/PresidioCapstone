"""
Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from backend.db.models import UserRole


# ─── Auth Schemas ───

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., max_length=120)
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.MEMBER


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
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
    total_copies: int = Field(1, ge=1)


class BookUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    author: Optional[str] = Field(None, max_length=150)
    isbn: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    total_copies: Optional[int] = Field(None, ge=1)


class BookResponse(BaseModel):
    id: int
    title: str
    author: str
    isbn: Optional[str]
    description: Optional[str]
    category: Optional[str]
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

    class Config:
        from_attributes = True


class LoanDetailResponse(LoanResponse):
    """Loan with nested book and user info for admin views."""
    book: BookResponse
    user: UserResponse


# ─── Chat Schemas ───

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)


class ChatResponse(BaseModel):
    reply: str
    actions_taken: list[str] = []
