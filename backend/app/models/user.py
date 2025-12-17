"""User model for authentication and user management."""
import time
import json
from sqlalchemy import String, BigInteger, Index, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List, Dict, Any
from app.database import Base
from app.models._types import BIGINT_PK


class User(Base):
    """
    User model for storing authentication and profile data.

    Supports both local authentication (email/password) and OAuth providers (Google).
    Includes 2FA and email verification support.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BIGINT_PK, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    auth_provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="local",
        comment="Authentication provider: 'local' or 'google'"
    )
    created_at: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=lambda: int(time.time() * 1000),
        comment="Unix timestamp in milliseconds"
    )

    # User preferences stored in JSON
    settings: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=lambda: {
            "theme": "default",
            "sessionMode": "wordcount",
            "timedDuration": 30,
            "wordCount": 20,
            "viewMode": "ticker",
            "selectedWordSetId": None
        },
        comment="User settings JSON: theme, session config, view preferences"
    )

    # Email verification
    email_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="Whether email has been verified"
    )
    email_verified_at: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        nullable=True,
        comment="When email was verified (Unix timestamp ms)"
    )

    # Two-Factor Authentication
    two_factor_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="Whether 2FA is enabled"
    )
    two_factor_secret: Mapped[Optional[str]] = mapped_column(
        String(32),
        nullable=True,
        comment="TOTP secret for 2FA"
    )
    two_factor_backup_codes: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="JSON array of backup codes"
    )

    # Account Security & Lockout
    failed_login_attempts: Mapped[int] = mapped_column(
        BigInteger,
        default=0,
        nullable=False,
        comment="Count of consecutive failed login attempts"
    )
    account_locked_until: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        nullable=True,
        comment="Unix timestamp (ms) until which account is locked"
    )
    last_failed_login: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        nullable=True,
        comment="Timestamp of last failed login attempt (ms)"
    )
    last_successful_login: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        nullable=True,
        comment="Timestamp of last successful login (ms)"
    )

    # Relationships
    sessions: Mapped[List["TypingSession"]] = relationship(
        "TypingSession",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    password_reset_tokens: Mapped[List["PasswordResetToken"]] = relationship(
        "PasswordResetToken",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    email_verification_tokens: Mapped[List["EmailVerificationToken"]] = relationship(
        "EmailVerificationToken",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    # Indexes for performance
    __table_args__ = (
        Index("idx_user_email", "email"),
        Index("idx_user_auth_provider", "auth_provider"),
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, provider={self.auth_provider})>"
