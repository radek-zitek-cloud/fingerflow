"""
Complete Authentication Routes with Production Features

Includes:
- Registration with email verification
- Login with 2FA support
- Refresh token management
- Email verification
- Session management
"""
import time
from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.models.user import User
from app.models.token import EmailVerificationToken, RefreshToken
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse
from app.utils.auth import get_password_hash, verify_password, create_access_token, get_current_user
from app.config import settings
from app.logging_config import get_logger
from app.services.email import email_service

router = APIRouter()
logger = get_logger(__name__)


# Extended schemas for production features
class TokenWithRefresh(BaseModel):
    """Token response with refresh token."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    requires_2fa: bool = False
    temp_token: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    """Request to refresh access token."""
    refresh_token: str


class EmailVerificationRequest(BaseModel):
    """Request to verify email."""
    token: str


class ResendVerificationRequest(BaseModel):
    """Request to resend verification email."""
    email: EmailStr


class TwoFactorVerifyRequest(BaseModel):
    """Request to verify 2FA code during login."""
    temp_token: str
    code: str


class SessionInfo(BaseModel):
    """Active session information."""
    id: int
    device_info: Optional[str]
    created_at: int
    expires_at: int
    is_current: bool


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Register a new user with email and password.

    Sends email verification link and returns tokens.
    """
    # Check if user already exists
    result = db.execute(select(User).where(User.email == user_data.email))
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
        email_verified=False,  # Require email verification
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info("user_registered", user_id=new_user.id, email=new_user.email)

    # Create email verification token
    verification_token = EmailVerificationToken(
        user_id=new_user.id,
        token=EmailVerificationToken.generate_token(),
        created_at=int(time.time() * 1000),
        expires_at=int(time.time() * 1000) + (24 * 60 * 60 * 1000),  # 24 hours
    )
    db.add(verification_token)
    db.commit()

    # Send verification email (non-blocking - user can still register if email fails)
    email_sent = email_service.send_verification_email(new_user.email, verification_token.token)
    if not email_sent:
        logger.warning(
            "verification_email_failed",
            user_id=new_user.id,
            email=new_user.email,
            reason="Email service failed to send verification email"
        )

    # Create tokens
    access_token = create_access_token(
        data={"user_id": new_user.id, "email": new_user.email}
    )

    # Create refresh token
    refresh_token = RefreshToken(
        user_id=new_user.id,
        token=RefreshToken.generate_token(),
        created_at=int(time.time() * 1000),
        expires_at=int(time.time() * 1000) + (settings.refresh_token_expire_days * 24 * 60 * 60 * 1000),
        device_info=request.headers.get("user-agent", "Unknown")[:255],
    )
    db.add(refresh_token)
    db.commit()

    logger.info("tokens_created", user_id=new_user.id)

    response = TokenWithRefresh(
        access_token=access_token,
        refresh_token=refresh_token.token,
    )
    logger.info("registration_response_built", user_id=new_user.id)

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=response.model_dump(),
    )


