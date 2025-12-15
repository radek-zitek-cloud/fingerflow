"""Logging-related Pydantic schemas."""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any


class LogEntry(BaseModel):
    """
    Schema for frontend log entries sent to the logging proxy.

    The backend will inject additional context (user_id, source) before
    writing to the structured log stream.
    """

    level: str = Field(
        ...,
        description="Log level: debug, info, warning, error, critical",
        pattern="^(debug|info|warning|error|critical)$"
    )
    message: str = Field(..., description="Human-readable log message")
    context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional structured context (e.g., {component: 'TypingArea', action: 'keypress'})"
    )
    timestamp: int = Field(..., description="Frontend timestamp in milliseconds (Unix epoch)")
