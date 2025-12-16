"""User profile and password management routes."""
import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from pydantic import BaseModel, EmailStr
from typing import Dict, Any, Optional

from app.database import get_db
from app.models.user import User
from app.models.token import PasswordResetToken
from app.utils.auth import get_current_user, verify_password, get_password_hash
from app.services.email import email_service
from app.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)


class ProfileUpdate(BaseModel):
    """Schema for updating user profile."""
    email: EmailStr
    settings: Optional[Dict[str, Any]] = None


class PasswordChange(BaseModel):
    """Schema for changing password."""
    current_password: str
    new_password: str


class PasswordResetRequest(BaseModel):
    """Schema for password reset request."""
    email: EmailStr


class PasswordReset(BaseModel):
    """Schema for resetting password with token."""
    token: str
    new_password: str


@router.patch("/profile")
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update user profile information.

    Currently supports email updates only.
    """
    # Check if email is already taken by another user
    from sqlalchemy import select
    result = db.execute(
        select(User).where(
            User.email == profile_data.email,
            User.id != current_user.id
        )
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        logger.warning(
            "profile_update_failed",
            user_id=current_user.id,
            reason="email_already_exists",
            attempted_email=profile_data.email
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already in use",
        )

    # Update email
    current_user.email = profile_data.email

    # Update settings if provided
    if profile_data.settings is not None:
        current_user.settings = profile_data.settings

    db.commit()
    db.refresh(current_user)

    logger.info(
        "profile_updated",
        user_id=current_user.id,
        new_email=profile_data.email,
        settings_updated=profile_data.settings is not None
    )

    return {
        "status": "success",
        "message": "Profile updated successfully",
        "email": current_user.email,
        "settings": current_user.settings,
    }


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Change user password.

    Requires current password for verification.
    Only available for local auth users (not OAuth).
    """
    # Check if user uses local authentication
    if current_user.auth_provider != "local":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password change is not available for OAuth accounts",
        )

    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        logger.warning(
            "password_change_failed",
            user_id=current_user.id,
            reason="invalid_current_password"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    # Update password
    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()

    logger.info(
        "password_changed",
        user_id=current_user.id,
        email=current_user.email
    )

    return {
        "status": "success",
        "message": "Password changed successfully",
    }


@router.post("/forgot-password")
async def forgot_password(
    reset_data: PasswordResetRequest,
    db: Session = Depends(get_db),
):
    """
    Request a password reset.

    Generates a secure token and sends reset email.
    Always returns success to prevent email enumeration.
    """
    # Find user by email
    result = db.execute(select(User).where(User.email == reset_data.email))
    user = result.scalar_one_or_none()

    # Always return success to prevent email enumeration attacks
    if not user:
        logger.warning("password_reset_user_not_found", email=reset_data.email)
        return {
            "status": "success",
            "message": "If an account exists with this email, you will receive password reset instructions",
        }

    # Only allow password reset for local auth users
    if user.auth_provider != "local":
        logger.warning(
            "password_reset_oauth_user",
            user_id=user.id,
            auth_provider=user.auth_provider
        )
        # Still return success to prevent enumeration
        return {
            "status": "success",
            "message": "If an account exists with this email, you will receive password reset instructions",
        }

    # Invalidate any existing reset tokens for this user.
    # Delete all tokens (used or unused) so that only the most recent request remains valid.
    db.execute(
        delete(PasswordResetToken).where(PasswordResetToken.user_id == user.id)
    )
    db.commit()

    # Create new password reset token
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=PasswordResetToken.generate_token(),
        created_at=int(time.time() * 1000),
        expires_at=int(time.time() * 1000) + (60 * 60 * 1000),  # 1 hour
    )
    db.add(reset_token)
    db.commit()

    # Send password reset email
    email_sent = email_service.send_password_reset_email(user.email, reset_token.token)
    if not email_sent:
        logger.warning(
            "password_reset_email_failed",
            user_id=user.id,
            email=user.email,
            reason="Email service failed to send password reset email"
        )

    logger.info("password_reset_email_sent", user_id=user.id, email=user.email, email_sent=email_sent)

    return {
        "status": "success",
        "message": "If an account exists with this email, you will receive password reset instructions",
    }


@router.post("/reset-password")
async def reset_password(
    reset_data: PasswordReset,
    db: Session = Depends(get_db),
):
    """
    Reset password using a token.

    Validates token and updates user password.
    Token is single-use and expires after 1 hour.
    """
    # Find token
    result = db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token == reset_data.token)
    )
    token = result.scalar_one_or_none()

    if not token:
        logger.warning("password_reset_invalid_token", token=reset_data.token[:8])
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    # Validate token
    if not token.is_valid():
        logger.warning(
            "password_reset_token_expired",
            user_id=token.user_id,
            expired=token.is_expired(),
            used=token.used
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
    )

    # Get user
    result = db.execute(select(User).where(User.id == token.user_id))
    user = result.scalar_one_or_none()

    if not user:
        logger.error("password_reset_user_not_found", user_id=token.user_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Only allow password reset for local auth users
    if user.auth_provider != "local":
        logger.warning(
            "password_reset_oauth_attempt",
            user_id=user.id,
            auth_provider=user.auth_provider
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset is not available for OAuth accounts",
        )

    # Update password
    user.hashed_password = get_password_hash(reset_data.new_password)

    # Mark token as used
    token.used = True

    db.commit()

    logger.info("password_reset_successful", user_id=user.id, email=user.email)

    return {
        "status": "success",
        "message": "Password has been reset successfully",
    }
