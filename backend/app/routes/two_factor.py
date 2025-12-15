"""
Two-Factor Authentication Management Routes

Provides endpoints for:
- Setting up 2FA (generate secret and QR code)
- Verifying and enabling 2FA
- Disabling 2FA
- Regenerating backup codes
- Checking 2FA status
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.utils.auth import get_current_user, verify_password
from app.utils.two_factor import (
    generate_2fa_secret,
    generate_qr_code,
    verify_2fa_code,
    generate_backup_codes,
    hash_backup_codes,
    verify_backup_code,
)
from app.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)


class TwoFactorSetupResponse(BaseModel):
    """Response for 2FA setup containing secret and QR code."""
    secret: str
    qr_code: str  # Base64 encoded PNG
    backup_codes: list[str]


class TwoFactorVerifySetup(BaseModel):
    """Request to verify 2FA code during setup."""
    code: str


class TwoFactorDisable(BaseModel):
    """Request to disable 2FA."""
    code: str
    password: str  # Require password for security


class TwoFactorStatus(BaseModel):
    """2FA status information."""
    enabled: bool
    backup_codes_remaining: int


@router.post("/setup", response_model=TwoFactorSetupResponse)
async def setup_2fa(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate 2FA secret and QR code for setup.

    Returns secret, QR code image, and backup codes.
    User must verify with a code to actually enable 2FA.
    """
    # Check if 2FA is already enabled
    if current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled. Disable it first to set up again.",
        )

    # Generate new secret
    secret = generate_2fa_secret()

    # Generate QR code
    qr_code = generate_qr_code(current_user.email, secret)

    # Generate backup codes
    backup_codes = generate_backup_codes()

    # Store secret and hashed backup codes temporarily (not enabled yet)
    current_user.two_factor_secret = secret
    current_user.two_factor_backup_codes = hash_backup_codes(backup_codes)

    await db.commit()

    logger.info("2fa_setup_initiated", user_id=current_user.id)

    return TwoFactorSetupResponse(
        secret=secret,
        qr_code=qr_code,
        backup_codes=backup_codes,
    )


@router.post("/verify-setup")
async def verify_2fa_setup(
    verify_data: TwoFactorVerifySetup,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Verify 2FA code and enable 2FA.

    User must provide valid code from authenticator app to enable.
    """
    # Check if secret exists
    if not current_user.two_factor_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA setup not initiated. Call /setup first.",
        )

    # Check if already enabled
    if current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled",
        )

    # Verify code
    if not verify_2fa_code(current_user.two_factor_secret, verify_data.code):
        logger.warning("2fa_setup_verification_failed", user_id=current_user.id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid verification code",
        )

    # Enable 2FA
    current_user.two_factor_enabled = True
    await db.commit()

    logger.info("2fa_enabled", user_id=current_user.id)

    return {
        "status": "success",
        "message": "Two-factor authentication has been enabled",
    }


@router.post("/disable")
async def disable_2fa(
    disable_data: TwoFactorDisable,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Disable 2FA for the current user.

    Requires valid 2FA code and password for security.
    """
    # Check if 2FA is enabled
    if not current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled",
        )

    # Check if user uses local authentication
    if current_user.auth_provider != "local":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password verification not available for OAuth accounts",
        )

    # Verify password
    if not verify_password(disable_data.password, current_user.hashed_password):
        logger.warning("2fa_disable_invalid_password", user_id=current_user.id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
        )

    # Verify 2FA code (or backup code)
    code_valid = False

    if len(disable_data.code) == 6 and disable_data.code.isdigit():
        # TOTP code
        code_valid = verify_2fa_code(current_user.two_factor_secret, disable_data.code)
    else:
        # Backup code
        if current_user.two_factor_backup_codes:
            code_valid, _ = verify_backup_code(
                current_user.two_factor_backup_codes,
                disable_data.code
            )

    if not code_valid:
        logger.warning("2fa_disable_invalid_code", user_id=current_user.id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid 2FA code",
        )

    # Disable 2FA and clear secrets
    current_user.two_factor_enabled = False
    current_user.two_factor_secret = None
    current_user.two_factor_backup_codes = None

    await db.commit()

    logger.info("2fa_disabled", user_id=current_user.id)

    return {
        "status": "success",
        "message": "Two-factor authentication has been disabled",
    }


@router.post("/regenerate-backup-codes")
async def regenerate_backup_codes(
    verify_data: TwoFactorVerifySetup,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Regenerate backup codes for 2FA.

    Requires valid 2FA code for security.
    Old backup codes will be invalidated.
    """
    # Check if 2FA is enabled
    if not current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled",
        )

    # Verify code
    if not verify_2fa_code(current_user.two_factor_secret, verify_data.code):
        logger.warning("2fa_backup_codes_verification_failed", user_id=current_user.id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid verification code",
        )

    # Generate new backup codes
    new_backup_codes = generate_backup_codes()
    current_user.two_factor_backup_codes = hash_backup_codes(new_backup_codes)

    await db.commit()

    logger.info("2fa_backup_codes_regenerated", user_id=current_user.id)

    return {
        "status": "success",
        "message": "Backup codes have been regenerated",
        "backup_codes": new_backup_codes,
    }


@router.get("/status", response_model=TwoFactorStatus)
async def get_2fa_status(
    current_user: User = Depends(get_current_user)
):
    """
    Get 2FA status for current user.

    Returns whether 2FA is enabled and number of remaining backup codes.
    """
    backup_codes_remaining = 0

    if current_user.two_factor_enabled and current_user.two_factor_backup_codes:
        # Count how many backup codes are still available (not marked as used with ':')
        import json
        try:
            codes_data = json.loads(current_user.two_factor_backup_codes)
            backup_codes_remaining = sum(1 for code in codes_data if not code.startswith("used:"))
        except (json.JSONDecodeError, TypeError):
            # If parsing fails, assume no backup codes
            backup_codes_remaining = 0

    return TwoFactorStatus(
        enabled=current_user.two_factor_enabled,
        backup_codes_remaining=backup_codes_remaining,
    )
