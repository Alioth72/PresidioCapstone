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

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./library.db"

    # Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # Server
    BACKEND_PORT: int = 8000
    FRONTEND_PORT: int = 5173

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
