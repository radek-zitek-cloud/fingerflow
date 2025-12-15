"""Telemetry-related Pydantic schemas."""
from pydantic import BaseModel, Field
from typing import List
from app.models.telemetry_event import EventType, FingerPosition


class TelemetryEventCreate(BaseModel):
    """
    Schema for a single telemetry event from the frontend.

    Frontend sends these in batches to minimize network overhead.
    """

    event_type: EventType = Field(..., description="Event type: DOWN or UP")
    key_code: str = Field(..., description="JavaScript KeyboardEvent.code (e.g., 'KeyA', 'Space')")
    timestamp_offset: int = Field(..., ge=0, description="Milliseconds since session start")
    finger_used: FingerPosition = Field(..., description="Which finger was used for this key")
    is_error: bool = Field(default=False, description="True if this keystroke was incorrect")


class TelemetryBatch(BaseModel):
    """
    Schema for a batch of telemetry events.

    The frontend buffers events and sends them in batches of ~50 events
    or every 5 seconds, whichever comes first.
    """

    events: List[TelemetryEventCreate] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Batch of telemetry events (typically 20-50)"
    )


class SessionCreate(BaseModel):
    """Schema for creating a new typing session."""

    start_time: int = Field(..., description="Unix timestamp in milliseconds")


class SessionResponse(BaseModel):
    """Schema for typing session in API responses."""

    id: int
    user_id: int
    start_time: int
    end_time: int | None
    wpm: float | None
    accuracy: float | None

    class Config:
        from_attributes = True
