"""
FastAPI Main Application — Entry point with CORS, lifespan, middleware chain, and exception handlers.
"""

import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError, HTTPException

from backend.config import settings
from backend.db.session import init_db

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='{"time": "%(asctime)s", "name": "%(name)s", "level": "%(levelname)s", "message": "%(message)s"}',
)
logger = logging.getLogger("backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and resources on startup."""
    if settings.TESTING:
        yield
        return

    logger.info("Initializing database...")
    await init_db()
    logger.info("Database ready.")

    # Auto-seed if database is empty (no users present)
    from sqlalchemy import select, func
    from backend.db.session import async_session
    from backend.db.models import User
    
    async with async_session() as session:
        result = await session.execute(select(func.count(User.id)))
        user_count = result.scalar() or 0
        
    if user_count == 0:
        from backend.db.seed import seed
        logger.info("Database is empty — seeding default users and books...")
        await seed()

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


# ─── Global Request Logging Middleware ───

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Middleware to log request details and processing time."""
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    logger.info(
        f"request_method={request.method} "
        f"request_path={request.url.path} "
        f"response_status={response.status_code} "
        f"duration={duration:.4f}s"
    )
    return response


# ─── Centralized Error Handling ───

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle FastAPI HTTPEndpoint exceptions with a consistent response shape."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "HTTP_ERROR",
                "message": exc.detail,
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors (e.g. invalid query params, missing fields)."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters or body.",
                "details": exc.errors(),
            }
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Catch-all for unhandled server exceptions (HTTP 500)."""
    logger.error(f"unhandled_error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred on the server.",
            }
        },
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

# ─── Serve Frontend Static Files in Production ───
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = "/app/frontend/dist"
if os.path.exists(frontend_dist):
    # Mount assets folder
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # Serve other static files or fallback to index.html for client-side routing
    @app.get("/{catchall:path}")
    async def serve_frontend(catchall: str):
        if catchall.startswith("api") or catchall.startswith("docs") or catchall.startswith("openapi.json"):
            return JSONResponse(
                status_code=404,
                content={"error": {"code": "NOT_FOUND", "message": "API endpoint not found."}}
            )
        
        file_path = os.path.join(frontend_dist, catchall)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    async def root():
        return {
            "service": "Library Management System",
            "status": "running",
            "docs": "/docs",
        }