@router.post("/login")
async def login(
    user_data: UserLogin,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Login with email and password.

    Returns tokens if successful.
    If 2FA is enabled, returns temp token for 2FA verification.
    """
    # Find user by email
    result = db.execute(select(User).where(User.email == user_data.email))
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

    # Check if 2FA is enabled
    if user.two_factor_enabled:
        # Create temporary token for 2FA verification (5 minute expiry)
        temp_token = create_access_token(
            data={"user_id": user.id, "email": user.email, "temp_2fa": True},
            expires_delta=timedelta(minutes=5)
        )

        logger.info("login_requires_2fa", user_id=user.id)

        return {
            "requires_2fa": True,
            "temp_token": temp_token,
            "message": "Please provide 2FA code"
        }

    # Standard login without 2FA
    logger.info("user_logged_in", user_id=user.id, email=user.email)

    # Create tokens
    access_token = create_access_token(
        data={"user_id": user.id, "email": user.email}
    )

    # Create refresh token
    refresh_token = RefreshToken(
        user_id=user.id,
        token=RefreshToken.generate_token(),
        created_at=int(time.time() * 1000),
        expires_at=int(time.time() * 1000) + (settings.refresh_token_expire_days * 24 * 60 * 60 * 1000),
        device_info=request.headers.get("user-agent", "Unknown")[:255],
    )
    db.add(refresh_token)
    db.commit()

    return TokenWithRefresh(
        access_token=access_token,
        refresh_token=refresh_token.token,
    )


@router.post("/2fa-verify", response_model=TokenWithRefresh)
async def verify_2fa(
    verify_data: TwoFactorVerifyRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Verify 2FA code during login.

    Accepts TOTP code or backup code.
    """
    from jose import jwt, JWTError
    from app.utils.two_factor import verify_2fa_code, verify_backup_code

    # Decode temp token
    try:
        payload = jwt.decode(
            verify_data.temp_token,
            settings.secret_key,
            algorithms=[settings.algorithm]
        )

        if not payload.get("temp_2fa"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

        user_id = payload.get("user_id")

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    # Get user
    result = db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA not enabled for this user"
        )

    # Verify code (try TOTP first, then backup codes)
    code_valid = False

    if len(verify_data.code) == 6 and verify_data.code.isdigit():
        # TOTP code
        code_valid = verify_2fa_code(user.two_factor_secret, verify_data.code)
    else:
        # Backup code
        if user.two_factor_backup_codes:
            code_valid, updated_codes = verify_backup_code(
                user.two_factor_backup_codes,
                verify_data.code
            )
            if code_valid:
                user.two_factor_backup_codes = updated_codes
                db.commit()

    if not code_valid:
        logger.warning("2fa_verification_failed", user_id=user.id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid 2FA code"
        )

    logger.info("2fa_verified", user_id=user.id)

    # Create tokens
    access_token = create_access_token(
        data={"user_id": user.id, "email": user.email}
    )

    # Create refresh token
    refresh_token = RefreshToken(
        user_id=user.id,
        token=RefreshToken.generate_token(),
        created_at=int(time.time() * 1000),
        expires_at=int(time.time() * 1000) + (settings.refresh_token_expire_days * 24 * 60 * 60 * 1000),
        device_info=request.headers.get("user-agent", "Unknown")[:255],
    )
    db.add(refresh_token)
    db.commit()

    return TokenWithRefresh(
        access_token=access_token,
        refresh_token=refresh_token.token,
    )


@router.post("/verify-email")
async def verify_email(
    verify_data: EmailVerificationRequest,
    db: Session = Depends(get_db)
):
    """Verify email address with token."""
    # Find token
    result = db.execute(
        select(EmailVerificationToken).where(
            EmailVerificationToken.token == verify_data.token
        )
    )
    token = result.scalar_one_or_none()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )

    if not token.is_valid():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired or been used"
        )

    # Get user
    result = db.execute(select(User).where(User.id == token.user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Mark email as verified
    user.email_verified = True
    user.email_verified_at = int(time.time() * 1000)
    token.used = True

    db.commit()

    logger.info("email_verified", user_id=user.id, email=user.email)

    return {
        "status": "success",
        "message": "Email verified successfully"
    }


@router.post("/resend-verification")
async def resend_verification(
    resend_data: ResendVerificationRequest,
    db: Session = Depends(get_db)
):
    """Resend email verification link."""
    # Find user
    result = db.execute(select(User).where(User.email == resend_data.email))
    user = result.scalar_one_or_none()

    # Always return success to prevent email enumeration
    if not user:
        logger.warning("resend_verification_user_not_found", email=resend_data.email)
        return {
            "status": "success",
            "message": "If an account exists, verification email has been sent"
        }

    if user.email_verified:
        logger.info("resend_verification_already_verified", user_id=user.id)
        return {
            "status": "success",
            "message": "Email already verified"
        }

    # Invalidate old tokens
    db.execute(
        delete(EmailVerificationToken).where(
            EmailVerificationToken.user_id == user.id,
            EmailVerificationToken.used == False
        )
    )

    # Create new token
    verification_token = EmailVerificationToken(
        user_id=user.id,
        token=EmailVerificationToken.generate_token(),
        created_at=int(time.time() * 1000),
        expires_at=int(time.time() * 1000) + (24 * 60 * 60 * 1000),
    )
    db.add(verification_token)
    db.commit()

    # Send email
    email_sent = email_service.send_verification_email(user.email, verification_token.token)
    if not email_sent:
        logger.warning(
            "verification_email_resend_failed",
            user_id=user.id,
            email=user.email,
            reason="Email service failed to send verification email"
        )

    logger.info("verification_email_resent", user_id=user.id, email_sent=email_sent)

    return {
        "status": "success",
        "message": "If an account exists, verification email has been sent"
    }


@router.post("/refresh", response_model=TokenWithRefresh)
async def refresh_access_token(
    refresh_data: RefreshTokenRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get new access token using refresh token."""
    # Find refresh token
    result = db.execute(
        select(RefreshToken).where(RefreshToken.token == refresh_data.refresh_token)
    )
    token = result.scalar_one_or_none()

    if not token or not token.is_valid():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    # Get user
    result = db.execute(select(User).where(User.id == token.user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Create new access token
    access_token = create_access_token(
        data={"user_id": user.id, "email": user.email}
    )

    # Create new refresh token (token rotation)
    old_token = token
    old_token.revoked = True

    new_refresh_token = RefreshToken(
        user_id=user.id,
        token=RefreshToken.generate_token(),
        created_at=int(time.time() * 1000),
        expires_at=int(time.time() * 1000) + (settings.refresh_token_expire_days * 24 * 60 * 60 * 1000),
        device_info=request.headers.get("user-agent", "Unknown")[:255],
    )
    db.add(new_refresh_token)
    db.commit()

    logger.info("tokens_refreshed", user_id=user.id)

    return TokenWithRefresh(
        access_token=access_token,
        refresh_token=new_refresh_token.token,
    )


@router.post("/revoke")
async def revoke_refresh_token(
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Revoke a refresh token (logout from specific device)."""
    # Find and revoke token
    result = db.execute(
        select(RefreshToken).where(RefreshToken.token == refresh_data.refresh_token)
    )
    token = result.scalar_one_or_none()

    if token:
        token.revoked = True
        db.commit()
        logger.info("refresh_token_revoked", user_id=token.user_id)

    return {
        "status": "success",
        "message": "Token revoked"
    }


@router.get("/sessions", response_model=list[SessionInfo])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all active sessions (refresh tokens) for current user."""
    # Get all valid refresh tokens
    result = db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == current_user.id,
            RefreshToken.revoked == False
        ).order_by(RefreshToken.created_at.desc())
    )
    tokens = result.scalars().all()

    # Convert to session info
    sessions = [
        SessionInfo(
            id=token.id,
            device_info=token.device_info,
            created_at=token.created_at,
            expires_at=token.expires_at,
            is_current=False  # Would need to compare with current token
        )
        for token in tokens
        if not token.is_expired()
    ]

    return sessions


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information from JWT token."""
    return current_user


# ============================================================================
# Google OAuth2 Authentication
# ============================================================================

@router.get("/google/login")
async def google_login():
    """
    Initiate Google OAuth2 login flow.

    Returns authorization URL that frontend should redirect to.
    """
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env"
        )

    from urllib.parse import urlencode

    # Google OAuth2 authorization URL
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth"

    # OAuth2 parameters
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }

    authorization_url = f"{auth_url}?{urlencode(params)}"

    logger.info("google_oauth_initiated")

    return {
        "authorization_url": authorization_url
    }


@router.get("/google/callback")
async def google_callback(
    code: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handle Google OAuth2 callback.

    Exchanges authorization code for tokens, retrieves user info,
    creates or updates user, and returns JWT tokens.
    """
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured"
        )

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        import requests

        # Exchange code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.google_redirect_uri,
            "grant_type": "authorization_code",
        }

        token_response = requests.post(token_url, data=token_data)

        if token_response.status_code != 200:
            logger.error(
                "google_token_exchange_failed",
                status_code=token_response.status_code,
                error=token_response.text
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange authorization code for tokens"
            )

        tokens = token_response.json()
        id_token_jwt = tokens.get("id_token")

        # Verify and decode ID token
        try:
            user_info = id_token.verify_oauth2_token(
                id_token_jwt,
                google_requests.Request(),
                settings.google_client_id
            )
        except Exception as e:
            logger.error("google_token_verification_failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to verify Google ID token"
            )

        # Extract user information
        google_id = user_info.get("sub")
        email = user_info.get("email")
        email_verified = user_info.get("email_verified", False)

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not provided by Google"
            )

        # Find or create user
        result = db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user:
            # Existing user - update if needed
            if user.auth_provider != "google":
                logger.warning(
                    "google_oauth_existing_local_user",
                    email=email,
                    existing_provider=user.auth_provider
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"An account with this email already exists using {user.auth_provider} authentication"
                )

            # Update email verification status
            if email_verified and not user.email_verified:
                user.email_verified = True
                user.email_verified_at = int(time.time() * 1000)

            logger.info("google_oauth_existing_user", user_id=user.id, email=email)
        else:
            # Create new user
            user = User(
                email=email,
                auth_provider="google",
                created_at=int(time.time() * 1000),
                email_verified=email_verified,
                email_verified_at=int(time.time() * 1000) if email_verified else None,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            logger.info("google_oauth_new_user", user_id=user.id, email=email)

        # Create JWT tokens
        access_token = create_access_token(
            data={"user_id": user.id, "email": user.email}
        )

        # Create refresh token
        refresh_token = RefreshToken(
            user_id=user.id,
            token=RefreshToken.generate_token(),
            created_at=int(time.time() * 1000),
            expires_at=int(time.time() * 1000) + (settings.refresh_token_expire_days * 24 * 60 * 60 * 1000),
            device_info=request.headers.get("user-agent", "Unknown")[:255],
        )
        db.add(refresh_token)
        db.commit()

        # Redirect to frontend with tokens in URL hash (more secure than query params)
        # Hash fragments are not sent to server, only accessible client-side
        frontend_url = f"{settings.frontend_url}/#access_token={access_token}&refresh_token={refresh_token.token}&token_type=bearer"

        logger.info("google_oauth_success", user_id=user.id, redirecting_to=settings.frontend_url)

        return RedirectResponse(url=frontend_url, status_code=302)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("google_oauth_callback_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth authentication failed"
        )
