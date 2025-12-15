"""TypingSession model for tracking individual typing sessions."""
from sqlalchemy import BigInteger, Float, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
from app.database import Base
from app.models._types import BIGINT_FK, BIGINT_PK


class TypingSession(Base):
    """
    TypingSession model for tracking individual typing practice sessions.

    Each session belongs to a user and contains aggregated metrics (WPM, accuracy)
    as well as a collection of detailed telemetry events.
    """

    __tablename__ = "typing_sessions"

    id: Mapped[int] = mapped_column(BIGINT_PK, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BIGINT_FK,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    start_time: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        comment="Unix timestamp in milliseconds when session started"
    )
    end_time: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        nullable=True,
        comment="Unix timestamp in milliseconds when session ended (null if active)"
    )
    wpm: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="Words per minute (calculated at session end)"
    )
    accuracy: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="Accuracy percentage (calculated at session end)"
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="sessions")
    telemetry_events: Mapped[List["TelemetryEvent"]] = relationship(
        "TelemetryEvent",
        back_populates="session",
        cascade="all, delete-orphan"
    )

    # Indexes for performance
    __table_args__ = (
        Index("idx_session_user_id", "user_id"),
        Index("idx_session_start_time", "start_time"),
        Index("idx_session_user_start", "user_id", "start_time"),
    )

    def __repr__(self) -> str:
        return f"<TypingSession(id={self.id}, user_id={self.user_id}, wpm={self.wpm})>"
