"""
Application configuration — loads from environment variables.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration loaded from .env file."""

    # App
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me-in-production"

    # JWT
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60

    # Database — Docker PostgreSQL (override in production with Azure PG)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/library"

    # Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # Library settings
    DEFAULT_LOAN_DAYS: int = 14
    MAX_ACTIVE_LOANS: int = 5

    # Server
    BACKEND_PORT: int = 8000
    FRONTEND_PORT: int = 5173

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
