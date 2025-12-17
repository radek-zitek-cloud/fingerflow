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


class SessionEnd(BaseModel):
    """Schema for ending a typing session with final metrics."""

    start_time: int = Field(..., description="Unix timestamp in milliseconds of first keystroke")
    end_time: int = Field(..., description="Unix timestamp in milliseconds of last keystroke")
    wpm: float = Field(..., ge=0, description="Productive WPM (only correct characters)")
    mechanical_wpm: float = Field(..., ge=0, description="Mechanical WPM (all keystrokes)")
    accuracy: float = Field(..., ge=0, le=100, description="Accuracy percentage (characters correct on first attempt / total characters typed)")
    total_characters: int = Field(..., ge=0, description="Total characters in the test text")
    correct_characters: int = Field(..., ge=0, description="Total characters typed (includes corrected characters)")
    incorrect_characters: int = Field(..., ge=0, description="Unique character positions with errors (repeated typos at same position count as one)")
    total_keystrokes: int = Field(..., ge=0, description="Total keystrokes including corrections")
    practice_text: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="The practice text that was typed in this session"
    )


class SessionResponse(BaseModel):
    """Schema for typing session in API responses."""

    id: int
    user_id: int
    start_time: int
    end_time: int | None
    wpm: float | None
    mechanical_wpm: float | None
    accuracy: float | None
    total_characters: int | None
    correct_characters: int | None
    incorrect_characters: int | None
    total_keystrokes: int | None
    practice_text: str | None

    class Config:
        from_attributes = True
