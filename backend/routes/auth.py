"""
Auth routes — signup, login, logout, and current-user check.
"""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from backend.db.session import get_db
from backend.db.models import User
from backend.schemas import UserCreate, UserLogin, UserResponse, TokenResponse
from backend.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from backend.config import settings

router = APIRouter()


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user."""
    # Check if username or email already exists
    stmt = select(User).where(
        or_(User.username == user_data.username, User.email == user_data.email)
    )
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        if existing_user.username == user_data.username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered."
            )
            
    # Create new user
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hash_password(user_data.password),
        role=user_data.role,
        is_active=True
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return new_user


@router.post("/login", response_model=TokenResponse)
async def login(
    response: Response,
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate credentials, issue JWT, and set it in HttpOnly cookie."""
    # Lookup user
    stmt = select(User).where(User.username == credentials.username)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password."
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account has been deactivated."
        )
        
    # Generate token
    expires_delta = timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    token = create_access_token(
        subject=user.username,
        role=user.role.value,
        expires_delta=expires_delta
    )
    
    # Set HttpOnly cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=settings.JWT_EXPIRATION_MINUTES * 60,
        expires=settings.JWT_EXPIRATION_MINUTES * 60,
        samesite="lax",
        secure=(settings.APP_ENV == "production"),
    )
    
    return {"access_token": token, "user": user}


@router.post("/logout")
async def logout(response: Response):
    """Log out the current user by clearing the access token cookie."""
    response.delete_cookie(key="access_token")
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently logged in user info."""
    return current_user
