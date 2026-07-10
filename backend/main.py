"""
FastAPI Main Application — Entry point with CORS, lifespan, and router registration.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.db.session import init_db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and resources on startup."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    )
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database ready.")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Library Management System",
    description="Library catalog, borrowing, and AI assistant API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Register Routers ───
from backend.routes.auth import router as auth_router
from backend.routes.books import router as books_router
from backend.routes.loans import router as loans_router
from backend.routes.chat import router as chat_router

app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(books_router, prefix="/api/books", tags=["Books"])
app.include_router(loans_router, prefix="/api/loans", tags=["Loans"])
app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])


@app.get("/")
async def root():
    return {
        "service": "Library Management System",
        "status": "running",
        "docs": "/docs",
    }
