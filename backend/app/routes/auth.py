"""Authentication routes for user registration and login."""
import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from google.oauth2 import id_token
from google.auth.transport import requests

from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse
from app.utils.auth import get_password_hash, verify_password, create_access_token, get_current_user
from app.config import settings
from app.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Register a new user with email and password.

    Returns a JWT access token upon successful registration.
    """
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        logger.warning("registration_failed", email=user_data.email, reason="email_already_exists")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        auth_provider="local",
        created_at=int(time.time() * 1000),
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    logger.info("user_registered", user_id=new_user.id, email=new_user.email, provider="local")

    # Create access token
    access_token = create_access_token(data={"user_id": new_user.id, "email": new_user.email})

    return Token(access_token=access_token)


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Login with email and password.

    Returns a JWT access token upon successful authentication.
    """
    # Find user by email
    result = await db.execute(select(User).where(User.email == user_data.email))
    user = result.scalar_one_or_none()

    if not user or user.auth_provider != "local":
        logger.warning("login_failed", email=user_data.email, reason="user_not_found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Verify password
    if not verify_password(user_data.password, user.hashed_password):
        logger.warning("login_failed", email=user_data.email, reason="invalid_password")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    logger.info("user_logged_in", user_id=user.id, email=user.email, provider="local")

    # Create access token
    access_token = create_access_token(data={"user_id": user.id, "email": user.email})

    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current user information from JWT token.

    Requires valid authentication.
    """
    return current_user


@router.get("/google/login")
async def google_login():
    """
    Initiate Google OAuth2 login flow.

    Returns the Google authorization URL that the frontend should redirect to.

    TODO: Implement full Google OAuth2 flow with state parameter for CSRF protection.
    """
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )

    # Google OAuth2 authorization URL
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.google_client_id}&"
        f"redirect_uri={settings.google_redirect_uri}&"
        f"response_type=code&"
        f"scope=openid email profile&"
        f"access_type=offline"
    )

    return {"auth_url": auth_url}


@router.get("/google/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    """
    Handle Google OAuth2 callback.

    Exchanges the authorization code for user info, creates or retrieves the user,
    and returns a JWT access token.

    TODO: Implement token exchange and user info retrieval using google-auth library.
    This is a stub that needs to be completed with actual Google OAuth2 flow.
    """
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured",
        )

    # TODO: Exchange authorization code for access token
    # TODO: Retrieve user info from Google
    # TODO: Create or get user from database
    # TODO: Return JWT access token

    logger.warning("google_oauth_stub", message="Google OAuth callback not fully implemented")

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Google OAuth callback not yet implemented. This is a stub for future implementation.",
    )
