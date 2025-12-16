"""TelemetryEvent model for high-frequency keystroke data."""
import enum
from sqlalchemy import BigInteger, String, Integer, Boolean, Enum, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models._types import BIGINT_FK, BIGINT_PK


class EventType(str, enum.Enum):
    """Enumeration for keyboard event types."""

    DOWN = "DOWN"
    UP = "UP"


class FingerPosition(str, enum.Enum):
    """
    Enumeration for finger positions on the keyboard.

    Naming convention: {HAND}_{FINGER}
    """

    L_PINKY = "L_PINKY"
    L_RING = "L_RING"
    L_MIDDLE = "L_MIDDLE"
    L_INDEX = "L_INDEX"
    L_THUMB = "L_THUMB"
    R_THUMB = "R_THUMB"
    R_INDEX = "R_INDEX"
    R_MIDDLE = "R_MIDDLE"
    R_RING = "R_RING"
    R_PINKY = "R_PINKY"


class TelemetryEvent(Base):
    """
    TelemetryEvent model for storing high-frequency keystroke data.

    CRITICAL PERFORMANCE NOTES:
    - This table receives thousands of writes per typing session
    - All inserts MUST use bulk operations (never one-by-one)
    - In production with PostgreSQL, consider using TimescaleDB hypertable
    - Indexes are carefully chosen to support analytics queries

    The timestamp_offset field stores milliseconds since session start,
    allowing for efficient time-series analysis without expensive joins.
    """

    __tablename__ = "telemetry_events"

    id: Mapped[int] = mapped_column(BIGINT_PK, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        BIGINT_FK,
        ForeignKey("typing_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    event_type: Mapped[EventType] = mapped_column(
        Enum(EventType),
        nullable=False,
        comment="Event type: DOWN (keydown) or UP (keyup)"
    )
    key_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="JavaScript KeyboardEvent.code (e.g., 'KeyA', 'Space', 'Enter')"
    )
    timestamp_offset: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        comment="Milliseconds elapsed since session start_time"
    )
    finger_used: Mapped[FingerPosition] = mapped_column(
        Enum(FingerPosition),
        nullable=False,
        comment="Which finger should be used for this key (mapped on ingestion)"
    )
    is_error: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="True if this keystroke was incorrect"
    )

    # Relationships
    session: Mapped["TypingSession"] = relationship(
        "TypingSession",
        back_populates="telemetry_events"
    )

    # Indexes optimized for analytics queries
    # - session_id for filtering by session
    # - session_id + timestamp_offset for time-series queries (dwell, flight, transition time)
    # - key_code for per-key analytics
    # - finger_used for per-finger analytics
    __table_args__ = (
        Index("idx_telemetry_session_id", "session_id"),
        Index("idx_telemetry_session_timestamp", "session_id", "timestamp_offset"),
        Index("idx_telemetry_key_code", "key_code"),
        Index("idx_telemetry_finger_used", "finger_used"),
    )

    def __repr__(self) -> str:
        return (
            f"<TelemetryEvent(id={self.id}, session={self.session_id}, "
            f"type={self.event_type.value}, key={self.key_code})>"
        )
