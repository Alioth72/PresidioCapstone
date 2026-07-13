"""
SQLAlchemy ORM Models — User, Book, Loan, ChatMessage.

Index justifications:
  - users.username  → login lookup on every authentication
  - users.email     → unique constraint + signup duplicate check
  - books.title     → catalog search: WHERE title ILIKE '%query%'
  - books.author    → author search/filter in UI and AI assistant
  - books.category  → category-based filtering on catalog page
  - loans.user_id   → "my loans" query on every member page load
  - loans.is_active → admin "all active loans" view + overdue filtering
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Enum, ForeignKey, Text, Boolean, JSON, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.types import DateTime as _DateTime

# Use timezone-aware timestamps for PostgreSQL (TIMESTAMPTZ)
DateTime = _DateTime(timezone=True)

from backend.db.session import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MEMBER = "member"


class ChatRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.MEMBER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    loans = relationship("Loan", back_populates="user")
    chat_messages = relationship("ChatMessage", back_populates="user")


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    author = Column(String(150), nullable=False, index=True)
    isbn = Column(String(20), unique=True, nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True, index=True)
    publisher = Column(String(150), nullable=True)
    publication_year = Column(Integer, nullable=True)
    total_copies = Column(Integer, default=1, nullable=False)
    available_copies = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    loans = relationship("Loan", back_populates="book")


class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False, index=True)
    borrowed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    due_date = Column(DateTime, nullable=False)
    returned_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="loans")
    book = relationship("Book", back_populates="loans")

    @property
    def book_title(self) -> str:
        return self.book.title if self.book else ""

    @property
    def book_author(self) -> str:
        return self.book.author if self.book else ""

    @property
    def username(self) -> str:
        return self.user.username if self.user else ""

    # Composite index: "all active loans for a user" — used on every member dashboard load
    __table_args__ = (
        Index("ix_loans_user_active", "user_id", "is_active"),
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(Enum(ChatRole), nullable=False)
    content = Column(Text, nullable=False)
    actions_taken = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="chat_messages")
