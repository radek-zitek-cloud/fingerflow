"""Token models for password reset, email verification, and refresh tokens."""
import time
import secrets
from sqlalchemy import String, BigInteger, ForeignKey, Index, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from app.database import Base
from app.models._types import BIGINT_FK, BIGINT_PK


class PasswordResetToken(Base):
    """
    Password reset tokens.

    Tokens are single-use and expire after 1 hour.
    """

    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(BIGINT_PK, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BIGINT_FK,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    token: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
        comment="Secure random token"
    )
    created_at: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=lambda: int(time.time() * 1000),
        comment="Unix timestamp in milliseconds"
    )
    expires_at: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        comment="Expiration time in milliseconds"
    )
    used: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="Whether token has been used"
    )

    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="password_reset_tokens")

    __table_args__ = (
        Index("idx_reset_token", "token"),
        Index("idx_reset_expires", "expires_at"),
    )

    @staticmethod
    def generate_token() -> str:
        """Generate a secure random token."""
        return secrets.token_urlsafe(48)

    def is_expired(self) -> bool:
        """Check if token has expired."""
        return int(time.time() * 1000) > self.expires_at

    def is_valid(self) -> bool:
        """Check if token is valid (not used and not expired)."""
        return not self.used and not self.is_expired()


class EmailVerificationToken(Base):
    """
    Email verification tokens.

    Tokens are single-use and expire after 24 hours.
    """

    __tablename__ = "email_verification_tokens"

    id: Mapped[int] = mapped_column(BIGINT_PK, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BIGINT_FK,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    token: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
        comment="Secure random token"
    )
    created_at: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=lambda: int(time.time() * 1000)
    )
    expires_at: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        comment="Expiration time in milliseconds"
    )
    used: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )

    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="email_verification_tokens")

    __table_args__ = (
        Index("idx_verify_token", "token"),
        Index("idx_verify_expires", "expires_at"),
    )

    @staticmethod
    def generate_token() -> str:
        """Generate a secure random token."""
        return secrets.token_urlsafe(48)

    def is_expired(self) -> bool:
        """Check if token has expired."""
        return int(time.time() * 1000) > self.expires_at

    def is_valid(self) -> bool:
        """Check if token is valid."""
        return not self.used and not self.is_expired()


class RefreshToken(Base):
    """
    Refresh tokens for session management.

    Allows users to obtain new access tokens without re-authenticating.
    """

    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(BIGINT_PK, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BIGINT_FK,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    token: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True
    )
    created_at: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=lambda: int(time.time() * 1000)
    )
    expires_at: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False
    )
    revoked: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="Whether token has been revoked"
    )
    device_info: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="User agent or device information"
    )

    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="refresh_tokens")

    __table_args__ = (
        Index("idx_refresh_token", "token"),
        Index("idx_refresh_user", "user_id"),
        Index("idx_refresh_expires", "expires_at"),
    )

    @staticmethod
    def generate_token() -> str:
        """Generate a secure random refresh token."""
        return secrets.token_urlsafe(48)

    def is_expired(self) -> bool:
        """Check if token has expired."""
        return int(time.time() * 1000) > self.expires_at

    def is_valid(self) -> bool:
        """Check if token is valid."""
        return not self.revoked and not self.is_expired()
