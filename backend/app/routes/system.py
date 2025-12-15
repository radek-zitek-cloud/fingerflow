"""System routes including the centralized logging proxy."""
from fastapi import APIRouter, Depends, status
from typing import Optional

from app.models.user import User
from app.schemas.logging import LogEntry
from app.utils.auth import get_optional_user
from app.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/logs", status_code=status.HTTP_200_OK)
async def log_proxy(
    log_entry: LogEntry,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Centralized logging proxy endpoint.

    Frontend sends structured log entries to this endpoint, which injects
    additional context (user_id, source) and outputs JSON logs to stdout
    for centralized log aggregation.

    This allows frontend and backend logs to be unified in a single stream,
    making it easier to trace issues across the entire application.

    The endpoint accepts logs from both authenticated and anonymous users.
    """
    # Prepare log context
    log_context = {
        "source": "frontend",
        "frontend_timestamp": log_entry.timestamp,
        "user_id": current_user.id if current_user else None,
        "user_email": current_user.email if current_user else None,
        **(log_entry.context or {}),
    }

    # Map log level string to logger method
    log_method = getattr(logger, log_entry.level.lower(), logger.info)

    # Write structured log
    log_method(
        log_entry.message,
        **log_context,
    )

    return {"status": "logged"}


@router.get("/health")
async def system_health():
    """
    System health check endpoint.

    Returns basic system status information.
    """
    return {
        "status": "healthy",
        "logging": "active",
        "database": "connected",
    }
